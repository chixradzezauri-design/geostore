import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { canRemoveSupportAttachmentAfterFailedSave } from "../../../src/utils/supportAttachments.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const BUCKET = "support-attachments";
const ADMIN_ID = "1060de3d-d28a-45f8-9a64-5e0368cffc4b";
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.toLowerCase()));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "Server configuration unavailable" }, 500);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: authorization ? { Authorization: authorization } : {} },
  });

  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_FILE_SIZE + 64 * 1024) return json({ error: "Request is too large" }, 413);
    const boundedRequest = await readRequestWithLimit(request, MAX_FILE_SIZE + 64 * 1024);
    const contentType = boundedRequest.headers.get("content-type") || "";
    let action = "";
    let ticketId = "";
    let accessToken = "";
    let attachmentPath = "";
    let attachmentPaths: string[] = [];
    let message = "";
    let requestId = "";
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await boundedRequest.formData();
      action = String(form.get("action") || "upload");
      ticketId = String(form.get("ticket_id") || "").trim();
      accessToken = String(form.get("access_token") || "").trim();
      message = String(form.get("message") || "").trim();
      requestId = String(form.get("request_id") || "").trim();
      const candidate = form.get("file");
      if (candidate instanceof File) file = candidate;
    } else {
      const body = await boundedRequest.json();
      action = String(body.action || "");
      ticketId = String(body.ticket_id || "").trim();
      accessToken = String(body.access_token || "").trim();
      attachmentPath = String(body.attachment_path || "").trim();
      attachmentPaths = Array.isArray(body.attachment_paths)
        ? body.attachment_paths.map((value: unknown) => String(value || "").trim()).filter(Boolean)
        : attachmentPath ? [attachmentPath] : [];
    }

    if (!/^t-[a-z0-9][a-z0-9-]{0,61}$/i.test(ticketId)) return json({ error: "Invalid ticket number" }, 400);

    const { data: ticket, error: ticketError } = await admin
      .from("support_tickets")
      .select("id, customer_user_id, email, access_token_hash")
      .eq("id", ticketId)
      .maybeSingle();
    if (ticketError || !ticket) return json({ error: "Ticket not found" }, 404);

    let user: any = null;
    if (bearer) {
      const { data } = await admin.auth.getUser(bearer);
      user = data?.user || null;
    }
    const isAdmin = !!user
      && user.id === ADMIN_ID
      && user.app_metadata?.role === "admin";
    const isAccountCustomer = !!user && (
      (!!ticket.customer_user_id && user.id === ticket.customer_user_id)
      || (!!ticket.email && String(user.email || "").toLowerCase() === String(ticket.email).toLowerCase())
    );
    const isTokenCustomer = /^[a-f0-9]{64}$/i.test(accessToken)
      && !!ticket.access_token_hash
      && await sha256(accessToken) === ticket.access_token_hash;
    if (!isAdmin && !isAccountCustomer && !isTokenCustomer) return json({ error: "Access denied" }, 403);

    if (action === "sign") {
      const uniquePaths = [...new Set(attachmentPaths)];
      const validPath = /^t-[a-z0-9][a-z0-9-]{0,61}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;
      if (uniquePaths.length < 1 || uniquePaths.length > 100
        || uniquePaths.some((path) => !path.startsWith(`${ticketId}/`) || !validPath.test(path))) {
        return json({ error: "Invalid attachment paths" }, 400);
      }
      const { data: messageRows, error: messageError } = await admin
        .from("support_ticket_messages")
        .select("attachment_path")
        .eq("ticket_ref", ticketId)
        .in("attachment_path", uniquePaths);
      if (messageError || !messageRows || messageRows.length !== uniquePaths.length) {
        return json({ error: "Attachment not found" }, 404);
      }
      const signedEntries = await Promise.all(uniquePaths.map(async (path) => {
        const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 600);
        if (error || !data?.signedUrl) throw new Error("Could not create secure image link");
        return [path, data.signedUrl] as const;
      }));
      return json({ signed_urls: Object.fromEntries(signedEntries), expires_in: 600 });
    }

    if (action !== "upload") return json({ error: "Unsupported action" }, 400);
    if (!file || !MIME_EXTENSIONS[file.type]) return json({ error: "Only JPEG, PNG and WebP images are allowed" }, 415);
    if (file.size < 1 || file.size > MAX_FILE_SIZE) return json({ error: "Image must be 5 MB or smaller" }, 413);
    const imageBytes = new Uint8Array(await file.arrayBuffer());
    const isJpeg = file.type === "image/jpeg"
      && imageBytes.length >= 3 && imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff;
    const isPng = file.type === "image/png"
      && imageBytes.length >= 8 && imageBytes[0] === 0x89 && imageBytes[1] === 0x50
      && imageBytes[2] === 0x4e && imageBytes[3] === 0x47 && imageBytes[4] === 0x0d
      && imageBytes[5] === 0x0a && imageBytes[6] === 0x1a && imageBytes[7] === 0x0a;
    const isWebp = file.type === "image/webp" && imageBytes.length >= 12
      && String.fromCharCode(...imageBytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...imageBytes.slice(8, 12)) === "WEBP";
    if (!isJpeg && !isPng && !isWebp) return json({ error: "The uploaded file is not a valid supported image" }, 415);
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: "Invalid request identifier" }, 400);
    if (message.length > 4000) return json({ error: "Message is too long" }, 400);

    const path = `${ticketId}/${crypto.randomUUID()}.${MIME_EXTENSIONS[file.type]}`;
    const validatedImage = new Blob([imageBytes], { type: file.type });
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, validatedImage, {
      contentType: file.type,
      cacheControl: "60",
      upsert: false,
    });
    if (uploadError) return json({ error: "Image upload failed" }, 500);

    const { data: saved, error: saveError } = await userClient.rpc("add_support_ticket_attachment_message", {
      p_ticket_id: ticketId,
      p_message: message,
      p_access_token: accessToken || null,
      p_request_id: requestId,
      p_attachment_path: path,
      p_attachment_mime_type: file.type,
      p_attachment_size: file.size,
    });
    if (saveError) {
      // The RPC may have committed even when the client received a transport
      // error. Verify the durable row before removing its Storage object.
      const { data: persistedMessage, error: verificationError } = await admin
        .from("support_ticket_messages")
        .select("id, ticket_ref, request_id, sender_role, created_at, attachment_path")
        .eq("attachment_path", path)
        .maybeSingle();

      if (verificationError) {
        // Fail closed: retain the file when the reference check is uncertain.
        console.error("support attachment persistence check failed", verificationError);
        return json({ error: "შეტყობინების შენახვა მოწმდება. გთხოვთ, მოგვიანებით განაახლოთ მიმოწერა." }, 503);
      }

      if (persistedMessage) {
        if (persistedMessage.ticket_ref !== ticketId || persistedMessage.request_id !== requestId) {
          return json({ error: "ფოტოს შენახვის შედეგი საჭიროებს შემოწმებას." }, 409);
        }
        return json({
          success: true,
          result: {
            message_id: persistedMessage.id,
            ticket_id: ticketId,
            sender_role: persistedMessage.sender_role,
            created_at: persistedMessage.created_at,
            idempotent_replay: false,
            verified_after_retryable_error: true,
          },
        });
      }

      if (canRemoveSupportAttachmentAfterFailedSave({ verificationError, persistedMessage })) {
        const { error: cleanupError } = await admin.storage.from(BUCKET).remove([path]);
        if (cleanupError) console.warn("Unreferenced support attachment cleanup failed", cleanupError);
      }
      return json({ error: "Could not save attachment message" }, 400);
    }
    if (saved?.idempotent_replay) {
      await admin.storage.from(BUCKET).remove([path]);
    }
    return json({ success: true, result: saved });
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_TOO_LARGE") {
      return json({ error: "Request is too large" }, 413);
    }
    console.error("support-attachments error", error);
    return json({ error: "Unexpected support attachment error" }, 500);
  }
});
