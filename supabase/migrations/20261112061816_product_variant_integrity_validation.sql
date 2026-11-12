CREATE OR REPLACE FUNCTION private.validate_product_variants(
  p_variants jsonb,
  p_available_sizes jsonb,
  p_available_colors jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_variant jsonb;
  v_option jsonb;
  v_id text;
  v_name text;
  v_price_text text;
  v_stock_text text;
  v_variant_type text;
  v_size text;
  v_color text;
  v_pair_key text;
  v_seen_ids text[] := ARRAY[]::text[];
  v_seen_pairs text[] := ARRAY[]::text[];
  v_allowed_sizes text[] := ARRAY[]::text[];
  v_allowed_colors text[] := ARRAY[]::text[];
  v_size_color_count integer := 0;
  v_custom_count integer := 0;
  v_expected_count integer := 0;
BEGIN
  IF p_variants IS NULL OR p_variants = 'null'::jsonb THEN
    RETURN;
  END IF;

  IF jsonb_typeof(p_variants) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტების სია მასივის ფორმატში უნდა იყოს.'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_variants) > 50 THEN
    RAISE EXCEPTION 'ერთ პროდუქტზე მაქსიმუმ 50 ვარიანტია დაშვებული.'
      USING ERRCODE = '22023';
  END IF;

  IF p_available_sizes IS NOT NULL
     AND jsonb_typeof(p_available_sizes) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'პროდუქტის ზომების სია არასწორია.'
      USING ERRCODE = '22023';
  END IF;

  IF p_available_colors IS NOT NULL
     AND jsonb_typeof(p_available_colors) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'პროდუქტის ფერების სია არასწორია.'
      USING ERRCODE = '22023';
  END IF;

  FOR v_option IN
    SELECT value
      FROM jsonb_array_elements(coalesce(p_available_sizes, '[]'::jsonb)) AS options(value)
  LOOP
    IF jsonb_typeof(v_option) IS DISTINCT FROM 'string'
       OR length(btrim(v_option #>> '{}')) = 0
       OR length(btrim(v_option #>> '{}')) > 40 THEN
      RAISE EXCEPTION 'პროდუქტის ზომის მნიშვნელობა არასწორია.'
        USING ERRCODE = '22023';
    END IF;

    v_size := lower(btrim(v_option #>> '{}'));
    IF v_size = ANY(v_allowed_sizes) THEN
      RAISE EXCEPTION 'პროდუქტის ზომების სიაში დუბლირებული მნიშვნელობაა.'
        USING ERRCODE = '22023';
    END IF;
    v_allowed_sizes := array_append(v_allowed_sizes, v_size);
  END LOOP;

  FOR v_option IN
    SELECT value
      FROM jsonb_array_elements(coalesce(p_available_colors, '[]'::jsonb)) AS options(value)
  LOOP
    IF jsonb_typeof(v_option) IS DISTINCT FROM 'string'
       OR length(btrim(v_option #>> '{}')) = 0
       OR length(btrim(v_option #>> '{}')) > 40 THEN
      RAISE EXCEPTION 'პროდუქტის ფერის მნიშვნელობა არასწორია.'
        USING ERRCODE = '22023';
    END IF;

    v_color := lower(btrim(v_option #>> '{}'));
    IF v_color = ANY(v_allowed_colors) THEN
      RAISE EXCEPTION 'პროდუქტის ფერების სიაში დუბლირებული მნიშვნელობაა.'
        USING ERRCODE = '22023';
    END IF;
    v_allowed_colors := array_append(v_allowed_colors, v_color);
  END LOOP;

  IF cardinality(v_allowed_sizes) > 30 OR cardinality(v_allowed_colors) > 30 THEN
    RAISE EXCEPTION 'ზომებისა და ფერების სია მაქსიმუმ 30 მნიშვნელობას უნდა შეიცავდეს.'
      USING ERRCODE = '22023';
  END IF;

  FOR v_variant IN
    SELECT value FROM jsonb_array_elements(p_variants) AS variants(value)
  LOOP
    IF jsonb_typeof(v_variant) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'პროდუქტის ვარიანტის ჩანაწერი არასწორია.'
        USING ERRCODE = '22023';
    END IF;

    IF jsonb_typeof(v_variant -> 'id') IS DISTINCT FROM 'string'
       OR jsonb_typeof(v_variant -> 'name') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'თითოეულ ვარიანტს უნდა ჰქონდეს ტექსტური ID და სახელი.'
        USING ERRCODE = '22023';
    END IF;

    v_id := btrim(v_variant ->> 'id');
    v_name := btrim(v_variant ->> 'name');

    IF v_id = '' OR v_id <> (v_variant ->> 'id') OR length(v_id) > 120
       OR v_name = '' OR v_name <> (v_variant ->> 'name') OR length(v_name) > 80 THEN
      RAISE EXCEPTION 'ვარიანტის ID ან სახელი ცარიელია ან დასაშვებ სიგრძეს აჭარბებს.'
        USING ERRCODE = '22023';
    END IF;

    IF v_id = ANY(v_seen_ids) THEN
      RAISE EXCEPTION 'პროდუქტის ვარიანტის ID დუბლირებულია.'
        USING ERRCODE = '22023';
    END IF;
    v_seen_ids := array_append(v_seen_ids, v_id);

    IF jsonb_typeof(v_variant -> 'priceGEL') IS DISTINCT FROM 'number'
       AND jsonb_typeof(v_variant -> 'priceGEL') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'ვარიანტის ფასი არასწორია.'
        USING ERRCODE = '22023';
    END IF;

    v_price_text := btrim(v_variant ->> 'priceGEL');
    IF coalesce(v_price_text, '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
       OR v_price_text::numeric > 1000000000 THEN
      RAISE EXCEPTION 'ვარიანტის ფასი უნდა იყოს არაუარყოფითი და მაქსიმუმ 2 ათწილადი ნიშნით.'
        USING ERRCODE = '22023';
    END IF;

    IF jsonb_typeof(v_variant -> 'stock') IS DISTINCT FROM 'number'
       AND jsonb_typeof(v_variant -> 'stock') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'ვარიანტის მარაგი არასწორია.'
        USING ERRCODE = '22023';
    END IF;

    v_stock_text := btrim(v_variant ->> 'stock');
    IF coalesce(v_stock_text, '') !~ '^[0-9]{1,7}$'
       OR v_stock_text::numeric > 1000000 THEN
      RAISE EXCEPTION 'ვარიანტის მარაგი უნდა იყოს მთელი რიცხვი 0-დან 1,000,000-მდე.'
        USING ERRCODE = '22023';
    END IF;

    IF v_variant ? 'variantType'
       AND jsonb_typeof(v_variant -> 'variantType') IS DISTINCT FROM 'string'
       AND jsonb_typeof(v_variant -> 'variantType') IS DISTINCT FROM 'null' THEN
      RAISE EXCEPTION 'ვარიანტის ტიპი არასწორია.'
        USING ERRCODE = '22023';
    END IF;

    v_variant_type := nullif(btrim(v_variant ->> 'variantType'), '');

    IF v_variant_type = 'size_color' THEN
      IF (v_variant ? 'size'
          AND jsonb_typeof(v_variant -> 'size') IS DISTINCT FROM 'string'
          AND jsonb_typeof(v_variant -> 'size') IS DISTINCT FROM 'null')
         OR (v_variant ? 'color'
          AND jsonb_typeof(v_variant -> 'color') IS DISTINCT FROM 'string'
          AND jsonb_typeof(v_variant -> 'color') IS DISTINCT FROM 'null') THEN
        RAISE EXCEPTION 'ვარიანტის ზომისა და ფერის მნიშვნელობები ტექსტური უნდა იყოს.'
          USING ERRCODE = '22023';
      END IF;

      v_size_color_count := v_size_color_count + 1;
      v_size := nullif(lower(btrim(v_variant ->> 'size')), '');
      v_color := nullif(lower(btrim(v_variant ->> 'color')), '');

      IF v_size IS NULL AND v_color IS NULL THEN
        RAISE EXCEPTION 'ზომისა და ფერის ვარიანტს მინიმუმ ერთი განზომილება უნდა ჰქონდეს.'
          USING ERRCODE = '22023';
      END IF;

      IF (v_size IS NOT NULL AND NOT (v_size = ANY(v_allowed_sizes)))
         OR (cardinality(v_allowed_sizes) > 0 AND v_size IS NULL) THEN
        RAISE EXCEPTION 'ვარიანტის ზომა ხელმისაწვდომი ზომების სიას არ ემთხვევა.'
          USING ERRCODE = '22023';
      END IF;

      IF (v_color IS NOT NULL AND NOT (v_color = ANY(v_allowed_colors)))
         OR (cardinality(v_allowed_colors) > 0 AND v_color IS NULL) THEN
        RAISE EXCEPTION 'ვარიანტის ფერი ხელმისაწვდომი ფერების სიას არ ემთხვევა.'
          USING ERRCODE = '22023';
      END IF;

      v_pair_key := jsonb_build_array(v_size, v_color)::text;
      IF v_pair_key = ANY(v_seen_pairs) THEN
        RAISE EXCEPTION 'ზომისა და ფერის კომბინაცია დუბლირებულია.'
          USING ERRCODE = '22023';
      END IF;
      v_seen_pairs := array_append(v_seen_pairs, v_pair_key);
    ELSIF v_variant_type IS NULL OR v_variant_type = 'custom' THEN
      v_custom_count := v_custom_count + 1;
    ELSE
      RAISE EXCEPTION 'პროდუქტის ვარიანტის ტიპი მხარდაჭერილი არ არის.'
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF v_size_color_count > 0 AND v_custom_count > 0 THEN
    RAISE EXCEPTION 'პროდუქტი ერთდროულად ვერ გამოიყენებს ზომა/ფერის მატრიცასა და ინდივიდუალურ ვარიანტებს.'
      USING ERRCODE = '22023';
  END IF;

  IF v_size_color_count > 0 THEN
    IF cardinality(v_allowed_sizes) = 0 AND cardinality(v_allowed_colors) = 0 THEN
      RAISE EXCEPTION 'ზომისა და ფერის ვარიანტებს შესაბამისი ზომების ან ფერების სია სჭირდება.'
        USING ERRCODE = '22023';
    END IF;

    IF cardinality(v_allowed_sizes) > 0 AND cardinality(v_allowed_colors) > 0 THEN
      v_expected_count := cardinality(v_allowed_sizes) * cardinality(v_allowed_colors);
    ELSE
      v_expected_count := cardinality(v_allowed_sizes) + cardinality(v_allowed_colors);
    END IF;

    IF v_expected_count > 50 OR v_size_color_count <> v_expected_count THEN
      RAISE EXCEPTION 'ზომისა და ფერის მარაგის მატრიცა სრულად უნდა ფარავდეს ყველა დასაშვებ კომბინაციას.'
        USING ERRCODE = '22023';
    END IF;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION private.validate_product_variants(jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.validate_product_variants(jsonb, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION private.validate_product_variants(jsonb, jsonb, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.preserve_product_variant_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_variant jsonb;
  v_existing jsonb;
  v_removed jsonb;
  v_result jsonb := '[]'::jsonb;
BEGIN
  IF NEW.variants IS NULL OR jsonb_typeof(NEW.variants) = 'null' THEN
    NEW.variants := '[]'::jsonb;
  END IF;

  PERFORM private.validate_product_variants(
    NEW.variants,
    NEW.available_sizes,
    NEW.available_colors
  );

  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF coalesce(current_setting('geostore.variant_stock_adjustment', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(coalesce(OLD.variants, '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'არსებული პროდუქტის ვარიანტების მონაცემები არასწორია.';
  END IF;

  FOR v_removed IN
    SELECT old_variant
      FROM jsonb_array_elements(coalesce(OLD.variants, '[]'::jsonb)) AS old_rows(old_variant)
     WHERE NOT EXISTS (
       SELECT 1
         FROM jsonb_array_elements(NEW.variants) AS new_rows(new_variant)
        WHERE new_rows.new_variant ->> 'id' = old_variant ->> 'id'
     )
  LOOP
    IF EXISTS (
      SELECT 1
        FROM public.orders o
        CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) item
       WHERE item ->> 'id' = OLD.id
         AND item ->> 'customVariantId' = v_removed ->> 'id'
    ) THEN
      RAISE EXCEPTION 'ვარიანტი შეკვეთების ისტორიაში გამოიყენება და მისი წაშლა დაუშვებელია.';
    END IF;
  END LOOP;

  FOR v_variant IN
    SELECT value FROM jsonb_array_elements(NEW.variants) AS new_rows(value)
  LOOP
    v_existing := NULL;

    SELECT value
      INTO v_existing
      FROM jsonb_array_elements(coalesce(OLD.variants, '[]'::jsonb)) AS old_rows(value)
     WHERE value ->> 'id' = v_variant ->> 'id'
     LIMIT 1;

    IF v_existing IS NOT NULL THEN
      IF coalesce(v_existing ->> 'stock', '') !~ '^[0-9]{1,7}$'
         OR (v_existing ->> 'stock')::numeric > 1000000 THEN
        RAISE EXCEPTION 'არსებული ვარიანტის მარაგის ჩანაწერი არასწორია.';
      END IF;

      v_variant := jsonb_set(
        v_variant,
        '{stock}',
        to_jsonb((v_existing ->> 'stock')::integer),
        true
      );
    ELSE
      IF EXISTS (
        SELECT 1
          FROM public.orders o
          CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) item
         WHERE item ->> 'id' = NEW.id
           AND item ->> 'customVariantId' = v_variant ->> 'id'
      ) THEN
        RAISE EXCEPTION 'ამ ვარიანტის ID შეკვეთების ისტორიაში უკვე გამოიყენება.';
      END IF;
    END IF;

    v_result := v_result || jsonb_build_array(v_variant);
  END LOOP;

  NEW.variants := v_result;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS preserve_product_variant_stock ON public.products;

CREATE TRIGGER preserve_product_variant_stock
BEFORE INSERT OR UPDATE OF variants, available_sizes, available_colors
ON public.products
FOR EACH ROW
EXECUTE FUNCTION private.preserve_product_variant_stock();
