-- Persistent, server-timed flash-sale campaigns with safe price restoration.
-- Product prices are restored only when they still match the exact values written
-- by this campaign, so later manual price edits are never overwritten.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE TABLE IF NOT EXISTS public.flash_sale_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  discount_percent numeric(5,2) NOT NULL
    CHECK (discount_percent > 0 AND discount_percent < 100),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'replaced')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flash_sale_campaign_valid_window CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS flash_sale_campaigns_active_end_idx
  ON public.flash_sale_campaigns (ends_at)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.flash_sale_items (
  campaign_id uuid NOT NULL REFERENCES public.flash_sale_campaigns(id) ON DELETE RESTRICT,
  product_id text NOT NULL,
  original_price_gel numeric NOT NULL,
  original_old_price_gel numeric,
  sale_price_gel numeric NOT NULL,
  sale_old_price_gel numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, product_id)
);

ALTER TABLE public.flash_sale_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flash_sale_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.flash_sale_campaigns FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.flash_sale_items FROM PUBLIC, anon, authenticated;

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

  RETURN v_expired;
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

  IF p_duration_minutes NOT IN (15, 30, 60, 180, 360, 720, 1440) THEN
    RAISE EXCEPTION 'Flash-sale duration must be one of the supported minute values'
      USING ERRCODE = '22023';
  END IF;

  -- Lock eligible rows while the campaign snapshot and sale prices are written.
  PERFORM p.id
    FROM public.products AS p
   WHERE (p_category = 'ყველა' OR p.category = p_category)
     AND COALESCE(p.variants, '[]'::jsonb) = '[]'::jsonb
   FOR UPDATE;

  -- Do not interrupt a currently running campaign if the requested selection
  -- contains no products that can receive a real rounded discount.
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

  -- Only one campaign is displayed at a time. Restore the previous campaign
  -- before taking the new campaign's original-price snapshots.
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
    campaign_id,
    product_id,
    original_price_gel,
    original_old_price_gel,
    sale_price_gel,
    sale_old_price_gel
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

  v_updated := private.admin_apply_flash_sale(p_discount_percent, trim(p_category));

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

CREATE OR REPLACE FUNCTION public.admin_create_flash_sale(
  p_discount_percent numeric,
  p_category text,
  p_duration_minutes integer
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT private.admin_create_flash_sale(
    p_discount_percent,
    p_category,
    p_duration_minutes
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_active_flash_sale()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_expired_count integer := 0;
  v_campaign jsonb := NULL;
BEGIN
  v_expired_count := private.expire_flash_sales();

  SELECT jsonb_build_object(
    'id', c.id,
    'category', c.category,
    'discount_percent', c.discount_percent,
    'starts_at', c.starts_at,
    'ends_at', c.ends_at,
    'product_ids', COALESCE(
      (SELECT jsonb_agg(i.product_id ORDER BY i.product_id)
         FROM public.flash_sale_items AS i
        WHERE i.campaign_id = c.id),
      '[]'::jsonb
    )
  )
    INTO v_campaign
    FROM public.flash_sale_campaigns AS c
   WHERE c.status = 'active'
     AND c.starts_at <= now()
     AND c.ends_at > now()
   ORDER BY c.created_at DESC
   LIMIT 1;

  RETURN jsonb_build_object(
    'campaign', v_campaign,
    'expired_count', v_expired_count
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.restore_flash_sale_campaign(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.expire_flash_sales() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.admin_create_flash_sale(numeric, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_create_flash_sale(numeric, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_active_flash_sale() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_flash_sale(numeric, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_flash_sale() TO anon, authenticated;

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
