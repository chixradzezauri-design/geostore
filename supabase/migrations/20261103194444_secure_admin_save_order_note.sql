-- Secure admin-only order note updates; no order status or stock side effects.
CREATE OR REPLACE FUNCTION public.admin_save_order_note(p_order_id text, p_admin_note text)
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
;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_order_note(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_order_note(text, text) TO authenticated;