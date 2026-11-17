-- GEOSTORE Stage 93: private per-product/per-variant replenishment targets.
-- Draft PR only. This migration is NOT applied to the live Supabase project.
CREATE TABLE IF NOT EXISTS private.inventory_replenishment_settings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id text NOT NULL,
  variant_id text,
  product_name text NOT NULL,
  variant_name text,
  low_stock_threshold integer NOT NULL DEFAULT 5
    CHECK (low_stock_threshold BETWEEN 0 AND 100000),
  target_stock integer NOT NULL DEFAULT 20
    CHECK (target_stock BETWEEN 1 AND 1000000),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT inventory_replenishment_target_gt_threshold
    CHECK (target_stock > low_stock_threshold)
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_replenishment_position_uidx
  ON private.inventory_replenishment_settings (product_id, (coalesce(variant_id, '')));

ALTER TABLE private.inventory_replenishment_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.inventory_replenishment_settings FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.list_inventory_replenishment_settings(p_limit integer DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 1000);
  v_items jsonb;
  v_has_more boolean;
BEGIN
  IF auth.uid() IS NULL
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.'
      USING ERRCODE = '42501';
  END IF;

  WITH page AS (
    SELECT s.*
      FROM private.inventory_replenishment_settings AS s
     ORDER BY s.product_id, coalesce(s.variant_id, '')
     LIMIT v_limit + 1
  )
  SELECT
    coalesce(jsonb_agg(to_jsonb(items) ORDER BY items.product_id, coalesce(items.variant_id, ''))
      FILTER (WHERE items.row_number <= v_limit), '[]'::jsonb),
    count(*) > v_limit
    INTO v_items, v_has_more
    FROM (
      SELECT page.*, row_number() OVER (ORDER BY product_id, coalesce(variant_id, '')) AS row_number
        FROM page
    ) AS items;

  RETURN jsonb_build_object('items', v_items, 'has_more', v_has_more);
END;
$function$;

REVOKE ALL ON FUNCTION private.list_inventory_replenishment_settings(integer)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.save_inventory_replenishment_setting(
  p_product_id text,
  p_variant_id text,
  p_low_stock_threshold integer,
  p_target_stock integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_product public.products%ROWTYPE;
  v_variant_name text;
  v_saved private.inventory_replenishment_settings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.'
      USING ERRCODE = '42501';
  END IF;

  IF coalesce(trim(p_product_id), '') = ''
     OR p_variant_id IS NOT NULL AND trim(p_variant_id) = ''
     OR p_low_stock_threshold IS NULL
     OR p_low_stock_threshold < 0 OR p_low_stock_threshold > 100000
     OR p_target_stock IS NULL
     OR p_target_stock <= p_low_stock_threshold OR p_target_stock > 1000000 THEN
    RAISE EXCEPTION 'მარაგის ზღვარი ან სამიზნე რაოდენობა არასწორია.'
      USING ERRCODE = '22023';
  END IF;

  -- Lock the product so a concurrent product/variant edit cannot invalidate
  -- the variant identity between validation and settings persistence.
  SELECT p.* INTO v_product
    FROM public.products AS p
   WHERE p.id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'პროდუქტი ვერ მოიძებნა.'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT coalesce(nullif(v.item->>'name', ''), nullif(v.item->>'label', ''))
      INTO v_variant_name
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(coalesce(v_product.variants, '[]'::jsonb)) = 'array'
          THEN coalesce(v_product.variants, '[]'::jsonb) ELSE '[]'::jsonb END
      ) AS v(item)
     WHERE v.item->>'id' = p_variant_id
     LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'პროდუქტის მითითებული ვარიანტი აღარ არსებობს.'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- A single UPSERT makes first-time saves safe under concurrent requests.
  -- The expression target matches the unique index for both base and variant rows.
  INSERT INTO private.inventory_replenishment_settings (
    product_id, variant_id, product_name, variant_name,
    low_stock_threshold, target_stock, updated_by
  ) VALUES (
    p_product_id, p_variant_id, coalesce(v_product.name, p_product_id), v_variant_name,
    p_low_stock_threshold, p_target_stock, auth.uid()
  )
  ON CONFLICT (product_id, (coalesce(variant_id, '')))
  DO UPDATE SET
    product_name = EXCLUDED.product_name,
    variant_name = EXCLUDED.variant_name,
    low_stock_threshold = EXCLUDED.low_stock_threshold,
    target_stock = EXCLUDED.target_stock,
    updated_by = EXCLUDED.updated_by,
    updated_at = clock_timestamp()
  RETURNING * INTO v_saved;

  RETURN jsonb_build_object('success', true, 'setting', to_jsonb(v_saved));
END;
$function$;

REVOKE ALL ON FUNCTION private.save_inventory_replenishment_setting(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_inventory_replenishment_settings(p_limit integer DEFAULT 500)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT private.list_inventory_replenishment_settings(p_limit);
$function$;

CREATE OR REPLACE FUNCTION public.admin_save_inventory_replenishment_setting(
  p_product_id text,
  p_variant_id text,
  p_low_stock_threshold integer,
  p_target_stock integer
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT private.save_inventory_replenishment_setting(
    p_product_id, p_variant_id, p_low_stock_threshold, p_target_stock
  );
$function$;

REVOKE ALL ON FUNCTION public.admin_list_inventory_replenishment_settings(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_save_inventory_replenishment_setting(text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_inventory_replenishment_settings(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_inventory_replenishment_setting(text, text, integer, integer) TO authenticated;
