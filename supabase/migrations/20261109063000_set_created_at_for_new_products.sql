-- Ensure every newly-created catalogue item receives a server-owned creation timestamp.
-- The INSERT uses jsonb_populate_record, which materializes omitted columns as NULL
-- and therefore bypasses the table default for created_at.
CREATE OR REPLACE FUNCTION private.admin_save_product(p_product jsonb)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_product public.products;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to save products' USING ERRCODE = '42501';
  END IF;

  IF p_product IS NULL
     OR COALESCE(trim(p_product ->> 'id'), '') = ''
     OR COALESCE(trim(p_product ->> 'name'), '') = ''
     OR NULLIF(p_product ->> 'price_gel', '') IS NULL
     OR (p_product ->> 'price_gel')::numeric < 0
     OR COALESCE((p_product ->> 'stock')::integer, 0) < 0 THEN
    RAISE EXCEPTION 'Invalid product payload' USING ERRCODE = '22023';
  END IF;

  -- This RPC is used only for product creation. Never turn an ID collision
  -- into an update: an upsert could overwrite stock changed by checkout.
  -- Override any client value with the database timestamp for deterministic
  -- newest-first catalogue ordering and a verifiable server response.
  INSERT INTO public.products
  SELECT (
    jsonb_populate_record(
      NULL::public.products,
      p_product || jsonb_build_object('created_at', now())
    )
  ).*
  RETURNING * INTO v_product;

  RETURN v_product;
END;
$function$;
