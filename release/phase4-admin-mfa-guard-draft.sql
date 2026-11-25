-- Unapplied 4AN candidate. Partial enforcement, NOT a production migration.
-- The live functions inspected in private schema match the staff foundation.
-- Apply only in isolated fixture or reviewed staged release after enrollment,
-- separate pre-MFA eligibility, and ALL alternate admin routes are protected.
create function private.admin_session_has_aal2()
returns boolean language sql stable security invoker set search_path=''
as $guard$
 select auth.uid() is not null
 and coalesce(auth.jwt()->>'is_anonymous','false') <> 'true'
 and coalesce(auth.jwt()->>'aal','') = 'aal2'
$guard$;
revoke all on function private.admin_session_has_aal2() from public,anon,authenticated,service_role;
grant execute on function private.admin_session_has_aal2() to authenticated;
-- Preserve existing owner, permission allowlist, confirmed email, active staff
-- membership and permissions. AAL2 alone never grants an admin role.
CREATE OR REPLACE FUNCTION private.has_staff_permission(p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF NOT private.admin_session_has_aal2()
     OR v_user_id IS NULL
     OR p_permission IS NULL
     OR p_permission NOT IN (
       'products', 'orders', 'analytics', 'expenses', 'crm', 'support', 'settings'
     ) THEN
    RETURN false;
  END IF;

  -- The existing owner identity retains full access independently of staff rows.
  IF v_user_id = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     AND coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin' THEN
    RETURN true;
  END IF;

  -- Defense in depth: an invited staff account receives no permissions
  -- until Supabase Auth confirms ownership of its email address.
  IF NOT EXISTS (
    SELECT 1
      FROM auth.users AS auth_user
     WHERE auth_user.id = v_user_id
       AND auth_user.email_confirmed_at IS NOT NULL
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
      FROM public.admin_staff_members AS staff
     WHERE staff.user_id = v_user_id
       AND staff.is_active IS TRUE
       AND staff.permissions->>p_permission = 'true'
  );
END;
$function$;
CREATE OR REPLACE FUNCTION private.get_my_admin_access()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_staff public.admin_staff_members%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR NOT private.admin_session_has_aal2() THEN
    RETURN jsonb_build_object(
      'is_admin', false,
      'is_staff', false,
      'role', null,
      'permissions', '{}'::jsonb
    );
  END IF;

  IF v_user_id = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     AND coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin' THEN
    RETURN jsonb_build_object(
      'is_admin', true,
      'is_staff', false,
      'role', 'owner',
      'permissions', jsonb_build_object(
        'products', true, 'orders', true, 'analytics', true,
        'expenses', true, 'crm', true, 'support', true, 'settings', true
      )
    );
  END IF;

  -- Do not expose staff-panel access before the invited email is confirmed.
  IF NOT EXISTS (
    SELECT 1
      FROM auth.users AS auth_user
     WHERE auth_user.id = v_user_id
       AND auth_user.email_confirmed_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'is_admin', false,
      'is_staff', false,
      'role', null,
      'permissions', '{}'::jsonb
    );
  END IF;

  SELECT staff.*
    INTO v_staff
    FROM public.admin_staff_members AS staff
   WHERE staff.user_id = v_user_id
     AND staff.is_active IS TRUE
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_admin', false,
      'is_staff', false,
      'role', null,
      'permissions', '{}'::jsonb
    );
  END IF;

  RETURN jsonb_build_object(
    'is_admin', false,
    'is_staff', true,
    'role', v_staff.role,
    'display_name', v_staff.display_name,
    'permissions', v_staff.permissions
  );
END;
$function$;
create or replace function private.require_purchase_owner()
returns uuid language plpgsql stable security invoker set search_path=''
as $guard$
begin
 if not private.admin_session_has_aal2()
 or auth.uid() is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
 or coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' then
  raise exception 'Owner required' using errcode='42501';
 end if;
 return auth.uid();
end;
$guard$;
-- Existing function ACLs preserved by CREATE OR REPLACE; do not broaden grants.
-- Other inline role/UID checks and server endpoints remain release blockers.
