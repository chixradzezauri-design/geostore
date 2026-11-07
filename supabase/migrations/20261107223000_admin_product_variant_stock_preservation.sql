-- Preserve live inventory when an administrator edits product metadata or variants.
-- Variant removals are blocked while an active order still references the variant.
-- This migration is staged on the design branch; do not apply until live migration history is reconciled.

CREATE OR REPLACE FUNCTION private.admin_update_product(p_product jsonb)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_existing public.products;
  v_product public.products;
  v_merged_variants jsonb;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to update products' USING ERRCODE = '42501';
  END IF;

  IF p_product IS NULL OR jsonb_typeof(p_product) IS DISTINCT FROM 'object'
     OR NULLIF(trim(p_product ->> 'id'), '') IS NULL
     OR NULLIF(trim(p_product ->> 'name'), '') IS NULL THEN
    RAISE EXCEPTION 'Invalid product payload' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing
    FROM public.products
   WHERE id = p_product ->> 'id'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  v_product := jsonb_populate_record(v_existing, p_product);

  IF v_product.price_gel IS NULL OR v_product.price_gel < 0 THEN
    RAISE EXCEPTION 'Invalid product price' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_product.variants) IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_product.variants) > 50 THEN
    RAISE EXCEPTION 'Invalid product variants' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(v_product.variants) AS e(item)
     WHERE jsonb_typeof(item) IS DISTINCT FROM 'object'
        OR NULLIF(trim(item ->> 'id'), '') IS NULL
        OR length(trim(item ->> 'id')) > 80
        OR NULLIF(trim(item ->> 'name'), '') IS NULL
        OR length(trim(item ->> 'name')) > 80
        OR coalesce(item ->> 'priceGEL', item ->> 'price_gel', '') !~ '^[0-9]+([.][0-9]{1,2})?$'
        OR coalesce(item ->> 'stock', '') !~ '^[0-9]{1,7}$'
        OR CASE
             WHEN coalesce(item ->> 'stock', '') ~ '^[0-9]{1,7}$'
               THEN (item ->> 'stock')::integer > 1000000
             ELSE TRUE
           END
  ) THEN
    RAISE EXCEPTION 'Invalid product variant data' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT item ->> 'id'
      FROM jsonb_array_elements(v_product.variants) AS e(item)
     GROUP BY item ->> 'id'
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT lower(trim(item ->> 'name'))
      FROM jsonb_array_elements(v_product.variants) AS e(item)
     GROUP BY lower(trim(item ->> 'name'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate product variant identity' USING ERRCODE = '22023';
  END IF;

  -- Do not remove a variant while a non-terminal order still needs its stock
  -- to be restored if that order is cancelled.
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(v_existing.variants) = 'array'
          THEN v_existing.variants ELSE '[]'::jsonb END
      ) AS old_variant(item)
     WHERE NOT EXISTS (
       SELECT 1
         FROM jsonb_array_elements(v_product.variants) AS new_variant(item)
        WHERE new_variant.item ->> 'id' = old_variant.item ->> 'id'
     )
       AND EXISTS (
         SELECT 1
           FROM public.orders AS o
           CROSS JOIN LATERAL jsonb_array_elements(
             CASE WHEN jsonb_typeof(o.items) = 'array'
               THEN o.items ELSE '[]'::jsonb END
           ) AS order_line(item)
          WHERE order_line.item ->> 'id' = v_existing.id
            AND coalesce(order_line.item ->> 'customVariantId',
                         order_line.item ->> 'custom_variant_id') = old_variant.item ->> 'id'
            AND lower(trim(coalesce(o.status, ''))) NOT IN (
              'გაუქმებული', 'დასრულებული', 'ჩაბარებულია',
              'cancelled', 'canceled', 'completed', 'delivered',
              'отменён', 'отменен', 'завершён', 'завершен', 'доставлен'
            )
       )
  ) THEN
    RAISE EXCEPTION 'Cannot remove a variant referenced by an active order' USING ERRCODE = '23503';
  END IF;

  -- Preserve current stock for all existing variant IDs. New variants keep
  -- their initial stock from the submitted editor form.
  SELECT coalesce(
    jsonb_agg(
      CASE
        WHEN old_variant.item IS NULL THEN new_variant.item
        ELSE jsonb_set(
          new_variant.item,
          '{stock}',
          CASE
            WHEN jsonb_typeof(old_variant.item -> 'stock') = 'number'
              THEN old_variant.item -> 'stock'
            ELSE '0'::jsonb
          END,
          true
        )
      END
      ORDER BY new_variant.ordinal
    ),
    '[]'::jsonb
  )
    INTO v_merged_variants
    FROM jsonb_array_elements(v_product.variants)
      WITH ORDINALITY AS new_variant(item, ordinal)
    LEFT JOIN jsonb_array_elements(
      CASE WHEN jsonb_typeof(v_existing.variants) = 'array'
        THEN v_existing.variants ELSE '[]'::jsonb END
    ) AS old_variant(item)
      ON old_variant.item ->> 'id' = new_variant.item ->> 'id';

  UPDATE public.products
     SET sku = v_product.sku,
         name = v_product.name,
         category = v_product.category,
         brand = v_product.brand,
         vendor = v_product.vendor,
         price_gel = v_product.price_gel,
         old_price_gel = v_product.old_price_gel,
         image = v_product.image,
         description = v_product.description,
         available_sizes = v_product.available_sizes,
         available_colors = v_product.available_colors,
         material = v_product.material,
         durability = v_product.durability,
         purchase_cost = v_product.purchase_cost,
         gallery = v_product.gallery,
         variants = v_merged_variants,
         tags = v_product.tags,
         model = v_product.model,
         cpu = v_product.cpu,
         ram = v_product.ram,
         storage = v_product.storage,
         gpu = v_product.gpu,
         screen_size = v_product.screen_size,
         os = v_product.os,
         is_featured = v_product.is_featured
   WHERE id = v_existing.id
   RETURNING * INTO v_product;

  RETURN v_product;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_product(p_product jsonb)
RETURNS public.products
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.admin_update_product(p_product);
$$;

REVOKE ALL ON FUNCTION private.admin_update_product(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_product(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_product(jsonb) TO authenticated;
