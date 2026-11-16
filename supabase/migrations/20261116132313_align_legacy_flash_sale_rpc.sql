-- Keep legacy two-argument private callers on the same persisted-expiry path.
CREATE OR REPLACE FUNCTION private.admin_apply_flash_sale(
  p_discount_percent numeric,
  p_category text
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT private.admin_apply_flash_sale(p_discount_percent, p_category, 12);
$function$;
