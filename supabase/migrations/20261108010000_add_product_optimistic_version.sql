-- Cross-session optimistic concurrency for all admin product mutations.
-- Staged only: reconcile the complete migration history before applying.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;

-- The storefront catalogue reads these non-sensitive revision tokens.
GRANT SELECT (updated_at, version) ON public.products TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.touch_product_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_product_updated_at ON public.products;
CREATE TRIGGER touch_product_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION private.touch_product_updated_at();


-- Product creation remains a distinct insert-only operation. Validate all
-- numeric text before casting so malformed JSON cannot abort via cast errors.
CREATE OR REPLACE FUNCTION private.admin_save_product(p_product jsonb)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_product public.products;
  v_price numeric;
  v_old_price numeric;
  v_purchase_cost numeric;
  v_stock integer;
  v_stock_text text;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to save products' USING ERRCODE = '42501';
  END IF;

  IF p_product IS NULL OR jsonb_typeof(p_product) IS DISTINCT FROM 'object'
     OR COALESCE(trim(p_product ->> 'id'), '') = ''
     OR COALESCE(trim(p_product ->> 'name'), '') = ''
     OR COALESCE(trim(p_product ->> 'category'), '') = ''
     OR COALESCE(p_product ->> 'price_gel', '') !~ '^[0-9]+(\.[0-9]{1,2})?$' THEN
    RAISE EXCEPTION 'Invalid product payload' USING ERRCODE = '22023';
  END IF;

  v_price := (p_product ->> 'price_gel')::numeric;
  IF v_price < 0 OR v_price > 1000000000 THEN
    RAISE EXCEPTION 'Invalid product price' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(p_product ->> 'old_price_gel', '') IS NOT NULL THEN
    IF (p_product ->> 'old_price_gel') !~ '^[0-9]+(\.[0-9]{1,2})?$' THEN
      RAISE EXCEPTION 'Invalid old product price' USING ERRCODE = '22023';
    END IF;
    v_old_price := (p_product ->> 'old_price_gel')::numeric;
    IF v_old_price <= v_price OR v_old_price > 1000000000 THEN
      RAISE EXCEPTION 'Invalid old product price' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NULLIF(p_product ->> 'purchase_cost', '') IS NOT NULL THEN
    IF (p_product ->> 'purchase_cost') !~ '^[0-9]+(\.[0-9]{1,2})?$' THEN
      RAISE EXCEPTION 'Invalid product purchase cost' USING ERRCODE = '22023';
    END IF;
    v_purchase_cost := (p_product ->> 'purchase_cost')::numeric;
    IF v_purchase_cost < 0 OR v_purchase_cost > 1000000000 THEN
      RAISE EXCEPTION 'Invalid product purchase cost' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_stock_text := COALESCE(NULLIF(p_product ->> 'stock', ''), '0');
  IF v_stock_text !~ '^[0-9]{1,7}$' THEN
    RAISE EXCEPTION 'Invalid product stock' USING ERRCODE = '22023';
  END IF;
  v_stock := v_stock_text::integer;
  IF v_stock > 1000000 THEN
    RAISE EXCEPTION 'Product stock is outside the supported range' USING ERRCODE = '22023';
  END IF;

  v_product := jsonb_populate_record(NULL::public.products, p_product);
  v_product.price_gel := v_price;
  v_product.old_price_gel := v_old_price;
  v_product.purchase_cost := v_purchase_cost;
  v_product.stock := v_stock;

  -- Never accept client-supplied database lifecycle/revision fields. The
  -- editor validates created_at in its response and expects a fresh version.
  v_product.created_at := pg_catalog.now();
  v_product.updated_at := pg_catalog.now();
  v_product.version := 1;
  v_product.gallery := COALESCE(v_product.gallery, '[]'::jsonb);
  v_product.variants := COALESCE(v_product.variants, '[]'::jsonb);
  v_product.tags := COALESCE(v_product.tags, '[]'::jsonb);
  v_product.available_sizes := COALESCE(v_product.available_sizes, '[]'::jsonb);
  v_product.available_colors := COALESCE(v_product.available_colors, '[]'::jsonb);
  v_product.is_featured := COALESCE(v_product.is_featured, false);

  -- Insert only: an ID collision must never overwrite an existing product.
  INSERT INTO public.products
  SELECT (v_product).*
  RETURNING * INTO v_product;

  RETURN v_product;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_product(p_product jsonb)
RETURNS public.products
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.admin_save_product(p_product);
$$;

CREATE OR REPLACE FUNCTION private.admin_update_product(
  p_product jsonb,
  p_expected_version bigint
)
RETURNS SETOF public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_patch public.products;
  v_product public.products;
  v_product_id text;
  v_price numeric;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to update products' USING ERRCODE = '42501';
  END IF;

  IF p_product IS NULL OR jsonb_typeof(p_product) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid product update payload' USING ERRCODE = '22023';
  END IF;

  v_product_id := NULLIF(trim(p_product ->> 'id'), '');
  IF v_product_id IS NULL
     OR p_expected_version IS NULL OR p_expected_version < 1
     OR NULLIF(trim(p_product ->> 'name'), '') IS NULL
     OR COALESCE(p_product ->> 'price_gel', '') !~ '^[0-9]+(\.[0-9]{1,2})?$' THEN
    RAISE EXCEPTION 'Invalid product update payload' USING ERRCODE = '22023';
  END IF;

  v_price := (p_product ->> 'price_gel')::numeric;
  IF v_price < 0 OR v_price > 1000000000 OR v_price <> round(v_price, 2) THEN
    RAISE EXCEPTION 'Product price is outside the supported GEL range' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(p_product ->> 'old_price_gel', '') IS NOT NULL
     AND CASE
       WHEN p_product ->> 'old_price_gel' ~ '^[0-9]+(\.[0-9]{1,2})?$'
         THEN (p_product ->> 'old_price_gel')::numeric <= v_price
           OR (p_product ->> 'old_price_gel')::numeric > 1000000000
       ELSE true
     END THEN
    RAISE EXCEPTION 'Invalid old product price' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(p_product ->> 'purchase_cost', '') IS NOT NULL
     AND CASE
       WHEN p_product ->> 'purchase_cost' ~ '^[0-9]+(\.[0-9]{1,2})?$'
         THEN (p_product ->> 'purchase_cost')::numeric < 0
           OR (p_product ->> 'purchase_cost')::numeric > 1000000000
       ELSE true
     END THEN
    RAISE EXCEPTION 'Invalid product purchase cost' USING ERRCODE = '22023';
  END IF;

  v_patch := jsonb_populate_record(NULL::public.products, p_product);

  UPDATE public.products AS p
     SET sku = v_patch.sku,
         name = v_patch.name,
         category = v_patch.category,
         brand = v_patch.brand,
         vendor = v_patch.vendor,
         price_gel = v_patch.price_gel,
         old_price_gel = v_patch.old_price_gel,
         purchase_cost = v_patch.purchase_cost,
         image = v_patch.image,
         description = v_patch.description,
         available_sizes = COALESCE(v_patch.available_sizes, '[]'::jsonb),
         available_colors = COALESCE(v_patch.available_colors, '[]'::jsonb),
         gallery = COALESCE(v_patch.gallery, '[]'::jsonb),
         variants = COALESCE(v_patch.variants, '[]'::jsonb),
         tags = COALESCE(v_patch.tags, '[]'::jsonb),
         material = v_patch.material,
         durability = v_patch.durability,
         model = v_patch.model,
         cpu = v_patch.cpu,
         ram = v_patch.ram,
         storage = v_patch.storage,
         gpu = v_patch.gpu,
         screen_size = v_patch.screen_size,
         os = v_patch.os,
         is_featured = COALESCE(v_patch.is_featured, false)
   WHERE p.id = v_product_id
     AND p.version = p_expected_version
  RETURNING p.* INTO v_product;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product changed in another session. Refresh and retry.' USING ERRCODE = '40001';
  END IF;

  RETURN NEXT v_product;
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_product(
  p_product jsonb,
  p_expected_version bigint
)
RETURNS SETOF public.products
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT * FROM private.admin_update_product(p_product, p_expected_version);
$$;


CREATE OR REPLACE FUNCTION private.admin_adjust_product_variant_stock(
  p_product_id text,
  p_variant_id text,
  p_delta integer,
  p_expected_version bigint
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_product public.products;
  v_variant_count integer;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to adjust product variant stock' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(trim(p_product_id), '') = ''
     OR COALESCE(trim(p_variant_id), '') = ''
     OR p_delta IS NULL OR p_delta = 0
     OR p_delta < -1000000 OR p_delta > 1000000
     OR p_expected_version IS NULL OR p_expected_version < 1 THEN
    RAISE EXCEPTION 'Invalid variant stock adjustment' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)
    INTO v_variant_count
    FROM public.products AS p
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants, '[]'::jsonb)) AS v
   WHERE p.id = p_product_id
     AND v ->> 'id' = p_variant_id;

  IF v_variant_count <> 1 THEN
    RAISE EXCEPTION 'Variant not found or duplicated' USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_catalog.set_config('geostore.variant_stock_adjustment', 'on', true);

  UPDATE public.products AS p
     SET variants = (
       SELECT jsonb_agg(
         CASE WHEN v ->> 'id' = p_variant_id
           THEN jsonb_set(v, '{stock}', to_jsonb((v ->> 'stock')::integer + p_delta), true)
           ELSE v
         END
         ORDER BY ord
       )
       FROM jsonb_array_elements(p.variants) WITH ORDINALITY AS e(v, ord)
     )
   WHERE p.id = p_product_id
     AND p.version = p_expected_version
     AND EXISTS (
       SELECT 1
         FROM jsonb_array_elements(p.variants) AS v
        WHERE v ->> 'id' = p_variant_id
          AND CASE
                WHEN COALESCE(v ->> 'stock', '') ~ '^[0-9]{1,7}$'
                  THEN (v ->> 'stock')::integer + p_delta BETWEEN 0 AND 1000000
                ELSE false
              END
     )
  RETURNING p.* INTO v_product;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product or variant changed. Refresh and retry.' USING ERRCODE = '40001';
  END IF;

  RETURN v_product;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_product_variant_stock(
  p_product_id text,
  p_variant_id text,
  p_delta integer,
  p_expected_version bigint
)
RETURNS public.products
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.admin_adjust_product_variant_stock(
    p_product_id, p_variant_id, p_delta, p_expected_version
  );
$$;


CREATE OR REPLACE FUNCTION private.admin_delete_product_if_version(
  p_product_id text,
  p_expected_version bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_deleted integer;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to delete products' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(trim(p_product_id), '') = ''
     OR p_expected_version IS NULL OR p_expected_version < 1 THEN
    RAISE EXCEPTION 'Invalid product deletion request' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.products
   WHERE id = p_product_id
     AND version = p_expected_version;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_product_if_version(
  p_product_id text,
  p_expected_version bigint
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.admin_delete_product_if_version(p_product_id, p_expected_version);
$$;


-- Expose implementation calls only to authenticated sessions; each function
-- still verifies the exact primary-admin UUID and app_metadata role.
REVOKE ALL ON FUNCTION private.admin_save_product(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_save_product(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_save_product(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_product(jsonb) TO authenticated;

REVOKE ALL ON FUNCTION private.touch_product_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.admin_update_product(jsonb, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_product(jsonb, bigint) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.admin_update_product(jsonb, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_product(jsonb, bigint) TO authenticated;

REVOKE ALL ON FUNCTION private.admin_adjust_product_variant_stock(text, text, integer, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_adjust_product_variant_stock(text, text, integer, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_adjust_product_variant_stock(text, text, integer, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_product_variant_stock(text, text, integer, bigint) TO authenticated;

REVOKE ALL ON FUNCTION private.admin_delete_product_if_version(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_product_if_version(text, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_delete_product_if_version(text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_product_if_version(text, bigint) TO authenticated;

-- Retire legacy unversioned mutation endpoints so old clients cannot bypass
-- the version-checked operations.
REVOKE ALL ON FUNCTION public.admin_delete_product(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.admin_delete_product(text) FROM PUBLIC, anon, authenticated;
