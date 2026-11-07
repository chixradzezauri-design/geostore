-- Secure admin restocking for custom product variants.
-- The latest custom-variant migration installs a stock-preservation trigger;
-- this RPC marks only its own row-locked inventory update as authorized.

CREATE OR REPLACE FUNCTION private.admin_adjust_product_variant_stock(
  p_product_id text,
  p_variant_id text,
  p_delta integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_product_id text;
  v_variants jsonb;
  v_variant_count integer;
  v_current_stock integer;
  v_new_stock integer;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to adjust product inventory' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(trim(p_product_id), '') IS NULL
     OR NULLIF(trim(p_variant_id), '') IS NULL
     OR p_delta IS NULL OR p_delta = 0
     OR p_delta < -1000000 OR p_delta > 1000000 THEN
    RAISE EXCEPTION 'Invalid variant stock adjustment' USING ERRCODE = '22023';
  END IF;

  SELECT id, variants INTO v_product_id, v_variants
    FROM public.products
   WHERE id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  IF jsonb_typeof(v_variants) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Product variants are invalid' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_variant_count
    FROM jsonb_array_elements(v_variants) AS e(item)
   WHERE item ->> 'id' = p_variant_id;

  IF v_variant_count <> 1 THEN
    RAISE EXCEPTION 'Variant not found or duplicated' USING ERRCODE = 'P0002';
  END IF;

  SELECT CASE
    WHEN coalesce(item ->> 'stock', '') ~ '^[0-9]{1,7}$'
      THEN (item ->> 'stock')::integer
    ELSE NULL
  END
    INTO v_current_stock
    FROM jsonb_array_elements(v_variants) AS e(item)
   WHERE item ->> 'id' = p_variant_id;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Variant stock is invalid' USING ERRCODE = '22023';
  END IF;

  v_new_stock := v_current_stock + p_delta;
  IF v_new_stock < 0 OR v_new_stock > 1000000 THEN
    RAISE EXCEPTION 'Variant stock would be outside the allowed range' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('geostore.variant_stock_adjustment', 'on', true);

  UPDATE public.products AS p
     SET variants = (
       SELECT jsonb_agg(
         CASE WHEN element ->> 'id' = p_variant_id
           THEN jsonb_set(element, '{stock}', to_jsonb(v_new_stock), true)
           ELSE element
         END
         ORDER BY ordinality
       )
       FROM jsonb_array_elements(v_variants)
         WITH ORDINALITY AS variant_rows(element, ordinality)
     )
   WHERE p.id = p_product_id
   RETURNING p.id, p.variants INTO v_product_id, v_variants;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product inventory update failed' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('id', v_product_id, 'variants', v_variants);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_adjust_product_variant_stock(
  p_product_id text,
  p_variant_id text,
  p_delta integer
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.admin_adjust_product_variant_stock(p_product_id, p_variant_id, p_delta);
$function$;

REVOKE ALL ON FUNCTION private.admin_adjust_product_variant_stock(text, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_adjust_product_variant_stock(text, text, integer)
  TO authenticated;
REVOKE ALL ON FUNCTION public.admin_adjust_product_variant_stock(text, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_product_variant_stock(text, text, integer)
  TO authenticated;
