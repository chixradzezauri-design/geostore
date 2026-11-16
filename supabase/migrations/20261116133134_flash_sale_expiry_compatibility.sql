-- Restore the original product-level flash-sale expiry path.
-- A later additive campaign-table migration replaced this function and stopped
-- expiring products that use flash_sale_ends_at. Keep both schemas safe while
-- the storefront/admin continue using the product-level persisted timestamps.

CREATE OR REPLACE FUNCTION private.expire_flash_sales()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_expired_products integer := 0;
BEGIN
  UPDATE public.products AS p
     SET price_gel = CASE
           WHEN p.old_price_gel IS NOT NULL AND p.old_price_gel > p.price_gel
             THEN p.old_price_gel
           ELSE p.price_gel
         END,
         old_price_gel = NULL,
         flash_sale_started_at = NULL,
         flash_sale_ends_at = NULL,
         flash_sale_percent = NULL
   WHERE p.flash_sale_ends_at IS NOT NULL
     AND p.flash_sale_ends_at <= now()
     AND NOT EXISTS (
       SELECT 1
         FROM public.flash_sale_items AS i
        WHERE i.product_id = p.id
     );

  GET DIAGNOSTICS v_expired_products = ROW_COUNT;
  RETURN v_expired_products;
END;
$function$;

REVOKE ALL ON FUNCTION private.expire_flash_sales()
  FROM PUBLIC, anon, authenticated;

-- The storefront/admin use the product-level RPC and timestamp columns.
-- Disable the unused parallel campaign RPC so there is only one source of truth.
REVOKE ALL ON FUNCTION public.admin_create_flash_sale(numeric, text, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_active_flash_sale()
  FROM PUBLIC, anon, authenticated;

-- Keep one minute-level expiry job; remove the duplicate introduced by the
-- temporary campaign implementation.
DO $unschedule$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid
      FROM cron.job
     WHERE jobname = 'geostore-expire-flash-sales'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
END;
$unschedule$;
