-- Preserve selected product variants in server-created order snapshots.
-- This migration is staged only; reconcile the live migration history before applying.
-- Atomic stock adjustment for one custom variant.
CREATE OR REPLACE FUNCTION private.adjust_product_variant_stock(p_variants jsonb, p_variant_id text, p_delta integer)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path TO ''
AS $variant_stock$
DECLARE v_count integer; v_stock integer; v_result jsonb;
BEGIN
  IF p_variant_id IS NULL OR length(trim(p_variant_id)) NOT BETWEEN 1 AND 80
     OR p_delta IS NULL OR abs(p_delta) > 1000000 THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტის მონაცემები არასწორია.';
  END IF;
  IF jsonb_typeof(p_variants) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტების სია არასწორია.';
  END IF;
  IF jsonb_array_length(p_variants) > 50 THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტების რაოდენობა დასაშვებ ზღვარს აჭარბებს.';
  END IF;
  SELECT count(*) INTO v_count FROM jsonb_array_elements(p_variants) e(item) WHERE item->>'id' = p_variant_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'არჩეული პროდუქტის ვარიანტი ვერ მოიძებნა ან დუბლირებულია.'; END IF;
  SELECT CASE WHEN coalesce(item->>'stock', '') ~ '^[0-9]{1,7}$' THEN (item->>'stock')::integer ELSE NULL END
    INTO v_stock FROM jsonb_array_elements(p_variants) e(item) WHERE item->>'id' = p_variant_id;
  IF v_stock IS NULL OR v_stock + p_delta NOT BETWEEN 0 AND 1000000 THEN
    RAISE EXCEPTION 'არჩეული ვარიანტის მარაგი არასაკმარისია ან არასწორია.';
  END IF;
  SELECT coalesce(jsonb_agg(CASE WHEN item->>'id' = p_variant_id
    THEN jsonb_set(item, '{stock}', to_jsonb(v_stock + p_delta), true) ELSE item END ORDER BY ordinal), '[]'::jsonb)
    INTO v_result FROM jsonb_array_elements(p_variants) WITH ORDINALITY e(item, ordinal);
  RETURN v_result;
END;
$variant_stock$;
REVOKE ALL ON FUNCTION private.adjust_product_variant_stock(jsonb, text, integer) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.create_order_with_stock(p_order jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_item record;
  v_updated integer;
  v_order_id text;
  v_user_email text;
  v_customer_email text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_delivery numeric := 0;
  v_total numeric := 0;
  v_coupon_code text;
  v_coupon record;
  v_region text;
  v_items jsonb := '[]'::jsonb;
  v_product record;
  v_price numeric;
  v_line jsonb;
  v_existing public.orders%rowtype;
  v_result jsonb;
  v_request jsonb;
  v_variant_name text;
  v_variant_price numeric;
  v_variant_stock integer;
  v_variant_count integer;
begin
  if p_order is null or jsonb_typeof(p_order) <> 'object' then
    raise exception 'შეკვეთის მონაცემები არასწორია.';
  end if;
  if coalesce(trim(p_order->>'id'), '') = ''
    or coalesce(trim(p_order->>'customer_name'), '') = ''
    or coalesce(trim(p_order->>'phone'), '') = ''
    or coalesce(trim(p_order->>'address'), '') = '' then
    raise exception 'შეავსეთ შეკვეთის სავალდებულო ველები.';
  end if;
  if jsonb_typeof(p_order->'items') is distinct from 'array' then
    raise exception 'შეკვეთის პროდუქტების სია არასწორია.';
  end if;
  if jsonb_array_length(p_order->'items') = 0 then
    raise exception 'შეკვეთაში პროდუქტები არ არის.';
  end if;

  -- Validate each raw line before aggregation so invalid or negative
  -- quantities cannot offset valid quantities for the same product.
  if exists (
    select 1
    from jsonb_array_elements(p_order->'items') e(item)
    where jsonb_typeof(item) <> 'object'
       or coalesce(trim(item->>'id'), '') = ''
       or coalesce(item->>'quantity', '') !~ '^[0-9]{1,3}$'
       or case
            when coalesce(item->>'quantity', '') ~ '^[0-9]{1,3}$'
              then (item->>'quantity')::integer not between 1 and 100
            else true
          end
       or length(coalesce(item->>'selected_size', '')) > 40
       or length(coalesce(item->>'selected_color', '')) > 60
       or length(coalesce(item->>'custom_variant_id', '')) > 80
       or (item ? 'custom_variant_id' and jsonb_typeof(item->'custom_variant_id') not in ('string', 'null'))
       or (jsonb_typeof(item->'custom_variant_id') = 'string' and nullif(trim(item->>'custom_variant_id'), '') is null)
       or (item ? 'gift_wrap' and jsonb_typeof(item->'gift_wrap') <> 'boolean')
       or (item ? 'vip_warranty' and jsonb_typeof(item->'vip_warranty') <> 'boolean')
       or (item ? 'gift_message' and jsonb_typeof(item->'gift_message') <> 'string')
       or length(coalesce(item->>'gift_message', '')) > 240
  ) then
    raise exception 'პროდუქტის ID, რაოდენობა, ზომა ან ფერი არასწორია.';
  end if;
  v_order_id := p_order->>'id';
  v_user_email := coalesce(p_order->>'user_email', 'guest');
  v_customer_email := nullif(lower(trim(coalesce(p_order->>'customer_email', ''))), '');
  if auth.uid() is null then
    if v_user_email <> 'guest' then
      raise exception 'სტუმრის შეკვეთის ავტორიზაცია ვერ დადასტურდა.';
    end if;
  elsif lower(v_user_email) <> lower(coalesce(auth.jwt()->>'email', '')) then
    raise exception 'მომხმარებლის სესია შეკვეთის მონაცემებს არ ემთხვევა.';
  end if;
  v_region := coalesce(p_order->>'delivery_region', 'tbilisi');
  v_coupon_code := upper(trim(coalesce(p_order->>'coupon_code', '')));
  select coalesce(jsonb_agg(jsonb_build_object('id', grouped.product_id, 'quantity', grouped.quantity) order by grouped.product_id), '[]'::jsonb)
    into v_request
    from (select item->>'id' as product_id, sum((item->>'quantity')::integer)::integer as quantity
            from jsonb_array_elements(p_order->'items') e(item) group by item->>'id') grouped;
  v_request := jsonb_build_object(
    'items', v_request,
    'variants', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', grouped.product_id,
            'selected_size', grouped.selected_size,
            'selected_color', grouped.selected_color,
            'quantity', grouped.quantity
          )
          || CASE WHEN grouped.custom_variant_id IS NOT NULL
               THEN jsonb_build_object('custom_variant_id', grouped.custom_variant_id)
               ELSE '{}'::jsonb END
          || CASE WHEN grouped.gift_wrap OR grouped.vip_warranty
               THEN jsonb_build_object('gift_wrap', grouped.gift_wrap,
                                       'vip_warranty', grouped.vip_warranty,
                                       'gift_message', grouped.gift_message)
               ELSE '{}'::jsonb END
          order by grouped.product_id, grouped.selected_size nulls first,
                   grouped.selected_color nulls first, grouped.custom_variant_id nulls first,
                   grouped.gift_wrap, grouped.vip_warranty, grouped.gift_message nulls first
        ),
        '[]'::jsonb
      )
      from (
        select
          item->>'id' as product_id,
          nullif(trim(item->>'selected_size'), '') as selected_size,
          nullif(trim(item->>'selected_color'), '') as selected_color,
          nullif(trim(item->>'custom_variant_id'), '') as custom_variant_id,
          coalesce((item->>'gift_wrap')::boolean, false) as gift_wrap,
          coalesce((item->>'vip_warranty')::boolean, false) as vip_warranty,
          CASE WHEN coalesce((item->>'gift_wrap')::boolean, false)
            THEN nullif(left(trim(coalesce(item->>'gift_message', '')), 240), '') ELSE NULL END as gift_message,
          sum((item->>'quantity')::integer)::integer as quantity
        from jsonb_array_elements(p_order->'items') e(item)
        group by
          item->>'id',
          nullif(trim(item->>'selected_size'), ''),
          nullif(trim(item->>'selected_color'), ''),
          nullif(trim(item->>'custom_variant_id'), ''),
          coalesce((item->>'gift_wrap')::boolean, false),
          coalesce((item->>'vip_warranty')::boolean, false),
          CASE WHEN coalesce((item->>'gift_wrap')::boolean, false)
            THEN nullif(left(trim(coalesce(item->>'gift_message', '')), 240), '') ELSE NULL END
      ) grouped
    ),
    'coupon_code', v_coupon_code,
    'delivery_region', v_region
  );
  perform pg_advisory_xact_lock(hashtextextended(v_order_id, 0));
  select * into v_existing from public.orders where id = v_order_id for update;
  if found then
    if v_existing.customer_name is distinct from p_order->>'customer_name'
      or v_existing.phone is distinct from p_order->>'phone'
      or v_existing.address is distinct from p_order->>'address'
      or coalesce(v_existing.user_email, 'guest') is distinct from v_user_email
      or v_existing.customer_email is distinct from v_customer_email
      or v_existing.checkout_request is null
      or (
        (
          v_existing.checkout_request ? 'variants'
          and v_existing.checkout_request is distinct from v_request
        )
        or (
          not (v_existing.checkout_request ? 'variants')
          and (
            (v_existing.checkout_request is distinct from (v_request - 'variants'))
            or exists (
              select 1
              from jsonb_array_elements(p_order->'items') e(item)
              where nullif(trim(item->>'selected_size'), '') is not null
                 or nullif(trim(item->>'selected_color'), '') is not null
                 or nullif(trim(item->>'custom_variant_id'), '') is not null
            )
          )
        )
      ) then
      raise exception 'შეკვეთის იდენტიფიკატორი უკვე გამოყენებულია სხვა მონაცემებისთვის.';
    end if;
    if v_existing.checkout_result is null then
      raise exception 'შეკვეთა უკვე არსებობს, მაგრამ მისი განმეორებითი პასუხი ვერ აღდგა. მიმართეთ მხარდაჭერას.';
    end if;
    return v_existing.checkout_result || jsonb_build_object('idempotent_replay', true);
  end if;
  if v_region not in ('tbilisi', 'bigCities', 'other') then
    raise exception 'მიწოდების რეგიონი არასწორია.';
  end if;
  select fee_gel into v_delivery from public.store_delivery_fees where region = v_region;
  if not found then raise exception 'მიწოდების საფასური ვერ მოიძებნა.'; end if;
  -- Lock catalogue rows in stable order, then validate stock pools separately.
  FOR v_item IN
    SELECT DISTINCT item->>'id' AS product_id FROM jsonb_array_elements(p_order->'items') e(item) ORDER BY item->>'id'
  LOOP
    PERFORM 1 FROM public.products WHERE id = v_item.product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'პროდუქტი ვერ მოიძებნა: %', v_item.product_id; END IF;
  END LOOP;
  FOR v_item IN
    SELECT item->>'id' AS product_id, nullif(trim(item->>'custom_variant_id'), '') AS custom_variant_id,
           sum((item->>'quantity')::integer)::integer AS quantity,
           sum((item->>'quantity')::integer *
             (CASE WHEN coalesce((item->>'gift_wrap')::boolean, false) THEN 5 ELSE 0 END +
              CASE WHEN coalesce((item->>'vip_warranty')::boolean, false) THEN 15 ELSE 0 END))::numeric AS addons_total
      FROM jsonb_array_elements(p_order->'items') e(item)
     GROUP BY item->>'id', nullif(trim(item->>'custom_variant_id'), '')
     ORDER BY item->>'id', nullif(trim(item->>'custom_variant_id'), '')
  LOOP
    SELECT id, name, price_gel, stock, purchase_cost, vendor, category, variants INTO v_product
      FROM public.products WHERE id = v_item.product_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'პროდუქტი ვერ მოიძებნა: %', v_item.product_id; END IF;
    IF v_item.custom_variant_id IS NOT NULL THEN
      IF CASE
        WHEN jsonb_typeof(coalesce(v_product.variants, '[]'::jsonb)) = 'array'
          THEN jsonb_array_length(coalesce(v_product.variants, '[]'::jsonb)) > 50
        ELSE TRUE
      END THEN
        RAISE EXCEPTION 'პროდუქტის ვარიანტების მონაცემები არასწორია.';
      END IF;
      SELECT count(*) INTO v_variant_count FROM jsonb_array_elements(coalesce(v_product.variants, '[]'::jsonb)) e(item)
       WHERE item->>'id' = v_item.custom_variant_id;
      IF v_variant_count <> 1 THEN RAISE EXCEPTION 'არჩეული პროდუქტის ვარიანტი ვერ მოიძებნა ან დუბლირებულია.'; END IF;
      SELECT item->>'name',
             CASE WHEN coalesce(item->>'priceGEL', item->>'price_gel', '') ~ '^[0-9]+([.][0-9]{1,2})?$'
                  THEN coalesce(item->>'priceGEL', item->>'price_gel')::numeric ELSE NULL END,
             CASE WHEN coalesce(item->>'stock', '') ~ '^[0-9]{1,7}$' THEN (item->>'stock')::integer ELSE NULL END
        INTO v_variant_name, v_variant_price, v_variant_stock
        FROM jsonb_array_elements(v_product.variants) e(item) WHERE item->>'id' = v_item.custom_variant_id;
      IF coalesce(trim(v_variant_name), '') = '' OR v_variant_price IS NULL OR v_variant_price < 0
         OR v_variant_stock IS NULL OR v_variant_stock < v_item.quantity THEN
        RAISE EXCEPTION 'არჩეული ვარიანტის ფასი ან მარაგი არასწორია ან არასაკმარისია.';
      END IF;
      v_subtotal := v_subtotal + (v_variant_price * v_item.quantity) + coalesce(v_item.addons_total, 0);
    ELSE
      IF coalesce(v_product.stock, 0) < v_item.quantity THEN RAISE EXCEPTION 'პროდუქტი აღარ არის საკმარისი რაოდენობით მარაგში: %', v_item.product_id; END IF;
      IF v_product.price_gel IS NULL OR v_product.price_gel < 0 THEN RAISE EXCEPTION 'პროდუქტის ფასი არასწორია.'; END IF;
      v_subtotal := v_subtotal + (v_product.price_gel * v_item.quantity) + coalesce(v_item.addons_total, 0);
    END IF;
  END LOOP;

  -- Snapshot selected variant identity and server-owned price for each order line.
  FOR v_item IN
    SELECT item->>'id' AS product_id, (item->>'quantity')::integer AS quantity,
           nullif(trim(item->>'selected_size'), '') AS selected_size,
           nullif(trim(item->>'selected_color'), '') AS selected_color,
           nullif(trim(item->>'custom_variant_id'), '') AS custom_variant_id,
           coalesce((item->>'gift_wrap')::boolean, false) AS gift_wrap,
           coalesce((item->>'vip_warranty')::boolean, false) AS vip_warranty,
           CASE WHEN coalesce((item->>'gift_wrap')::boolean, false)
             THEN nullif(left(trim(coalesce(item->>'gift_message', '')), 240), '') ELSE NULL END AS gift_message
      FROM jsonb_array_elements(p_order->'items') e(item)
     ORDER BY item->>'id', item->>'custom_variant_id', item->>'selected_size', item->>'selected_color'
  LOOP
    SELECT id, name, price_gel, purchase_cost, vendor, category, available_sizes, available_colors, variants
      INTO v_product FROM public.products WHERE id = v_item.product_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'პროდუქტი ვერ მოიძებნა: %', v_item.product_id; END IF;
    IF v_item.selected_size IS NOT NULL AND CASE
      WHEN jsonb_typeof(coalesce(v_product.available_sizes, '[]'::jsonb)) = 'array' THEN NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(coalesce(v_product.available_sizes, '[]'::jsonb)) allowed(value) WHERE allowed.value = v_item.selected_size
      ) ELSE TRUE END THEN RAISE EXCEPTION 'არჩეული ზომა ამ პროდუქტისთვის ხელმისაწვდომი არ არის.'; END IF;
    IF v_item.selected_color IS NOT NULL AND CASE
      WHEN jsonb_typeof(coalesce(v_product.available_colors, '[]'::jsonb)) = 'array' THEN NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(coalesce(v_product.available_colors, '[]'::jsonb)) allowed(value) WHERE allowed.value = v_item.selected_color
      ) ELSE TRUE END THEN RAISE EXCEPTION 'არჩეული ფერი ამ პროდუქტისთვის ხელმისაწვდომი არ არის.'; END IF;
    v_price := v_product.price_gel;
    v_variant_name := NULL;
    IF v_item.custom_variant_id IS NOT NULL THEN
      SELECT item->>'name', coalesce(item->>'priceGEL', item->>'price_gel')::numeric
        INTO v_variant_name, v_price
        FROM jsonb_array_elements(coalesce(v_product.variants, '[]'::jsonb)) e(item) WHERE item->>'id' = v_item.custom_variant_id;
      IF NOT FOUND OR v_price IS NULL OR v_price < 0 THEN RAISE EXCEPTION 'არჩეული ვარიანტი აღარ არის ხელმისაწვდომი.'; END IF;
    END IF;
    v_line := jsonb_build_object(
      'id', v_product.id, 'name', v_product.name, 'price', v_price, 'quantity', v_item.quantity,
      'selectedSize', v_item.selected_size, 'selectedColor', v_item.selected_color,
      'customVariantId', v_item.custom_variant_id, 'customVariantName', v_variant_name,
      'gift_wrap', v_item.gift_wrap, 'vip_warranty', v_item.vip_warranty,
      'gift_message', v_item.gift_message,
      'gift_wrap_fee', CASE WHEN v_item.gift_wrap THEN 5 ELSE 0 END,
      'vip_warranty_fee', CASE WHEN v_item.vip_warranty THEN 15 ELSE 0 END,
      'purchase_cost', v_product.purchase_cost, 'vendor', v_product.vendor, 'category', v_product.category
    );
    v_items := v_items || jsonb_build_array(v_line);
  END LOOP;

  if v_coupon_code <> '' then
    select discount_percent, min_order_gel into v_coupon from public.store_coupons where code = v_coupon_code and active = true;
    if not found then raise exception 'კუპონი არასწორია ან აღარ არის აქტიური.'; end if;
    if v_subtotal < v_coupon.min_order_gel then raise exception 'კუპონის მინიმალური შეკვეთის თანხა არ შესრულდა.'; end if;
    v_discount := round(v_subtotal * v_coupon.discount_percent / 100, 2);
  end if;
  v_total := greatest(0, v_subtotal - v_discount) + v_delivery;
  -- Standard stock and custom variant stock are independent inventory pools.
  FOR v_item IN
    SELECT item->>'id' AS product_id, sum((item->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(v_items) e(item)
     WHERE nullif(trim(item->>'customVariantId'), '') IS NULL
     GROUP BY item->>'id' ORDER BY item->>'id'
  LOOP
    UPDATE public.products SET stock = coalesce(stock, 0) - v_item.quantity
     WHERE id = v_item.product_id AND coalesce(stock, 0) >= v_item.quantity;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated <> 1 THEN RAISE EXCEPTION 'მარაგის განახლება ვერ მოხერხდა პროდუქტისთვის: %', v_item.product_id; END IF;
  END LOOP;
  FOR v_item IN
    SELECT item->>'id' AS product_id, item->>'customVariantId' AS custom_variant_id,
           sum((item->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(v_items) e(item)
     WHERE nullif(trim(item->>'customVariantId'), '') IS NOT NULL
     GROUP BY item->>'id', item->>'customVariantId' ORDER BY item->>'id', item->>'customVariantId'
  LOOP
    UPDATE public.products SET variants = private.adjust_product_variant_stock(variants, v_item.custom_variant_id, -v_item.quantity)
     WHERE id = v_item.product_id;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated <> 1 THEN RAISE EXCEPTION 'ვარიანტის მარაგის განახლება ვერ მოხერხდა პროდუქტისთვის: %', v_item.product_id; END IF;
  END LOOP;

  v_result := jsonb_build_object('order_id', v_order_id, 'stock_deducted', true, 'items', v_items,
    'subtotal_gel', v_subtotal, 'discount_gel', v_discount, 'delivery_gel', v_delivery, 'total_gel', v_total);
  insert into public.orders(id, customer_name, phone, address, user_email, customer_email, items,
    total_gel, status, stock_deducted_at, checkout_result, checkout_request)
  values (v_order_id, p_order->>'customer_name', p_order->>'phone', p_order->>'address',
    v_user_email, v_customer_email, v_items, v_total, 'ახალი', now(), v_result, v_request);
  return v_result;
end;
$function$

