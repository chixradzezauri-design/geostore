-- Enforce two-decimal discount precision and skip no-op rounded price updates.
CREATE OR REPLACE FUNCTION private.admin_apply_flash_sale(
  p_discount_percent numeric,
  p_category text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_updated integer;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to apply flash sale' USING ERRCODE = '42501';
  END IF;
  IF p_discount_percent IS NULL OR p_discount_percent <= 0
     OR p_discount_percent >= 100
     OR p_discount_percent <> round(p_discount_percent, 2) THEN
    RAISE EXCEPTION 'Discount percent must be greater than 0, less than 100, and have at most 2 decimal places'
      USING ERRCODE = '22023';
  END IF;
  IF COALESCE(trim(p_category), '') = '' THEN
    RAISE EXCEPTION 'Category is required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.products
     SET old_price_gel = CASE WHEN old_price_gel > price_gel THEN old_price_gel ELSE price_gel END,
         price_gel = ROUND(
           (CASE WHEN old_price_gel > price_gel THEN old_price_gel ELSE price_gel END)
           * (1 - p_discount_percent / 100), 2
         )
   WHERE (p_category = 'ყველა' OR category = p_category)
     AND ROUND(
           (CASE WHEN old_price_gel > price_gel THEN old_price_gel ELSE price_gel END)
           * (1 - p_discount_percent / 100), 2
         ) < (CASE WHEN old_price_gel > price_gel THEN old_price_gel ELSE price_gel END);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$;
