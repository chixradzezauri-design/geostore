-- Keep GEOSTORE's existing product-level flash-sale model as the only
-- client-facing source of truth. The additive campaign tables are retained
-- untouched for data safety, but the parallel campaign RPCs are not exposed.
-- Keep the original underscore-named expiry job and remove the duplicate
-- hyphen-named job added during the campaign implementation.

REVOKE ALL ON FUNCTION public.admin_create_flash_sale(numeric, text, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_active_flash_sale()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.admin_create_flash_sale(numeric, text, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.restore_flash_sale_campaign(uuid, text)
  FROM PUBLIC, anon, authenticated;

DO $cleanup$
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

  -- Ensure the original product-level expiry worker remains scheduled exactly
  -- once. It restores existing product prices at their persisted deadline.
  IF NOT EXISTS (
    SELECT 1
      FROM cron.job
     WHERE jobname = 'geostore_expire_flash_sales'
       AND active
  ) THEN
    FOR v_job_id IN
      SELECT jobid
        FROM cron.job
       WHERE jobname = 'geostore_expire_flash_sales'
    LOOP
      PERFORM cron.unschedule(v_job_id);
    END LOOP;

    PERFORM cron.schedule(
      'geostore_expire_flash_sales',
      '* * * * *',
      'SELECT private.expire_flash_sales();'
    );
  END IF;
END;
$cleanup$;

-- These assertions fail the migration rather than silently leaving two
-- active expiry workers or an exposed campaign RPC.
DO $verify$
BEGIN
  IF (
    SELECT count(*)
      FROM cron.job
     WHERE jobname = 'geostore_expire_flash_sales'
       AND active
  ) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one active GEOSTORE flash-sale expiry job';
  END IF;

  IF has_function_privilege('anon', 'public.admin_create_flash_sale(numeric,text,integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.admin_create_flash_sale(numeric,text,integer)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.get_active_flash_sale()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.get_active_flash_sale()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Campaign RPCs must not be executable by client roles';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.admin_apply_flash_sale(numeric,text,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Existing guarded product-level flash-sale RPC must remain available';
  END IF;
END;
$verify$;
