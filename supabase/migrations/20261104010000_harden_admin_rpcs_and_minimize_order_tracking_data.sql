-- Harden public RPC wrappers while preserving their existing authorization checks.
-- Keep privileged implementations in the non-exposed private schema.

CREATE OR REPLACE FUNCTION private.admin_save_order_note(p_order_id text, p_admin_note text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR auth.uid() <> '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized to save order note' USING ERRCODE = '42501';
  END IF;

  UPDATE public.orders
     SET admin_note = left(COALESCE(p_admin_note, ''), 5000)
   WHERE id::text = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION private.admin_save_order_note(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_save_order_note(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_save_order_note(p_order_id text, p_admin_note text)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.admin_save_order_note(p_order_id, p_admin_note);
$$;

CREATE OR REPLACE FUNCTION public.admin_save_product(p_product jsonb)
RETURNS public.products
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.admin_save_product(p_product);
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_product(p_product_id text)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.admin_delete_product(p_product_id);
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.admin_save_product(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION private.admin_delete_product(text) TO authenticated;

CREATE OR REPLACE FUNCTION private.lookup_order_for_tracking(p_order_id text, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%rowtype;
  v_input_phone text;
BEGIN
  v_input_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  IF coalesce(length(trim(p_order_id)), 0) < 6
     OR length(v_input_phone) < 9
     OR length(v_input_phone) > 15 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE upper(id) = upper(trim(p_order_id))
    AND regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = v_input_phone
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'totalGEL', v_order.total_gel,
    'status', coalesce(v_order.status, 'ახალი'),
    'date', to_char(v_order.created_at at time zone 'Asia/Tbilisi', 'DD.MM.YYYY'),
    'items', coalesce(v_order.items, '[]'::jsonb),
    'itemSummary', coalesce((
      SELECT string_agg(coalesce(item->>'name', 'პროდუქტი') || ' (x' || coalesce(item->>'quantity', '1') || ')', ', ')
      FROM jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) AS item
    ), 'პროდუქტები')
  );
END;
$$;

REVOKE ALL ON FUNCTION private.lookup_order_for_tracking(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.lookup_order_for_tracking(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_order_for_tracking(p_order_id text, p_phone text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.lookup_order_for_tracking(p_order_id, p_phone);
$$;

GRANT USAGE ON SCHEMA private TO anon;
REVOKE ALL ON FUNCTION public.lookup_order_for_tracking(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_order_for_tracking(text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_save_order_note(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_order_note(text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_save_product(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_product(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_product(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(text) TO authenticated;
