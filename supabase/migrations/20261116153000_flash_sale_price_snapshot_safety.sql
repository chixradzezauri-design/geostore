-- Prevent stacked/extended flash-sale discounts from changing prices upward.
-- Replace any active legacy sale before taking the new campaign's price snapshot.
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

  -- First expire due campaigns, then restore any currently active campaign.
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

  -- Legacy campaigns created before persistent campaign records are restored
  -- once before the new snapshot. The cron expiry function handles their deadline.
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
     AND p.flash_sale_ends_at > now()
     AND NOT EXISTS (
       SELECT 1
         FROM public.flash_sale_items AS i
        WHERE i.product_id = p.id
     );

  -- Apply a discount to the current selling price, never to a higher old-price
  -- label. This prevents a new promotion from accidentally increasing a price.
  IF NOT EXISTS (
    SELECT 1
      FROM public.products AS p
     WHERE (p_category = 'ყველა' OR p.category = p_category)
       AND COALESCE(p.variants, '[]'::jsonb) = '[]'::jsonb
       AND ROUND(p.price_gel * (1 - p_discount_percent / 100), 2) < p.price_gel
  ) THEN
    RETURN jsonb_build_object('updated_count', 0, 'campaign', NULL);
  END IF;

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
    ROUND(p.price_gel * (1 - p_discount_percent / 100), 2),
    CASE WHEN p.old_price_gel > p.price_gel THEN p.old_price_gel ELSE p.price_gel END
  FROM public.products AS p
  WHERE (p_category = 'ყველა' OR p.category = p_category)
    AND COALESCE(p.variants, '[]'::jsonb) = '[]'::jsonb
    AND ROUND(p.price_gel * (1 - p_discount_percent / 100), 2) < p.price_gel;

  GET DIAGNOSTICS v_snapshot_count = ROW_COUNT;

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
