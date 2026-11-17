import { createClient } from "npm:@supabase/supabase-js@2.109.0";

const URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PRIMARY_ADMIN_ID = "1060de3d-d28a-45f8-9a64-5e0368cffc4b";
const MODULES = ["products", "orders", "analytics", "expenses", "crm", "settings"] as const;
type Permissions = Record<(typeof MODULES)[number], boolean>;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const emptyPermissions = (): Permissions => ({
  products: false, orders: false, analytics: false, expenses: false, crm: false, settings: false,
});
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const emailOf = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const nameOf = (value: unknown) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 120) : "";
const roleOf = (value: unknown) => typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : "თანამშრომელი";
const permissionsOf = (value: unknown): Permissions => {
  const result = emptyPermissions();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const module of MODULES) result[module] = (value as Record<string, unknown>)[module] === true;
  }
  return result;
};
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

function createAdminClient() {
  if (!URL || !SERVICE_ROLE) throw new Error("Supabase server credentials are not configured.");
  return createClient(URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function findUserByEmail(admin: any, email: string) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((candidate: any) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function staffRow(admin: any, userId: string) {
  const { data, error } = await admin.from("admin_staff").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertStaff(admin: any, row: Record<string, unknown>) {
  const { data, error } = await admin.from("admin_staff")
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("*").single();
  if (error) throw error;
  return data;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return reply(405, { error: "Only POST is allowed." });
  if (!URL || !ANON || !SERVICE_ROLE) return reply(500, { error: "Supabase Edge Function secrets are missing." });

  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return reply(401, { error: "Authentication is required." });

  const callerClient = createClient(URL, ANON, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser(token);
  const caller = callerData?.user;
  if (callerError || !caller) return reply(401, { error: "The user session could not be verified." });
  if (caller.id !== PRIMARY_ADMIN_ID || caller.app_metadata?.role !== "admin") {
    return reply(403, { error: "Only the primary administrator can manage staff." });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return reply(400, { error: "Invalid request body." }); }

  const admin = createAdminClient();
  const action = typeof body.action === "string" ? body.action : "";
  try {
    if (action === "list") {
      const { data, error } = await admin.from("admin_staff")
        .select("user_id,email,full_name,role_label,permissions,is_active,invited_at,activated_at,last_login_at,created_at,updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return reply(200, { staff: data ?? [] });
    }

    if (action === "invite" || action === "promote") {
      const email = emailOf(body.email);
      const fullName = nameOf(body.full_name ?? body.name);
      if (!validEmail(email) || (action === "invite" && fullName.length < 2)) {
        return reply(400, { error: "Enter a valid employee email and name." });
      }

      let user: any = null;
      let previousRole: string | null = null;
      let previous = null;

      if (action === "invite") {
        const existing = await findUserByEmail(admin, email);
        if (existing) return reply(409, { error: "This account already exists. Use the existing-user promotion action." });
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { name: fullName, full_name: fullName, geostore_staff_invite: true },
        });
        if (error || !data?.user) throw error ?? new Error("Invitation could not be created.");
        user = data.user;
        previousRole = typeof user.app_metadata?.role === "string" ? user.app_metadata.role : null;
      } else {
        user = await findUserByEmail(admin, email);
        if (!user) return reply(404, { error: "No Supabase account was found for this email. Send a new invitation instead." });
        if (user.id === PRIMARY_ADMIN_ID || user.app_metadata?.role === "admin") {
          return reply(403, { error: "The primary administrator account cannot be promoted or changed." });
        }
        previous = await staffRow(admin, user.id);
        previousRole = previous?.previous_app_role ??
          (typeof user.app_metadata?.role === "string" && user.app_metadata.role !== "staff" ? user.app_metadata.role : null);
      }

      const { error: roleError } = await admin.auth.admin.updateUserById(user.id, {
        app_metadata: { ...(user.app_metadata ?? {}), role: "staff" },
      });
      if (roleError) {
        if (action === "invite") await admin.auth.admin.deleteUser(user.id);
        throw roleError;
      }

      try {
        const staff = await upsertStaff(admin, {
          user_id: user.id,
          email,
          full_name: fullName || user.user_metadata?.full_name || user.user_metadata?.name || email,
          role_label: roleOf(body.role_label ?? body.role),
          permissions: permissionsOf(body.permissions),
          is_active: true,
          previous_app_role: previousRole,
          invited_at: action === "invite" ? new Date().toISOString() : (previous?.invited_at ?? null),
          activated_at: action === "promote" && user.email_confirmed_at
            ? (previous?.activated_at ?? new Date().toISOString())
            : (previous?.activated_at ?? null),
        });
        return reply(200, { staff, invited: action === "invite", promoted: action === "promote", requires_sign_in_again: action === "promote" });
      } catch (error) {
        if (action === "invite") await admin.auth.admin.deleteUser(user.id);
        else if (!previous) {
          const restored = { ...(user.app_metadata ?? {}) };
          if (previousRole) restored.role = previousRole;
          else delete restored.role;
          await admin.auth.admin.updateUserById(user.id, { app_metadata: restored });
        }
        throw error;
      }
    }

    if (action === "update") {
      const userId = typeof body.user_id === "string" ? body.user_id : "";
      if (!userId) return reply(400, { error: "Employee account id is required." });
      const existing = await staffRow(admin, userId);
      if (!existing) return reply(404, { error: "Employee was not found." });
      if (userId === PRIMARY_ADMIN_ID) return reply(403, { error: "The primary administrator cannot be changed." });
      const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
      if (authError || !authData?.user) throw authError ?? new Error("Auth account was not found.");
      if (authData.user.app_metadata?.role === "admin") return reply(403, { error: "Admin accounts cannot be changed here." });
      const { error: roleError } = await admin.auth.admin.updateUserById(userId, {
        app_metadata: { ...(authData.user.app_metadata ?? {}), role: "staff" },
      });
      if (roleError) throw roleError;
      const { data, error } = await admin.from("admin_staff").update({
        full_name: nameOf(body.full_name ?? existing.full_name),
        role_label: roleOf(body.role_label ?? body.role ?? existing.role_label),
        permissions: permissionsOf(body.permissions ?? existing.permissions),
        is_active: body.is_active === false ? false : true,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId).select("*").single();
      if (error) throw error;
      return reply(200, { staff: data });
    }

    if (action === "remove") {
      const userId = typeof body.user_id === "string" ? body.user_id : "";
      if (!userId) return reply(400, { error: "Employee account id is required." });
      const existing = await staffRow(admin, userId);
      if (!existing) return reply(404, { error: "Employee was not found." });
      if (userId === PRIMARY_ADMIN_ID) return reply(403, { error: "The primary administrator cannot be removed." });
      const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
      if (authError || !authData?.user) throw authError ?? new Error("Auth account was not found.");

      const { error: disableError } = await admin.from("admin_staff").update({
        is_active: false,
        permissions: emptyPermissions(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
      if (disableError) throw disableError;

      const restored = { ...(authData.user.app_metadata ?? {}) };
      if (existing.previous_app_role) restored.role = existing.previous_app_role;
      else delete restored.role;
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, { app_metadata: restored });
      if (authUpdateError) {
        return reply(200, { removed: true, warning: "Staff access is disabled in the database, but Auth metadata restoration failed." });
      }
      return reply(200, { removed: true });
    }

    return reply(400, { error: "Unknown staff management action." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Staff management request failed.";
    return reply(500, { error: message });
  }
});
