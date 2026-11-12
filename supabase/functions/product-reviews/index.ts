import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import {
  canRemoveReviewImageAfterFailedInsert,
  decodeReviewImageDataUrl,
  extractReviewClientIp,
  isReviewImagePath,
  validateReviewSubmission,
} from "./validation.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_REQUEST_BYTES = 1536 * 1024;
const MAX_IMAGE_BYTES = 1024 * 1024;
const IMAGE_BUCKET = "product-review-images";
const ADMIN_ID = "1060de3d-d28a-45f8-9a64-5e0368cffc4b";
const SIGNED_URL_TTL_SECONDS = 600;

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });

const readRequestWithLimit = async (request: Request, maxBytes: number) => {
  if (!request.body) return request;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error("REQUEST_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
  });
};

const hmacSha256 = async (secret: string, value: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  let serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  let anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  try {
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    serviceKey = serviceKey || secretKeys.default || "";
  } catch {
    // Retain the legacy service-role environment variable fallback.
  }
  try {
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    anonKey = anonKey || publishableKeys.default || "";
  } catch {
    // Retain the legacy anon environment variable fallback.
  }
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: "Server configuration unavailable" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_REQUEST_BYTES) return json({ error: "Request is too large" }, 413);
    const boundedRequest = await readRequestWithLimit(request, MAX_REQUEST_BYTES);
    const contentType = boundedRequest.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return json({ error: "Content-Type must be application/json" }, 415);
    }

    let body: Record<string, unknown>;
    try {
      body = await boundedRequest.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "Invalid request body" }, 400);
    }

    const authorization = request.headers.get("Authorization") || "";
    const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (authorization && !bearerMatch) return json({ error: "Invalid authorization header" }, 401);
    const bearer = bearerMatch?.[1] || "";
    let user: any = null;
    if (bearer && bearer !== anonKey) {
      const { data, error } = await admin.auth.getUser(bearer);
      if (error || !data?.user) return json({ error: "Invalid or expired session" }, 401);
      user = data.user;
    }
    const isAdmin = !!user
      && user.id === ADMIN_ID
      && user.app_metadata?.role === "admin";

    const action = typeof body.action === "string" ? body.action : "submit";

    if (action === "sign-images") {
      if (!Array.isArray(body.paths) || body.paths.length < 1 || body.paths.length > 40) {
        return json({ error: "Invalid image path list" }, 400);
      }
      const paths = [...new Set(body.paths.map((value) => String(value || "").trim()))];
      if (paths.length !== body.paths.length || paths.some((path) => !isReviewImagePath(path))) {
        return json({ error: "Invalid image path" }, 400);
      }

      const { data: rows, error: lookupError } = await admin
        .from("product_reviews")
        .select("image_path, status")
        .in("image_path", paths);
      if (lookupError) {
        console.error("product review image lookup failed", lookupError);
        return json({ error: "Could not verify review images" }, 503);
      }
      if (!Array.isArray(rows) || rows.length !== paths.length) {
        return json({ error: "Review image not found" }, 404);
      }
      if (!isAdmin && rows.some((row: any) => row.status !== "approved")) {
        return json({ error: "Access denied" }, 403);
      }

      const signedEntries = await Promise.all(paths.map(async (path) => {
        const { data, error } = await admin.storage
          .from(IMAGE_BUCKET)
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
        if (error || !data?.signedUrl) throw new Error("Could not create secure review image link");
        return [path, data.signedUrl] as const;
      }));
      return json({
        signed_urls: Object.fromEntries(signedEntries),
        expires_in: SIGNED_URL_TTL_SECONDS,
      });
    }

    if (action !== "submit") return json({ error: "Unsupported action" }, 400);

    let payload;
    try {
      payload = validateReviewSubmission(body);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Invalid review" }, 400);
    }

    const { data: existingReview, error: existingError } = await admin
      .from("product_reviews")
      .select("id, product_id, status")
      .eq("submission_key", payload.requestId)
      .maybeSingle();
    if (existingError) {
      console.error("product review idempotency lookup failed", existingError);
      return json({ error: "Review service is not ready" }, 503);
    }
    if (existingReview) {
      if (existingReview.product_id !== payload.productId) {
        return json({ error: "Request identifier has already been used" }, 409);
      }
      return json({
        success: true,
        review_id: existingReview.id,
        status: existingReview.status,
        pending_moderation: existingReview.status === "pending",
        idempotent_replay: true,
      }, 202);
    }

    const { data: product, error: productError } = await admin
      .from("products")
      .select("id, is_published")
      .eq("id", payload.productId)
      .eq("is_published", true)
      .maybeSingle();
    if (productError) {
      console.error("product review product lookup failed", productError);
      return json({ error: "Could not verify product" }, 503);
    }
    if (!product) return json({ error: "Product is not available for reviews" }, 404);

    const clientIp = extractReviewClientIp(request.headers);
    if (!clientIp && !user) {
      return json({ error: "Review service is temporarily unavailable" }, 503);
    }

    const consumeLimit = async (key: string, maximum: number) => {
      const keyHash = await hmacSha256(serviceKey, "product-review:" + key);
      const { data, error } = await admin.rpc("consume_product_review_rate_limit", {
        p_key_hash: keyHash,
        p_max_attempts: maximum,
        p_window_seconds: 3600,
      });
      if (error || typeof data !== "boolean") {
        console.error("product review rate limit unavailable", error);
        throw new Error("RATE_LIMIT_UNAVAILABLE");
      }
      return data;
    };

    if (clientIp && !(await consumeLimit("ip:" + clientIp, 5))) {
      return json({ error: "Too many review submissions. Try again later." }, 429, { "Retry-After": "3600" });
    }
    if (user && !(await consumeLimit("user:" + user.id, 3))) {
      return json({ error: "Too many review submissions for this account. Try again later." }, 429, { "Retry-After": "3600" });
    }

    let imagePath: string | null = null;
    if (payload.imageDataUrl) {
      let image;
      try {
        image = decodeReviewImageDataUrl(payload.imageDataUrl, MAX_IMAGE_BYTES);
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Invalid review image" }, 400);
      }
      const reviewId = crypto.randomUUID();
      imagePath = reviewId + "/" + crypto.randomUUID() + "." + image.extension;
      const { error: uploadError } = await admin.storage
        .from(IMAGE_BUCKET)
        .upload(imagePath, new Blob([image.bytes], { type: image.contentType }), {
          contentType: image.contentType,
          cacheControl: "60",
          upsert: false,
        });
      if (uploadError) {
        console.error("product review image upload failed", uploadError);
        return json({ error: "Review image upload failed" }, 503);
      }

      const { data: saved, error: saveError } = await admin
        .from("product_reviews")
        .insert({
          id: reviewId,
          submission_key: payload.requestId,
          product_id: payload.productId,
          author_name: payload.authorName,
          rating: payload.rating,
          review_text: payload.reviewText,
          author_user_id: user?.id || null,
          image_path: imagePath,
          is_legacy: false,
        })
        .select("id, status")
        .single();

      if (saveError) {
        const { data: persisted, error: verifyError } = await admin
          .from("product_reviews")
          .select("id, product_id, status, image_path")
          .eq("submission_key", payload.requestId)
          .maybeSingle();

        if (verifyError) {
          console.error("product review persistence verification failed", verifyError);
          return json({ error: "Review save is being verified. Please refresh later." }, 503);
        }
        if (persisted) {
          if (canRemoveReviewImageAfterFailedInsert({
            persistedReview: persisted,
            uploadedImagePath: imagePath,
          })) {
            const { error: cleanupError } = await admin.storage.from(IMAGE_BUCKET).remove([imagePath]);
            if (cleanupError) {
              console.error("unreferenced product review image cleanup failed", cleanupError);
            }
          }
          if (persisted.product_id !== payload.productId) {
            return json({ error: "Request identifier has already been used" }, 409);
          }
          return json({
            success: true,
            review_id: persisted.id,
            status: persisted.status,
            pending_moderation: persisted.status === "pending",
            idempotent_replay: true,
          }, 202);
        }
        if (canRemoveReviewImageAfterFailedInsert({
          verificationError: null,
          persistedReview: null,
          uploadedImagePath: imagePath,
        })) {
          const { error: cleanupError } = await admin.storage.from(IMAGE_BUCKET).remove([imagePath]);
          if (cleanupError) {
            console.error("unreferenced product review image cleanup failed", cleanupError);
          }
        }
        console.error("product review insert failed", saveError);
        return json({ error: "Could not save review" }, 500);
      }

      return json({
        success: true,
        review_id: saved.id,
        status: saved.status,
        pending_moderation: true,
        idempotent_replay: false,
      }, 202);
    }

    const { data: saved, error: saveError } = await admin
      .from("product_reviews")
      .insert({
        submission_key: payload.requestId,
        product_id: payload.productId,
        author_name: payload.authorName,
        rating: payload.rating,
        review_text: payload.reviewText,
        author_user_id: user?.id || null,
        image_path: null,
        is_legacy: false,
      })
      .select("id, status")
      .single();

    if (saveError) {
      const { data: persisted, error: verifyError } = await admin
        .from("product_reviews")
        .select("id, product_id, status")
        .eq("submission_key", payload.requestId)
        .maybeSingle();
      if (verifyError) {
        console.error("product review persistence verification failed", verifyError);
        return json({ error: "Review save is being verified. Please refresh later." }, 503);
      }
      if (persisted) {
        if (persisted.product_id !== payload.productId) {
          return json({ error: "Request identifier has already been used" }, 409);
        }
        return json({
          success: true,
          review_id: persisted.id,
          status: persisted.status,
          pending_moderation: persisted.status === "pending",
          idempotent_replay: true,
        }, 202);
      }
      console.error("product review insert failed", saveError);
      return json({ error: "Could not save review" }, 500);
    }

    return json({
      success: true,
      review_id: saved.id,
      status: saved.status,
      pending_moderation: true,
      idempotent_replay: false,
    }, 202);
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_TOO_LARGE") {
      return json({ error: "Request is too large" }, 413);
    }
    if (error instanceof Error && error.message === "RATE_LIMIT_UNAVAILABLE") {
      return json({ error: "Review service is temporarily unavailable" }, 503);
    }
    console.error("product-reviews error", error);
    return json({ error: "Unexpected product review error" }, 500);
  }
});
