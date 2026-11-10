-- Apply size/color and custom-variant stock edits as one transaction.
-- If either batch fails validation or update, PostgreSQL rolls back both batches.
CREATE OR REPLACE FUNCTION private.admin_set_product_variant_stock_batches(
  p_product_id text,
  p_size_color_stocks jsonb,
  p_custom_variant_stocks jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_size_result jsonb := NULL;
  v_custom_result jsonb := NULL;
  v_size_count integer := 0;
  v_custom_count integer := 0;
BEGIN
  IF auth.uid() IS NULL
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  END IF;

  IF coalesce(trim(p_product_id), '') = '' THEN
    RAISE EXCEPTION 'პროდუქტის ID არასწორია.';
  END IF;

  IF p_size_color_stocks IS NOT NULL
     AND jsonb_typeof(p_size_color_stocks) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'ზომისა და ფერის მარაგის სია არასწორია.';
  END IF;
  IF p_custom_variant_stocks IS NOT NULL
     AND jsonb_typeof(p_custom_variant_stocks) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'ინდივიდუალური ვარიანტების მარაგის სია არასწორია.';
  END IF;

  v_size_count := coalesce(jsonb_array_length(p_size_color_stocks), 0);
  v_custom_count := coalesce(jsonb_array_length(p_custom_variant_stocks), 0);

  IF v_size_count = 0 AND v_custom_count = 0 THEN
    RAISE EXCEPTION 'მარაგის შესაცვლელი ვარიანტები მითითებული არ არის.';
  END IF;

  -- Each existing routine validates IDs, values, authorization, and locks
  -- the same product row. Both execute in this outer RPC transaction.
  IF v_size_count > 0 THEN
    v_size_result := private.admin_set_product_variant_stocks(
      p_product_id,
      p_size_color_stocks
    );
  END IF;

  IF v_custom_count > 0 THEN
    v_custom_result := private.admin_set_product_custom_variant_stocks(
      p_product_id,
      p_custom_variant_stocks
    );
  END IF;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'size_color', v_size_result,
    'custom', v_custom_result
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_product_variant_stock_batches(
  p_product_id text,
  p_size_color_stocks jsonb,
  p_custom_variant_stocks jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.admin_set_product_variant_stock_batches(
    p_product_id,
    p_size_color_stocks,
    p_custom_variant_stocks
  );
$function$;

REVOKE ALL ON FUNCTION private.admin_set_product_variant_stock_batches(text, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.admin_set_product_variant_stock_batches(text, jsonb, jsonb)
  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_product_variant_stock_batches(text, jsonb, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_product_variant_stock_batches(text, jsonb, jsonb)
  TO authenticated, service_role;
