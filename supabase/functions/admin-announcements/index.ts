import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { listAnnouncementRecipients } from "./recipients.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_REQUEST_BYTES = 8 * 1024;
const PRIMARY_ADMIN_ID = "1060de3d-d28a-45f8-9a64-5e0368cffc4b";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store, private",
    },
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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  let serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  try {
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    serviceKey = serviceKey || secretKeys.default || "";
  } catch {
    // Keep the legacy SUPABASE_SERVICE_ROLE_KEY fallback.
  }
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Server configuration unavailable" }, 500);
  }

  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_REQUEST_BYTES) {
      return json({ error: "Request is too large" }, 413);
    }

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
    if (body.action !== "list-recipients") {
      return json({ error: "Unsupported action" }, 400);
    }

    const authorization = request.headers.get("Authorization") || "";
    const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (!bearerMatch?.[1]) return json({ error: "Authentication required" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.auth.getUser(bearerMatch[1]);
    if (error || !data?.user) {
      return json({ error: "Invalid or expired session" }, 401);
    }

    const user = data.user;
    const isPrimaryAdmin = user.id === PRIMARY_ADMIN_ID
      && user.app_metadata?.role === "admin";
    if (!isPrimaryAdmin) return json({ error: "Access denied" }, 403);

    const recipients = await listAnnouncementRecipients(
      ({ page, perPage }) => admin.auth.admin.listUsers({ page, perPage }),
      { perPage: 1000, maxPages: 100 },
    );

    return json({
      success: true,
      recipients,
      recipient_count: recipients.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_TOO_LARGE") {
      return json({ error: "Request is too large" }, 413);
    }
    console.error(
      "admin-announcements recipient directory failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return json({ error: "Could not load the customer directory. Please try again." }, 503);
  }
});
