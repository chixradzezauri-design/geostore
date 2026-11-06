-- Enforce selected size/color choices against the live product catalogue.
-- This trigger complements checkout's server-side price/stock validation.
-- It is intentionally staged only; do not apply until migration history is reconciled.

CREATE OR REPLACE FUNCTION private.validate_order_item_variants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_item jsonb;
  v_product_id text;
  v_selected_size text;
  v_selected_color text;
  v_allowed_sizes jsonb;
  v_allowed_colors jsonb;
BEGIN
  IF NEW.items IS NULL OR jsonb_typeof(NEW.items) IS DISTINCT FROM 'array' THEN
    RETURN NEW;
  END IF;

  FOR v_item IN
    SELECT entry.value
    FROM jsonb_array_elements(NEW.items) AS entry(value)
  LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
      CONTINUE;
    END IF;

    v_product_id := nullif(trim(v_item->>'id'), '');
    v_selected_size := nullif(trim(coalesce(v_item->>'selectedSize', v_item->>'selected_size')), '');
    v_selected_color := nullif(trim(coalesce(v_item->>'selectedColor', v_item->>'selected_color')), '');

    IF v_product_id IS NULL
      OR (v_selected_size IS NULL AND v_selected_color IS NULL) THEN
      CONTINUE;
    END IF;

    SELECT available_sizes, available_colors
      INTO v_allowed_sizes, v_allowed_colors
    FROM public.products
    WHERE id = v_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'არჩეული ვარიანტის პროდუქტი ვერ მოიძებნა.';
    END IF;

    -- NULL means no configured options, matching the checkout RPC and UI.
    -- An explicit empty array also means that no options are available.
    IF v_selected_size IS NOT NULL THEN
      IF v_allowed_sizes IS NULL OR v_allowed_sizes = 'null'::jsonb THEN
        v_allowed_sizes := '[]'::jsonb;
      END IF;

      IF jsonb_typeof(v_allowed_sizes) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'პროდუქტის ზომების სია არასწორია.';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(v_allowed_sizes) AS allowed(value)
        WHERE allowed.value = v_selected_size
      ) THEN
        RAISE EXCEPTION 'არჩეული ზომა ამ პროდუქტისთვის ხელმისაწვდომი არ არის.';
      END IF;
    END IF;

    IF v_selected_color IS NOT NULL THEN
      IF v_allowed_colors IS NULL OR v_allowed_colors = 'null'::jsonb THEN
        v_allowed_colors := '[]'::jsonb;
      END IF;

      IF jsonb_typeof(v_allowed_colors) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'პროდუქტის ფერების სია არასწორია.';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(v_allowed_colors) AS allowed(value)
        WHERE allowed.value = v_selected_color
      ) THEN
        RAISE EXCEPTION 'არჩეული ფერი ამ პროდუქტისთვის ხელმისაწვდომი არ არის.';
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS orders_validate_item_variants ON public.orders;

CREATE TRIGGER orders_validate_item_variants
BEFORE INSERT OR UPDATE OF items
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.validate_order_item_variants();
