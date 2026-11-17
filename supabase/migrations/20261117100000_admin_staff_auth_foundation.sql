-- Stage 102: authoritative staff identities and server-side permission lookup.
-- This migration is staged only; do not apply until the complete staff/RLS rollout is reviewed.

CREATE TABLE IF NOT EXISTS public.admin_staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'operator', 'finance', 'product_manager')),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(permissions) = 'object'),
  is_active boolean NOT NULL DEFAULT true,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_staff_email_normalized CHECK (
    email = lower(btrim(email))
    AND position('@' IN email) > 1
    AND position(' ' IN email) = 0
  ),
  CONSTRAINT admin_staff_display_name_length CHECK (
    char_length(btrim(display_name)) BETWEEN 2 AND 100
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_staff_members_email_lower_uidx
  ON public.admin_staff_members (lower(email));

ALTER TABLE public.admin_staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_staff_members FORCE ROW LEVEL SECURITY;

-- Staff membership and permission JSON are never directly readable or writable
-- through the browser's Data API. Only the trusted Edge Function uses service_role.
REVOKE ALL ON TABLE public.admin_staff_members FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.admin_staff_members TO service_role;

CREATE OR REPLACE FUNCTION public.has_staff_permission(p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL
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

  RETURN EXISTS (
    SELECT 1
      FROM public.admin_staff_members AS staff
     WHERE staff.user_id = v_user_id
       AND staff.is_active IS TRUE
       AND staff.permissions->>p_permission = 'true'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.has_staff_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_staff_permission(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_admin_access()
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
  IF v_user_id IS NULL THEN
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

REVOKE ALL ON FUNCTION public.get_my_admin_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_admin_access() TO authenticated;

COMMENT ON TABLE public.admin_staff_members IS
  'Authoritative GEOSTORE staff membership. Browser roles/localStorage are never authorization sources.';
COMMENT ON FUNCTION public.has_staff_permission(text) IS
  'Server-side permission check for the current authenticated user; owner identity retains full access.';
COMMENT ON FUNCTION public.get_my_admin_access() IS
  'Returns only the current authenticated user''s effective GEOSTORE admin/staff access.';
