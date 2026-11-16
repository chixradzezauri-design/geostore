-- Persist flash-sale deadlines, let administrators choose the duration,
-- and automatically restore the original prices when an offer expires.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS flash_sale_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS flash_sale_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS flash_sale_percent numeric(5,2);

-- Existing discounted products remain discounted; assign them one stable
-- 12-hour expiry so their countdown no longer resets on storefront visits.
UPDATE public.products
   SET flash_sale_started_at = COALESCE(flash_sale_started_at, now()),
       flash_sale_ends_at = COALESCE(flash_sale_ends_at, now() + interval '12 hours'),
       flash_sale_percent = COALESCE(
         flash_sale_percent,
         ROUND(((old_price_gel - price_gel) / NULLIF(old_price_gel, 0)) * 100, 2)
       )
 WHERE old_price_gel IS NOT NULL
   AND old_price_gel > price_gel
   AND flash_sale_ends_at IS NULL;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.products'::regclass
       AND conname = 'products_flash_sale_metadata_valid_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_flash_sale_metadata_valid_check
      CHECK (
        (flash_sale_started_at IS NULL AND flash_sale_ends_at IS NULL AND flash_sale_percent IS NULL)
        OR (
          flash_sale_started_at IS NOT NULL
          AND flash_sale_ends_at IS NOT NULL
          AND flash_sale_ends_at > flash_sale_started_at
          AND flash_sale_percent > 0
          AND flash_sale_percent < 100
        )
      ) NOT VALID;
  END IF;
END;
$constraints$;

ALTER TABLE public.products
  VALIDATE CONSTRAINT products_flash_sale_metadata_valid_check;

CREATE INDEX IF NOT EXISTS products_flash_sale_expiry_idx
  ON public.products (flash_sale_ends_at)
  WHERE flash_sale_ends_at IS NOT NULL;

-- The new metadata is public catalogue information only. Keep the existing
-- purchase_cost and is_published restrictions intact.
GRANT SELECT (flash_sale_started_at, flash_sale_ends_at, flash_sale_percent)
  ON TABLE public.products TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.admin_apply_flash_sale(
  p_discount_percent numeric,
  p_category text,
  p_duration_hours integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_updated integer;
  v_started_at timestamptz := now();
  v_ends_at timestamptz;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to apply flash sale' USING ERRCODE = '42501';
  END IF;

  IF p_discount_percent IS NULL
     OR p_discount_percent <= 0
     OR p_discount_percent >= 100
     OR p_discount_percent <> round(p_discount_percent, 2) THEN
    RAISE EXCEPTION 'Discount percent must be greater than 0, less than 100, and have at most 2 decimal places'
      USING ERRCODE = '22023';
  END IF;

  IF COALESCE(trim(p_category), '') = '' THEN
    RAISE EXCEPTION 'Category is required' USING ERRCODE = '22023';
  END IF;

  IF p_duration_hours NOT IN (1, 3, 6, 12, 24, 48) THEN
    RAISE EXCEPTION 'Flash sale duration must be one of 1, 3, 6, 12, 24, or 48 hours'
      USING ERRCODE = '22023';
  END IF;

  v_ends_at := v_started_at + make_interval(hours => p_duration_hours);

  UPDATE public.products
     SET old_price_gel = CASE
           WHEN old_price_gel > price_gel THEN old_price_gel
           ELSE price_gel
         END,
         price_gel = ROUND(
           (CASE WHEN old_price_gel > price_gel THEN old_price_gel ELSE price_gel END)
           * (1 - p_discount_percent / 100),
           2
         ),
         flash_sale_started_at = v_started_at,
         flash_sale_ends_at = v_ends_at,
         flash_sale_percent = p_discount_percent
   WHERE (p_category = 'ყველა' OR category = p_category)
     AND COALESCE(variants, '[]'::jsonb) = '[]'::jsonb
     AND ROUND(
           (CASE WHEN old_price_gel > price_gel THEN old_price_gel ELSE price_gel END)
           * (1 - p_discount_percent / 100),
           2
         ) < (CASE WHEN old_price_gel > price_gel THEN old_price_gel ELSE price_gel END);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$;

REVOKE ALL ON FUNCTION private.admin_apply_flash_sale(numeric, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_apply_flash_sale(numeric, text, integer)
  TO authenticated;

-- Keep the existing two-argument RPC backward-compatible at the 12-hour default.
CREATE OR REPLACE FUNCTION public.admin_apply_flash_sale(
  p_discount_percent numeric,
  p_category text
)
RETURNS integer
LANGUAGE sql
SET search_path TO ''
AS $function$
  SELECT private.admin_apply_flash_sale(p_discount_percent, p_category, 12);
$function$;

CREATE OR REPLACE FUNCTION public.admin_apply_flash_sale(
  p_discount_percent numeric,
  p_category text,
  p_duration_hours integer
)
RETURNS integer
LANGUAGE sql
SET search_path TO ''
AS $function$
  SELECT private.admin_apply_flash_sale(p_discount_percent, p_category, p_duration_hours);
$function$;

REVOKE ALL ON FUNCTION public.admin_apply_flash_sale(numeric, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_apply_flash_sale(numeric, text, integer)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.expire_flash_sales()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.products
     SET price_gel = CASE
           WHEN old_price_gel IS NOT NULL AND old_price_gel > price_gel
             THEN old_price_gel
           ELSE price_gel
         END,
         old_price_gel = NULL,
         flash_sale_started_at = NULL,
         flash_sale_ends_at = NULL,
         flash_sale_percent = NULL
   WHERE flash_sale_ends_at IS NOT NULL
     AND flash_sale_ends_at <= now();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$;

REVOKE ALL ON FUNCTION private.expire_flash_sales()
  FROM PUBLIC, anon, authenticated;

-- Supabase Cron runs the narrow expiry function once per minute.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $schedule$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid FROM cron.job WHERE jobname = 'geostore_expire_flash_sales'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'geostore_expire_flash_sales',
    '* * * * *',
    'SELECT private.expire_flash_sales();'
  );
END;
$schedule$;
