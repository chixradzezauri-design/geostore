import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin'
};

const OWNER_ID = '1060de3d-d28a-45f8-9a64-5e0368cffc4b';
const PERMISSIONS = ['products', 'orders', 'analytics', 'expenses', 'crm', 'support', 'settings'] as const;
const ROLES = ['manager', 'operator', 'finance', 'product_manager'] as const;
type Permission = typeof PERMISSIONS[number];
type StaffRole = typeof ROLES[number];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });

function getSecretKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;

  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      if (typeof parsed.default === 'string' && parsed.default) return parsed.default;
    } catch {
      // Fail closed below if the configured secret map is malformed.
    }
  }

  throw new Error('Supabase server secret is not configured.');
}

function getPublishableKey(): string {
  const legacy = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacy) return legacy;

  const keys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (keys) {
    const parsed = JSON.parse(keys);
    if (typeof parsed.default === 'string' && parsed.default) return parsed.default;
  }

  throw new Error('Supabase publishable key is not configured.');
}

function normalizePermissions(value: unknown): Record<Permission, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('თანამშრომლის მოდულების უფლებები არასწორია.');
  }

  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !PERMISSIONS.includes(key as Permission))) {
    throw new Error('მითითებულია უცნობი მოდულის უფლება.');
  }

  return Object.fromEntries(
    PERMISSIONS.map((key) => {
      if (input[key] !== undefined && typeof input[key] !== 'boolean') {
        throw new Error('მოდულის თითოეული უფლება უნდა იყოს true ან false.');
      }
      return [key, input[key] === true];
    })
  ) as Record<Permission, boolean>;
}

function validateRole(value: unknown): StaffRole {
  if (typeof value !== 'string' || !ROLES.includes(value as StaffRole)) {
    throw new Error('თანამშრომლის როლი არასწორია.');
  }
  return value as StaffRole;
}

async function findAuthUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  const perPage = 1000;
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) return null;
  }
  throw new Error('მომხმარებლების სია ძალიან დიდია; ელფოსტა ვერ გადამოწმდა.');
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authorization = request.headers.get('Authorization') || '';
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) return json({ error: 'ავტორიზაცია აუცილებელია.' }, 401);

    const url = Deno.env.get('SUPABASE_URL');
    if (!url) throw new Error('Supabase URL is not configured.');

    const userClient = createClient(url, getPublishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: authorization } }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(tokenMatch[1]);
    const caller = userData?.user;

    if (userError || !caller) return json({ error: 'სესია ვერ დადასტურდა.' }, 401);
    if (caller.id !== OWNER_ID || caller.app_metadata?.role !== 'admin') {
      return json({ error: 'თანამშრომლების მართვა მხოლოდ მთავარ ადმინისტრატორს შეუძლია.' }, 403);
    }

    // Enforce the limit on the actual body bytes; Content-Length may be absent
    // or untrusted on streamed requests.
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 12000) {
      return json({ error: 'მოთხოვნა ძალიან დიდია.' }, 413);
    }
    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return json({ error: 'მოთხოვნის ფორმატი არასწორია.' }, 400);
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return json({ error: 'მოთხოვნის JSON ფორმატი არასწორია.' }, 400);
    }
    const action = body.action;
    const admin = createClient(url, getSecretKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });

    if (action === 'list') {
      const { data, error } = await admin
        .from('admin_staff_members')
        .select('id,user_id,email,display_name,role,permissions,is_active,created_at,updated_at')
        .order('created_at', { ascending: true });
      if (error) throw error;

      const staff = await Promise.all((data || []).map(async (member) => {
        try {
          const { data: authData, error: authError } = await admin.auth.admin.getUserById(member.user_id);
          const authUser = authData?.user || null;
          return {
            ...member,
            auth_confirmed: authUser ? Boolean(authUser.confirmed_at) : null,
            last_sign_in_at: authUser?.last_sign_in_at || null,
            auth_account_missing: Boolean(authError || !authUser)
          };
        } catch {
          return {
            ...member,
            auth_confirmed: null,
            last_sign_in_at: null,
            auth_account_missing: true
          };
        }
      }));
      return json({ staff });
    }

    if (action === 'invite') {
      const email = String(body.email || '').trim().toLowerCase();
      const displayName = String(body.display_name || '').trim();
      const role = validateRole(body.role);
      const permissions = normalizePermissions(body.permissions);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return json({ error: 'ელფოსტის მისამართი არასწორია.' }, 400);
      }
      if (displayName.length < 2 || displayName.length > 100) {
        return json({ error: 'სახელი უნდა შეიცავდეს 2-100 სიმბოლოს.' }, 400);
      }
      if (!Object.values(permissions).some(Boolean)) {
        return json({ error: 'აქტიურ თანამშრომელს მინიმუმ ერთი მოდულის უფლება უნდა ჰქონდეს.' }, 400);
      }

      let targetUser = await findAuthUserByEmail(admin, email);
      let invitedNewUser = false;
      if (!targetUser) {
        const redirectTo = Deno.env.get('STAFF_INVITE_REDIRECT_URL');
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { name: displayName },
          ...(redirectTo ? { redirectTo } : {})
        });
        if (error) throw error;
        targetUser = data.user;
        invitedNewUser = true;
      }

      // Existing accounts may be linked only after Supabase confirms ownership
      // of the email address. Newly invited accounts complete verification
      // through the invitation flow and are intentionally exempt here.
      if (!invitedNewUser && !targetUser?.confirmed_at) {
        return json({ error: 'არსებული ანგარიშის ელფოსტა ჯერ დადასტურებული არ არის. თანამშრომლად დასამატებლად ჯერ დაადასტურეთ ელფოსტა.' }, 409);
      }

      if (!targetUser?.id || targetUser.id === OWNER_ID) {
        return json({ error: 'ამ ანგარიშის თანამშრომლად დამატება დაუშვებელია.' }, 400);
      }
      if (targetUser.app_metadata?.role === 'admin') {
        return json({ error: 'სხვა ადმინისტრატორის ანგარიშის თანამშრომლად შეცვლა დაუშვებელია.' }, 409);
      }

      const { data: staff, error: saveError } = await admin
        .from('admin_staff_members')
        .upsert({
          user_id: targetUser.id,
          email,
          display_name: displayName,
          role,
          permissions,
          is_active: true,
          invited_by: caller.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select('id,user_id,email,display_name,role,permissions,is_active,created_at,updated_at')
        .single();

      if (saveError) {
        // Keep the Auth account intact. Without a membership row it has no staff permissions,
        // and the owner can safely retry linking the same account after resolving the error.
        throw saveError;
      }

      return json({ staff, invited: invitedNewUser, linked_existing_account: !invitedNewUser });
    }

    if (action === 'update') {
      const id = String(body.id || '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        return json({ error: 'თანამშრომლის იდენტიფიკატორი არასწორია.' }, 400);
      }
      const role = validateRole(body.role);
      const permissions = normalizePermissions(body.permissions);
      const displayName = String(body.display_name || '').trim();
      if (displayName.length < 2 || displayName.length > 100) {
        return json({ error: 'სახელი უნდა შეიცავდეს 2-100 სიმბოლოს.' }, 400);
      }
      if (body.is_active !== false && !Object.values(permissions).some(Boolean)) {
        return json({ error: 'აქტიურ თანამშრომელს მინიმუმ ერთი მოდულის უფლება უნდა ჰქონდეს.' }, 400);
      }

      const { data, error } = await admin
        .from('admin_staff_members')
        .update({
          display_name: displayName,
          role,
          permissions,
          is_active: body.is_active !== false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .neq('user_id', OWNER_ID)
        .select('id,user_id,email,display_name,role,permissions,is_active,created_at,updated_at')
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: 'თანამშრომელი ვერ მოიძებნა.' }, 404);
      return json({ staff: data });
    }

    if (action === 'revoke') {
      const id = String(body.id || '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        return json({ error: 'თანამშრომლის იდენტიფიკატორი არასწორია.' }, 400);
      }
      const { data, error } = await admin
        .from('admin_staff_members')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .neq('user_id', OWNER_ID)
        .select('id,user_id,email,display_name,role,permissions,is_active,created_at,updated_at')
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: 'თანამშრომელი ვერ მოიძებნა.' }, 404);
      return json({ staff: data, revoked: true });
    }

    return json({ error: 'მოთხოვნილი მოქმედება მხარდაჭერილი არ არის.' }, 400);
  } catch (error) {
    console.error('manage-admin-staff failed:', error);
    return json({ error: error instanceof Error ? error.message : 'შიდა სერვერული შეცდომა.' }, 500);
  }
});
