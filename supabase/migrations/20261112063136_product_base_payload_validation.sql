-- Validate product fields at the trusted server boundary.
-- Limits mirror the existing admin form; no existing product rows are rewritten.
CREATE OR REPLACE FUNCTION private.validate_product_base_payload(p_product jsonb)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_text text;
BEGIN
  IF p_product IS NULL OR jsonb_typeof(p_product) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'პროდუქტის მონაცემების ფორმატი არასწორია.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_product -> 'id') IS DISTINCT FROM 'string'
     OR coalesce(trim(p_product ->> 'id'), '') = ''
     OR char_length(p_product ->> 'id') > 120
     OR jsonb_typeof(p_product -> 'name') IS DISTINCT FROM 'string'
     OR coalesce(trim(p_product ->> 'name'), '') = ''
     OR char_length(p_product ->> 'name') > 160
     OR jsonb_typeof(p_product -> 'category') IS DISTINCT FROM 'string'
     OR coalesce(trim(p_product ->> 'category'), '') = ''
     OR char_length(p_product ->> 'category') > 80 THEN
    RAISE EXCEPTION 'პროდუქტის ID, დასახელება ან კატეგორია არასწორია.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_product -> 'price_gel') IS DISTINCT FROM 'number' THEN
    RAISE EXCEPTION 'პროდუქტის ფასი უნდა იყოს რიცხვი.' USING ERRCODE = '22023';
  END IF;
  v_text := p_product ->> 'price_gel';
  IF v_text !~ '^[0-9]{1,10}([.][0-9]{1,2})?$'
     OR v_text::numeric > 1000000000 THEN
    RAISE EXCEPTION 'პროდუქტის ფასი უნდა იყოს 0-დან 1,000,000,000-მდე და მაქსიმუმ 2 ათწილადი ნიშნით.' USING ERRCODE = '22023';
  END IF;

  IF p_product ? 'old_price_gel'
     AND p_product -> 'old_price_gel' <> 'null'::jsonb THEN
    IF jsonb_typeof(p_product -> 'old_price_gel') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'ძველი ფასი არასწორია.' USING ERRCODE = '22023';
    END IF;
    v_text := p_product ->> 'old_price_gel';
    IF v_text !~ '^[0-9]{1,10}([.][0-9]{1,2})?$'
       OR v_text::numeric > 1000000000
       OR v_text::numeric <= (p_product ->> 'price_gel')::numeric THEN
      RAISE EXCEPTION 'ძველი ფასი მიმდინარე ფასზე მეტი უნდა იყოს და არ უნდა აღემატებოდეს 1,000,000,000-ს.' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_product ? 'purchase_cost'
     AND p_product -> 'purchase_cost' <> 'null'::jsonb THEN
    IF jsonb_typeof(p_product -> 'purchase_cost') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'თვითღირებულება არასწორია.' USING ERRCODE = '22023';
    END IF;
    v_text := p_product ->> 'purchase_cost';
    IF v_text !~ '^[0-9]{1,10}([.][0-9]{1,2})?$'
       OR v_text::numeric > 1000000000 THEN
      RAISE EXCEPTION 'თვითღირებულება უნდა იყოს 0-დან 1,000,000,000-მდე და მაქსიმუმ 2 ათწილადი ნიშნით.' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_product ? 'stock'
     AND p_product -> 'stock' <> 'null'::jsonb THEN
    IF jsonb_typeof(p_product -> 'stock') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'პროდუქტის მარაგი არასწორია.' USING ERRCODE = '22023';
    END IF;
    v_text := p_product ->> 'stock';
    IF v_text !~ '^[0-9]{1,7}$'
       OR v_text::numeric > 1000000 THEN
      RAISE EXCEPTION 'პროდუქტის მარაგი უნდა იყოს მთელი რიცხვი 0-დან 1,000,000-მდე.' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Validate optional text columns without inventing limits for fields whose
  -- current UI does not define one.
  IF EXISTS (
    SELECT 1
      FROM (VALUES
        ('sku'), ('brand'), ('vendor'), ('description'), ('material'),
        ('durability'), ('model'), ('cpu'), ('ram'), ('storage'),
        ('gpu'), ('screen_size'), ('os'), ('image')
      ) AS field(key)
     WHERE p_product ? field.key
       AND p_product -> field.key <> 'null'::jsonb
       AND jsonb_typeof(p_product -> field.key) IS DISTINCT FROM 'string'
  ) THEN
    RAISE EXCEPTION 'პროდუქტის ტექსტური ველის ფორმატი არასწორია.' USING ERRCODE = '22023';
  END IF;

  IF p_product ? 'description'
     AND char_length(coalesce(p_product ->> 'description', '')) > 5000 THEN
    RAISE EXCEPTION 'პროდუქტის აღწერა მაქსიმუმ 5000 სიმბოლოს უნდა შეიცავდეს.' USING ERRCODE = '22023';
  END IF;
  IF p_product ? 'material'
     AND p_product -> 'material' <> 'null'::jsonb
     AND char_length(p_product ->> 'material') > 160 THEN
    RAISE EXCEPTION 'მასალის ველი მაქსიმუმ 160 სიმბოლოს უნდა შეიცავდეს.' USING ERRCODE = '22023';
  END IF;
  IF p_product ? 'durability'
     AND p_product -> 'durability' <> 'null'::jsonb
     AND char_length(p_product ->> 'durability') > 240 THEN
    RAISE EXCEPTION 'მახასიათებლის ველი მაქსიმუმ 240 სიმბოლოს უნდა შეიცავდეს.' USING ERRCODE = '22023';
  END IF;
  IF p_product ? 'model'
     AND p_product -> 'model' <> 'null'::jsonb
     AND char_length(p_product ->> 'model') > 120 THEN
    RAISE EXCEPTION 'მოდელის ველი მაქსიმუმ 120 სიმბოლოს უნდა შეიცავდეს.' USING ERRCODE = '22023';
  END IF;
  IF p_product ? 'gpu'
     AND p_product -> 'gpu' <> 'null'::jsonb
     AND char_length(p_product ->> 'gpu') > 120 THEN
    RAISE EXCEPTION 'GPU ველი მაქსიმუმ 120 სიმბოლოს უნდა შეიცავდეს.' USING ERRCODE = '22023';
  END IF;
  IF p_product ? 'screen_size'
     AND p_product -> 'screen_size' <> 'null'::jsonb
     AND char_length(p_product ->> 'screen_size') > 40 THEN
    RAISE EXCEPTION 'ეკრანის ზომის ველი მაქსიმუმ 40 სიმბოლოს უნდა შეიცავდეს.' USING ERRCODE = '22023';
  END IF;
  IF p_product ? 'os'
     AND p_product -> 'os' <> 'null'::jsonb
     AND char_length(p_product ->> 'os') > 80 THEN
    RAISE EXCEPTION 'ოპერაციული სისტემის ველი მაქსიმუმ 80 სიმბოლოს უნდა შეიცავდეს.' USING ERRCODE = '22023';
  END IF;

  IF p_product ? 'is_featured'
     AND jsonb_typeof(p_product -> 'is_featured') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'პროდუქტის გამორჩეული სტატუსი არასწორია.' USING ERRCODE = '22023';
  END IF;
  IF p_product ? 'is_published'
     AND jsonb_typeof(p_product -> 'is_published') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'პროდუქტის გამოქვეყნების სტატუსი არასწორია.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_product -> 'tags') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'პროდუქტის ტეგების ფორმატი არასწორია.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_product -> 'tags') > 30 THEN
    RAISE EXCEPTION 'პროდუქტს შეიძლება ჰქონდეს მაქსიმუმ 30 ტეგი.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_product -> 'tags') AS entry(value)
     WHERE jsonb_typeof(entry.value) IS DISTINCT FROM 'string'
        OR char_length(btrim(entry.value #>> '{}')) NOT BETWEEN 1 AND 40
  ) THEN
    RAISE EXCEPTION 'თითოეული ტეგი უნდა იყოს 1-40 სიმბოლოს სიგრძის ტექსტი.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_product -> 'tags') AS entry(value)
     GROUP BY lower(btrim(entry.value #>> '{}'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'პროდუქტის ტეგები დუბლირებული არ უნდა იყოს.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_product -> 'available_sizes') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_product -> 'available_colors') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'ზომებისა და ფერების სიის ფორმატი არასწორია.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_product -> 'available_sizes') > 30
     OR jsonb_array_length(p_product -> 'available_colors') > 30 THEN
    RAISE EXCEPTION 'ზომებისა და ფერების სიაში მაქსიმუმ 30 ჩანაწერია დაშვებული.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_product -> 'available_sizes') AS entry(value)
     WHERE jsonb_typeof(entry.value) IS DISTINCT FROM 'string'
        OR char_length(btrim(entry.value #>> '{}')) NOT BETWEEN 1 AND 40
  ) OR EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_product -> 'available_colors') AS entry(value)
     WHERE jsonb_typeof(entry.value) IS DISTINCT FROM 'string'
        OR char_length(btrim(entry.value #>> '{}')) NOT BETWEEN 1 AND 40
  ) THEN
    RAISE EXCEPTION 'ზომა და ფერი უნდა იყოს 1-40 სიმბოლოს სიგრძის ტექსტი.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_product -> 'available_sizes') AS entry(value)
     GROUP BY lower(btrim(entry.value #>> '{}'))
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_product -> 'available_colors') AS entry(value)
     GROUP BY lower(btrim(entry.value #>> '{}'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ზომებისა და ფერების სიაში დუბლირებული მნიშვნელობა დაუშვებელია.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_product -> 'gallery') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'პროდუქტის გალერეის ფორმატი არასწორია.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_product -> 'gallery') NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'პროდუქტის გალერეაში საჭიროა 1-დან 10 ფოტომდე.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_product -> 'gallery') AS entry(value)
     WHERE jsonb_typeof(entry.value) IS DISTINCT FROM 'string'
        OR char_length(btrim(entry.value #>> '{}')) NOT BETWEEN 1 AND 2048
  ) THEN
    RAISE EXCEPTION 'გალერეის თითოეული ფოტო უნდა იყოს 1-2048 სიმბოლოს სიგრძის ბმული.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_product -> 'image') IS DISTINCT FROM 'string'
     OR coalesce(trim(p_product ->> 'image'), '') = ''
     OR char_length(p_product ->> 'image') > 2048 THEN
    RAISE EXCEPTION 'პროდუქტის მთავარი ფოტო არასწორია.' USING ERRCODE = '22023';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_product_base_payload(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.admin_save_product(p_product jsonb)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_product public.products;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to save products' USING ERRCODE = '42501';
  END IF;

  PERFORM private.validate_product_base_payload(p_product);

  -- This RPC is creation-only. Never turn an ID collision into an update.
  INSERT INTO public.products
  SELECT (
    jsonb_populate_record(
      NULL::public.products,
      p_product || jsonb_build_object(
        'created_at', now(),
        -- jsonb_populate_record(NULL, ...) explicitly sets omitted columns to
        -- NULL, bypassing table defaults. Keep required NOT NULL booleans safe.
        'is_featured', coalesce((p_product ->> 'is_featured')::boolean, false),
        'is_published', coalesce((p_product ->> 'is_published')::boolean, true)
      )
    )
  ).*
  RETURNING * INTO v_product;

  RETURN v_product;
END;
$$;

CREATE OR REPLACE FUNCTION private.admin_update_product_with_stock(
  p_product jsonb,
  p_size_color_stocks jsonb,
  p_custom_variant_stocks jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_product_id text;
  v_existing public.products;
  v_updated public.products;
  v_stock_result jsonb;
  v_product_result jsonb;
  v_size_count integer := 0;
  v_custom_count integer := 0;
BEGIN
  IF auth.uid() IS NULL
     OR COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to update products' USING ERRCODE = '42501';
  END IF;

  IF p_product IS NULL OR jsonb_typeof(p_product) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid product payload' USING ERRCODE = '22023';
  END IF;

  PERFORM private.validate_product_base_payload(p_product);

  v_product_id := nullif(trim(p_product ->> 'id'), '');
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Invalid product payload' USING ERRCODE = '22023';
  END IF;

  IF p_size_color_stocks IS NOT NULL
     AND jsonb_typeof(p_size_color_stocks) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid size/color stock list' USING ERRCODE = '22023';
  END IF;

  IF p_custom_variant_stocks IS NOT NULL
     AND jsonb_typeof(p_custom_variant_stocks) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid custom variant stock list' USING ERRCODE = '22023';
  END IF;

  v_size_count := coalesce(jsonb_array_length(p_size_color_stocks), 0);
  v_custom_count := coalesce(jsonb_array_length(p_custom_variant_stocks), 0);

  SELECT p.*
    INTO v_existing
    FROM public.products AS p
   WHERE p.id = v_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  -- Use the locked current row as the base so omitted fields stay unchanged.
  -- Existing database triggers preserve stock for variants not explicitly edited.
  v_updated := jsonb_populate_record(v_existing, p_product - 'id' - 'created_at');

  UPDATE public.products AS p
     SET (
       sku, name, category, brand, vendor, price_gel, old_price_gel, stock,
       image, description, available_sizes, available_colors, material,
       durability, purchase_cost, gallery, variants, tags, model, cpu, ram,
       storage, gpu, screen_size, os, is_featured, is_published
     ) = (
       v_updated.sku, v_updated.name, v_updated.category, v_updated.brand,
       v_updated.vendor, v_updated.price_gel, v_updated.old_price_gel,
       v_updated.stock, v_updated.image, v_updated.description,
       v_updated.available_sizes, v_updated.available_colors, v_updated.material,
       v_updated.durability, v_updated.purchase_cost, v_updated.gallery,
       v_updated.variants, v_updated.tags, v_updated.model, v_updated.cpu,
       v_updated.ram, v_updated.storage, v_updated.gpu, v_updated.screen_size,
       v_updated.os, v_updated.is_featured, v_updated.is_published
     )
   WHERE p.id = v_product_id;

  IF v_size_count > 0 OR v_custom_count > 0 THEN
    v_stock_result := private.admin_set_product_variant_stock_batches(
      v_product_id,
      coalesce(p_size_color_stocks, '[]'::jsonb),
      coalesce(p_custom_variant_stocks, '[]'::jsonb)
    );
  ELSE
    v_stock_result := jsonb_build_object(
      'product_id', v_product_id,
      'size_color', null,
      'custom', null
    );
  END IF;

  SELECT to_jsonb(p)
    INTO v_product_result
    FROM public.products AS p
   WHERE p.id = v_product_id;

  RETURN jsonb_build_object(
    'product', v_product_result,
    'stock', v_stock_result
  );
END;
$$;

