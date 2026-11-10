-- Allow the admin to adjust existing non-size/color product variant stock
-- without permitting ordinary product edits to overwrite checkout deductions.
CREATE OR REPLACE FUNCTION private.admin_set_product_custom_variant_stocks(
  p_product_id text,
  p_variant_stocks jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_variants jsonb;
  v_total_stock integer;
BEGIN
  IF auth.uid() IS NULL
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  END IF;

  IF coalesce(trim(p_product_id), '') = ''
     OR p_variant_stocks IS NULL
     OR jsonb_typeof(p_variant_stocks) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_variant_stocks) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'ინდივიდუალური ვარიანტების მარაგის მონაცემები არასწორია.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_variant_stocks) AS entry(item)
     WHERE jsonb_typeof(entry.item) IS DISTINCT FROM 'object'
        OR coalesce(trim(entry.item->>'id'), '') = ''
        OR length(entry.item->>'id') > 120
        OR coalesce(entry.item->>'stock', '') !~ '^[0-9]{1,7}$'
        OR (entry.item->>'stock')::integer NOT BETWEEN 0 AND 1000000
  ) THEN
    RAISE EXCEPTION 'ინდივიდუალური ვარიანტის მარაგი უნდა იყოს მთელი რიცხვი 0-დან 1,000,000-მდე.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_variant_stocks) AS entry(item)
     GROUP BY entry.item->>'id'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ინდივიდუალური ვარიანტების ID დუბლირებულია.';
  END IF;

  SELECT variants
    INTO v_variants
    FROM public.products
   WHERE id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'პროდუქტი ვერ მოიძებნა.';
  END IF;
  IF jsonb_typeof(coalesce(v_variants, '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტების მონაცემები არასწორია.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_variant_stocks) AS requested(item)
     WHERE NOT EXISTS (
       SELECT 1
         FROM jsonb_array_elements(coalesce(v_variants, '[]'::jsonb)) AS current_variant(item)
        WHERE current_variant.item->>'id' = requested.item->>'id'
          AND coalesce(current_variant.item->>'variantType', 'custom') <> 'size_color'
     )
  ) THEN
    RAISE EXCEPTION 'მარაგის ID პროდუქტში არსებულ ინდივიდუალურ ვარიანტს არ ემთხვევა.';
  END IF;

  PERFORM set_config('geostore.variant_stock_adjustment', 'on', true);

  UPDATE public.products AS p
     SET variants = (
       SELECT jsonb_agg(
         CASE
           WHEN patch.stock_value IS NOT NULL
             THEN jsonb_set(variant.value, '{stock}', patch.stock_value, true)
           ELSE variant.value
         END
         ORDER BY variant.ordinality
       )
         FROM jsonb_array_elements(coalesce(p.variants, '[]'::jsonb))
           WITH ORDINALITY AS variant(value, ordinality)
         LEFT JOIN LATERAL (
           SELECT requested.item->'stock' AS stock_value
             FROM jsonb_array_elements(p_variant_stocks) AS requested(item)
            WHERE requested.item->>'id' = variant.value->>'id'
            LIMIT 1
         ) AS patch ON true
     )
   WHERE p.id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ინდივიდუალური ვარიანტის მარაგის შენახვა ვერ მოხერხდა.';
  END IF;

  SELECT coalesce(sum((entry.item->>'stock')::integer), 0)::integer
    INTO v_total_stock
    FROM public.products AS p
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) AS entry(item)
   WHERE p.id = p_product_id;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'updated', jsonb_array_length(p_variant_stocks),
    'stock', v_total_stock
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_product_custom_variant_stocks(
  p_product_id text,
  p_variant_stocks jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.admin_set_product_custom_variant_stocks(p_product_id, p_variant_stocks);
$function$;

REVOKE ALL ON FUNCTION private.admin_set_product_custom_variant_stocks(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_set_product_custom_variant_stocks(text, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_product_custom_variant_stocks(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_product_custom_variant_stocks(text, jsonb) TO authenticated, service_role;

-- The parent product stock is an aggregate display value for every variant
-- model. Checkout and admin variant edits both pass through this trigger.
CREATE OR REPLACE FUNCTION private.sync_size_color_aggregate_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF jsonb_typeof(coalesce(NEW.variants, '[]'::jsonb)) = 'array'
     AND jsonb_array_length(coalesce(NEW.variants, '[]'::jsonb)) > 0 THEN
    SELECT coalesce(sum((variant.item->>'stock')::integer), 0)::integer
      INTO NEW.stock
      FROM jsonb_array_elements(coalesce(NEW.variants, '[]'::jsonb)) AS variant(item);
  END IF;
  RETURN NEW;
END;
$function$;
