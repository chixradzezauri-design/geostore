-- Persist flash-sale prices in one transaction, with primary-admin authorization.
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

  IF p_discount_percent IS NULL
     OR p_discount_percent <= 0
     OR p_discount_percent >= 100 THEN
    RAISE EXCEPTION 'Discount percent must be greater than 0 and less than 100' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(trim(p_category), '') = '' THEN
    RAISE EXCEPTION 'Category is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.products
     SET old_price_gel = COALESCE(old_price_gel, price_gel),
         price_gel = ROUND(COALESCE(old_price_gel, price_gel) * (1 - p_discount_percent / 100), 2)
   WHERE p_category = 'ყველა'
      OR category = p_category;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_apply_flash_sale(
  p_discount_percent numeric,
  p_category text
)
RETURNS integer
LANGUAGE sql
SET search_path TO ''
AS $function$
  SELECT private.admin_apply_flash_sale(p_discount_percent, p_category);
$function$;

REVOKE ALL ON FUNCTION private.admin_apply_flash_sale(numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_apply_flash_sale(numeric, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_apply_flash_sale(numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_apply_flash_sale(numeric, text) TO authenticated;
