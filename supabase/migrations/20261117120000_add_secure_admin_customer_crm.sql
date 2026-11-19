-- Persistent CRM metadata for real Supabase Auth customers.
-- This migration is additive: it does not alter or delete auth.users, orders,
-- customer messages, support tickets, or any existing local CRM snapshots.

CREATE TABLE IF NOT EXISTS private.admin_customer_crm_profiles (
  user_id uuid PRIMARY KEY,
  is_vip boolean NOT NULL DEFAULT false,
  is_blocked boolean NOT NULL DEFAULT false,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0
    CHECK (discount_percent >= 0 AND discount_percent <= 100),
  admin_notes text NOT NULL DEFAULT ''
    CHECK (char_length(admin_notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.admin_customer_crm_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.admin_customer_crm_profiles
  FROM PUBLIC, anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx
  ON public.orders (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.list_admin_customers(p_limit integer DEFAULT 500)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  phone text,
  created_at timestamptz,
  is_vip boolean,
  is_blocked boolean,
  discount_percent numeric,
  admin_notes text,
  orders_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR auth.jwt()->'app_metadata'->>'role' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    coalesce(
      nullif(btrim(u.raw_user_meta_data->>'name'), ''),
      nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
      split_part(coalesce(u.email, ''), '@', 1)
    )::text,
    coalesce(
      nullif(btrim(u.raw_user_meta_data->>'phone'), ''),
      nullif(btrim(u.raw_user_meta_data->>'phone_number'), '')
    )::text,
    u.created_at,
    coalesce(p.is_vip, false),
    coalesce(p.is_blocked, false),
    coalesce(p.discount_percent, 0),
    coalesce(p.admin_notes, ''),
    coalesce(o.orders_count, 0)::bigint
  FROM auth.users AS u
  LEFT JOIN private.admin_customer_crm_profiles AS p
    ON p.user_id = u.id
  LEFT JOIN (
    SELECT ord.user_id, count(*)::bigint AS orders_count
    FROM public.orders AS ord
    WHERE ord.user_id IS NOT NULL
    GROUP BY ord.user_id
  ) AS o ON o.user_id = u.id
  ORDER BY u.created_at DESC, u.id
  LIMIT greatest(1, least(coalesce(p_limit, 500), 500));
END;
$function$;

CREATE OR REPLACE FUNCTION private.save_admin_customer_crm_profile(
  p_user_id uuid,
  p_is_vip boolean,
  p_is_blocked boolean,
  p_discount_percent numeric,
  p_admin_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result private.admin_customer_crm_profiles%rowtype;
  v_discount numeric(5,2) := coalesce(p_discount_percent, 0);
  v_notes text := coalesce(p_admin_notes, '');
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR auth.jwt()->'app_metadata'->>'role' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM auth.users AS u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'მომხმარებელი ვერ მოიძებნა.' USING ERRCODE = '22023';
  END IF;

  IF v_discount < 0 OR v_discount > 100 OR v_notes IS NULL OR char_length(v_notes) > 1000 THEN
    RAISE EXCEPTION 'CRM ფასდაკლება ან შენიშვნა არასწორია.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO private.admin_customer_crm_profiles (
    user_id, is_vip, is_blocked, discount_percent, admin_notes, updated_at
  )
  VALUES (
    p_user_id, coalesce(p_is_vip, false), coalesce(p_is_blocked, false),
    v_discount, v_notes, now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET is_vip = EXCLUDED.is_vip,
      is_blocked = EXCLUDED.is_blocked,
      discount_percent = EXCLUDED.discount_percent,
      admin_notes = EXCLUDED.admin_notes,
      updated_at = now()
  RETURNING * INTO v_result;

  RETURN jsonb_build_object(
    'user_id', v_result.user_id,
    'is_vip', v_result.is_vip,
    'is_blocked', v_result.is_blocked,
    'discount_percent', v_result.discount_percent,
    'admin_notes', v_result.admin_notes,
    'updated_at', v_result.updated_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.list_admin_customers(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.save_admin_customer_crm_profile(uuid, boolean, boolean, numeric, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.list_admin_customers(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.save_admin_customer_crm_profile(uuid, boolean, boolean, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_admin_customers(p_limit integer DEFAULT 500)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  phone text,
  created_at timestamptz,
  is_vip boolean,
  is_blocked boolean,
  discount_percent numeric,
  admin_notes text,
  orders_count bigint
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT * FROM private.list_admin_customers(p_limit);
$function$;

CREATE OR REPLACE FUNCTION public.save_admin_customer_crm_profile(
  p_user_id uuid,
  p_is_vip boolean,
  p_is_blocked boolean,
  p_discount_percent numeric,
  p_admin_notes text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.save_admin_customer_crm_profile(
    p_user_id, p_is_vip, p_is_blocked, p_discount_percent, p_admin_notes
  );
$function$;

REVOKE ALL ON FUNCTION public.list_admin_customers(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_admin_customer_crm_profile(uuid, boolean, boolean, numeric, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_customers(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_admin_customer_crm_profile(uuid, boolean, boolean, numeric, text) TO authenticated;
