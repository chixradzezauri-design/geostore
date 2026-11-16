-- Correct and complete persistent flash-sale expiry handling.
-- This follow-up intentionally changes only flash-sale metadata and the two
-- flash-sale tables; it never touches unrelated products or customer data.

CREATE OR REPLACE FUNCTION private.restore_flash_sale_campaign(
  p_campaign_id uuid,
  p_final_status text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_restored integer := 0;
BEGIN
  IF p_final_status NOT IN ('expired', 'replaced') THEN
    RAISE EXCEPTION 'Invalid flash-sale final status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.products AS p
     SET price_gel = i.original_price_gel,
         old_price_gel = i.original_old_price_gel
    FROM public.flash_sale_items AS i
   WHERE i.campaign_id = p_campaign_id
     AND p.id = i.product_id
     AND p.price_gel = i.sale_price_gel
     AND p.old_price_gel IS NOT DISTINCT FROM i.sale_old_price_gel;

  GET DIAGNOSTICS v_restored = ROW_COUNT;

  -- Clear only metadata belonging to this exact campaign. If an administrator
  -- manually changed the price, keep that price but do not leave stale timer data.
  UPDATE public.products AS p
     SET flash_sale_started_at = NULL,
         flash_sale_ends_at = NULL,
         flash_sale_percent = NULL
    FROM public.flash_sale_items AS i
    JOIN public.flash_sale_campaigns AS c ON c.id = i.campaign_id
   WHERE i.campaign_id = p_campaign_id
     AND p.id = i.product_id
     AND p.flash_sale_ends_at = c.ends_at;

  UPDATE public.flash_sale_campaigns
     SET status = p_final_status,
         updated_at = now()
   WHERE id = p_campaign_id
     AND status = 'active';

  RETURN v_restored;
END;
$function$;

CREATE OR REPLACE FUNCTION private.expire_flash_sales()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_campaign_id uuid;
  v_expired integer := 0;
  v_legacy_expired integer := 0;
BEGIN
  FOR v_campaign_id IN
    SELECT id
      FROM public.flash_sale_campaigns
     WHERE status = 'active'
       AND ends_at <= now()
     ORDER BY ends_at, id
     FOR UPDATE
  LOOP
    PERFORM private.restore_flash_sale_campaign(v_campaign_id, 'expired');
    v_expired := v_expired + 1;
  END LOOP;

  -- Preserve the previous expiry behavior for any older flash sale that was
  -- created before campaign records existed.
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

  GET DIAGNOSTICS v_legacy_expired = ROW_COUNT;
  RETURN v_expired + v_legacy_expired;
END;
$function$;

CREATE OR REPLACE FUNCTION private.admin_create_flash_sale(
  p_discount_percent numeric,
  p_category text,
  p_duration_minutes integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_campaign_id uuid := gen_random_uuid();
  v_updated integer := 0;
  v_snapshot_count integer := 0;
  v_previous_campaign_id uuid;
  v_starts_at timestamptz := now();
  v_ends_at timestamptz;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to create flash sale' USING ERRCODE = '42501';
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

  IF p_duration_minutes IS NULL OR p_duration_minutes NOT IN (15, 30, 60, 180, 360, 720, 1440) THEN
    RAISE EXCEPTION 'Flash-sale duration must be one of the supported minute values'
      USING ERRCODE = '22023';
  END IF;

  PERFORM p.id
    FROM public.products AS p
   WHERE (p_category = 'ყველა' OR p.category = p_category)
     AND COALESCE(p.variants, '[]'::jsonb) = '[]'::jsonb
   FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1
      FROM public.products AS p
     WHERE (p_category = 'ყველა' OR p.category = p_category)
       AND COALESCE(p.variants, '[]'::jsonb) = '[]'::jsonb
       AND ROUND(
         (CASE WHEN p.old_price_gel > p.price_gel THEN p.old_price_gel ELSE p.price_gel END)
         * (1 - p_discount_percent / 100),
         2
       ) < (CASE WHEN p.old_price_gel > p.price_gel THEN p.old_price_gel ELSE p.price_gel END)
  ) THEN
    RETURN jsonb_build_object('updated_count', 0, 'campaign', NULL);
  END IF;

  PERFORM private.expire_flash_sales();

  FOR v_previous_campaign_id IN
    SELECT id
      FROM public.flash_sale_campaigns
     WHERE status = 'active'
     ORDER BY created_at, id
     FOR UPDATE
  LOOP
    PERFORM private.restore_flash_sale_campaign(v_previous_campaign_id, 'replaced');
  END LOOP;

  v_ends_at := v_starts_at + make_interval(mins => p_duration_minutes);

  INSERT INTO public.flash_sale_campaigns (
    id, category, discount_percent, starts_at, ends_at, status
  ) VALUES (
    v_campaign_id, trim(p_category), p_discount_percent, v_starts_at, v_ends_at, 'active'
  );

  INSERT INTO public.flash_sale_items (
    campaign_id, product_id, original_price_gel, original_old_price_gel,
    sale_price_gel, sale_old_price_gel
  )
  SELECT
    v_campaign_id,
    p.id,
    p.price_gel,
    p.old_price_gel,
    ROUND(
      (CASE WHEN p.old_price_gel > p.price_gel THEN p.old_price_gel ELSE p.price_gel END)
      * (1 - p_discount_percent / 100),
      2
    ),
    CASE WHEN p.old_price_gel > p.price_gel THEN p.old_price_gel ELSE p.price_gel END
  FROM public.products AS p
  WHERE (p_category = 'ყველა' OR p.category = p_category)
    AND COALESCE(p.variants, '[]'::jsonb) = '[]'::jsonb
    AND ROUND(
      (CASE WHEN p.old_price_gel > p.price_gel THEN p.old_price_gel ELSE p.price_gel END)
      * (1 - p_discount_percent / 100),
      2
    ) < (CASE WHEN p.old_price_gel > p.price_gel THEN p.old_price_gel ELSE p.price_gel END);

  GET DIAGNOSTICS v_snapshot_count = ROW_COUNT;

  -- Apply the exact price snapshot and campaign end timestamp atomically.
  -- Do not call the older 12-hour helper: it would overwrite the chosen duration.
  UPDATE public.products AS p
     SET price_gel = i.sale_price_gel,
         old_price_gel = i.sale_old_price_gel,
         flash_sale_started_at = v_starts_at,
         flash_sale_ends_at = v_ends_at,
         flash_sale_percent = p_discount_percent
    FROM public.flash_sale_items AS i
   WHERE i.campaign_id = v_campaign_id
     AND p.id = i.product_id
     AND p.price_gel = i.original_price_gel
     AND p.old_price_gel IS NOT DISTINCT FROM i.original_old_price_gel;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated <> v_snapshot_count OR v_updated = 0 THEN
    RAISE EXCEPTION 'Flash-sale price snapshot did not match the applied product count'
      USING ERRCODE = '40001';
  END IF;

  RETURN jsonb_build_object(
    'updated_count', v_updated,
    'campaign', jsonb_build_object(
      'id', v_campaign_id,
      'category', trim(p_category),
      'discount_percent', p_discount_percent,
      'starts_at', v_starts_at,
      'ends_at', v_ends_at,
      'product_ids', COALESCE(
        (SELECT jsonb_agg(i.product_id ORDER BY i.product_id)
           FROM public.flash_sale_items AS i
          WHERE i.campaign_id = v_campaign_id),
        '[]'::jsonb
      )
    )
  );
END;
$function$;

DO $schedule$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'geostore-expire-flash-sales'
  ) THEN
    PERFORM cron.schedule(
      'geostore-expire-flash-sales',
      '* * * * *',
      'SELECT private.expire_flash_sales();'
    );
  END IF;
END;
$schedule$;
