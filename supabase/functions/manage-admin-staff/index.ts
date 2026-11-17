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

      const invitationMetadataKey = 'geostore_staff_invitation_token';
      let targetUser = await findAuthUserByEmail(admin, email);
      let invitedNewUser = false;
      let recoveredPendingInvite = false;
      let invitationToken: string | null = null;

      if (!targetUser) {
        // Persist the owner-authorized intent before calling Auth. If Auth creates
        // the user but the membership write later fails, the same token lets the
        // owner safely recover that exact invitation on a subsequent attempt.
        const { data: pendingInvite, error: pendingReadError } = await admin
          .from('admin_staff_pending_invites')
          .select('invitation_token')
          .eq('email', email)
          .maybeSingle();
        if (pendingReadError) throw pendingReadError;

        invitationToken = pendingInvite?.invitation_token || crypto.randomUUID();
        if (!pendingInvite) {
          const { error: pendingInsertError } = await admin
            .from('admin_staff_pending_invites')
            .insert({
              email,
              invitation_token: invitationToken,
              invited_by: caller.id
            });
          if (pendingInsertError) throw pendingInsertError;
        }

        const redirectTo = Deno.env.get('STAFF_INVITE_REDIRECT_URL');
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { name: displayName, [invitationMetadataKey]: invitationToken },
          ...(redirectTo ? { redirectTo } : {})
        });
        if (error) throw error;
        targetUser = data.user;
        invitedNewUser = true;
      } else if (!targetUser.confirmed_at) {
        // Never attach an arbitrary pre-existing unconfirmed signup. Recovery is
        // allowed only when its unguessable marker matches an owner-created,
        // server-only pending invitation recorded before Auth was called.
        const { data: pendingInvite, error: pendingReadError } = await admin
          .from('admin_staff_pending_invites')
          .select('invitation_token')
          .eq('email', email)
          .maybeSingle();
        if (pendingReadError) throw pendingReadError;

        const userInvitationToken = targetUser.user_metadata?.[invitationMetadataKey];
        if (!pendingInvite || typeof userInvitationToken !== 'string' ||
            userInvitationToken !== pendingInvite.invitation_token) {
          return json({ error: 'არსებული ანგარიშის ელფოსტა ჯერ დადასტურებული არ არის და ეს ანგარიში ამ მოწვევით არ შექმნილა. ჯერ დაადასტურეთ ელფოსტა.' }, 409);
        }
        invitationToken = pendingInvite.invitation_token;
        recoveredPendingInvite = true;
      }

      if (!targetUser?.confirmed_at &&
          (!invitationToken || targetUser.user_metadata?.[invitationMetadataKey] !== invitationToken)) {
        return json({ error: 'თანამშრომლის მოწვევა ვერ დადასტურდა. უფლებების მინიჭება შეჩერებულია.' }, 409);
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
        // Keep both the Auth account and pending invitation marker intact. The
        // owner can retry; an unconfirmed account is recoverable only with this
        // exact server-recorded invitation token and still receives no access
        // until email_confirmed_at becomes non-null in the permission functions.
        throw saveError;
      }

      // Cleanup is best-effort: a failed cleanup is harmless and a retry remains
      // idempotent because the membership upsert and token check are repeatable.
      const { error: pendingCleanupError } = await admin
        .from('admin_staff_pending_invites')
        .delete()
        .eq('email', email);
      if (pendingCleanupError) {
        console.error('Could not clear recovered staff invitation marker:', pendingCleanupError);
      }

      return json({
        staff,
        invited: invitedNewUser,
        linked_existing_account: !invitedNewUser && !recoveredPendingInvite,
        recovered_pending_invite: recoveredPendingInvite
      });
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
