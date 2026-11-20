-- Additive optimistic-concurrency RPC; the existing four-argument API remains unchanged.
-- Deploy this migration before deploying the client that calls the five-argument RPC.
-- IMPORTANT: The legacy four-argument public RPC still permits last-write-wins saves.
-- Once all clients use the versioned RPC, revoke EXECUTE on the legacy four-argument
-- public RPC in a separate coordinated rollout. Do not revoke it while old Production
-- clients still depend on it; until then this is a client-side conflict safeguard only.
BEGIN;

CREATE OR REPLACE FUNCTION private.save_inventory_replenishment_setting(
  p_product_id text, p_variant_id text, p_low_stock_threshold integer,
  p_target_stock integer, p_expected_updated_at timestamptz
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_product public.products%ROWTYPE;
  v_variant_name text;
  v_existing private.inventory_replenishment_settings%ROWTYPE;
  v_saved private.inventory_replenishment_settings%ROWTYPE;
BEGIN
  IF NOT public.has_staff_permission('products') THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.' USING ERRCODE = '42501';
  END IF;
  IF coalesce(trim(p_product_id), '') = ''
     OR (p_variant_id IS NOT NULL AND trim(p_variant_id) = '')
     OR p_low_stock_threshold IS NULL OR p_low_stock_threshold NOT BETWEEN 0 AND 100000
     OR p_target_stock IS NULL OR p_target_stock <= p_low_stock_threshold OR p_target_stock > 1000000 THEN
    RAISE EXCEPTION 'მარაგის ზღვარი ან სამიზნე რაოდენობა არასწორია.' USING ERRCODE = '22023';
  END IF;

  -- Serializes edits to the same product, including first-time setting creation.
  SELECT p.* INTO v_product FROM public.products AS p
    WHERE p.id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'პროდუქტი ვერ მოიძებნა.' USING ERRCODE = 'P0002';
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT coalesce(nullif(v.item->>'name', ''), nullif(v.item->>'label', ''))
      INTO v_variant_name
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(coalesce(v_product.variants, '[]'::jsonb)) = 'array'
          THEN coalesce(v_product.variants, '[]'::jsonb) ELSE '[]'::jsonb END
      ) AS v(item)
     WHERE v.item->>'id' = p_variant_id LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'პროდუქტის მითითებული ვარიანტი აღარ არსებობს.' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT s.* INTO v_existing
    FROM private.inventory_replenishment_settings AS s
   WHERE s.product_id = p_product_id
     AND coalesce(s.variant_id, '') = coalesce(p_variant_id, '')
   FOR UPDATE;

  -- NULL means the client saw no saved row; a timestamp means it saw exactly that version.
  IF FOUND THEN
    IF p_expected_updated_at IS NULL
       OR v_existing.updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RAISE EXCEPTION 'მარაგის პარამეტრები სხვა მოწყობილობიდან შეიცვალა. განაახლეთ მონაცემები.'
        USING ERRCODE = '40001';
    END IF;
    UPDATE private.inventory_replenishment_settings AS s SET
      product_name = coalesce(v_product.name, p_product_id),
      variant_name = v_variant_name,
      low_stock_threshold = p_low_stock_threshold,
      target_stock = p_target_stock,
      updated_by = auth.uid(),
      updated_at = greatest(clock_timestamp(), v_existing.updated_at + interval '1 microsecond')
    WHERE s.id = v_existing.id RETURNING * INTO v_saved;
  ELSE
    IF p_expected_updated_at IS NOT NULL THEN
      RAISE EXCEPTION 'მარაგის პარამეტრები სხვა მოწყობილობიდან შეიცვალა. განაახლეთ მონაცემები.'
        USING ERRCODE = '40001';
    END IF;
    INSERT INTO private.inventory_replenishment_settings (
      product_id, variant_id, product_name, variant_name,
      low_stock_threshold, target_stock, updated_by
    ) VALUES (
      p_product_id, p_variant_id, coalesce(v_product.name, p_product_id), v_variant_name,
      p_low_stock_threshold, p_target_stock, auth.uid()
    ) RETURNING * INTO v_saved;
  END IF;
  RETURN jsonb_build_object('success', true, 'setting', to_jsonb(v_saved));
END;
$function$;

REVOKE ALL ON FUNCTION private.save_inventory_replenishment_setting(text,text,integer,integer,timestamptz) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.save_inventory_replenishment_setting(text,text,integer,integer,timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_save_inventory_replenishment_setting(
  p_product_id text, p_variant_id text, p_low_stock_threshold integer,
  p_target_stock integer, p_expected_updated_at timestamptz
)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $function$
  SELECT private.save_inventory_replenishment_setting(
    p_product_id, p_variant_id, p_low_stock_threshold, p_target_stock, p_expected_updated_at
  );
$function$;
REVOKE ALL ON FUNCTION public.admin_save_inventory_replenishment_setting(text,text,integer,integer,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_inventory_replenishment_setting(text,text,integer,integer,timestamptz) TO authenticated;
-- New RPC overloads must be visible to PostgREST before the client uses them.
NOTIFY pgrst, 'reload schema';
COMMIT;
