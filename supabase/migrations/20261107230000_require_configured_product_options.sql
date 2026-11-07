-- Require configured size/color options on the server, not only in the browser.
-- Built from the currently deployed private.create_order_with_stock definition.
-- Staged only: reconcile migration history before applying to the live database.
CREATE OR REPLACE FUNCTION private.create_order_with_stock_unchecked(p_order jsonb)
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
  v_addon_subtotal numeric := 0;
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
  v_variant jsonb;
  v_variant_price numeric;
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
       or length(coalesce(item->>'custom_variant_id', '')) > 120
       or (item ? 'gift_wrap' and jsonb_typeof(item->'gift_wrap') is distinct from 'boolean')
       or (item ? 'vip_warranty' and jsonb_typeof(item->'vip_warranty') is distinct from 'boolean')
       or length(coalesce(item->>'gift_message', '')) > 240
       or (nullif(trim(item->>'gift_message'), '') is not null and item->'gift_wrap' is distinct from 'true'::jsonb)
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
          ) || CASE WHEN grouped.custom_variant_id IS NOT NULL
            THEN jsonb_build_object('custom_variant_id', grouped.custom_variant_id)
            ELSE '{}'::jsonb END
          order by grouped.product_id, grouped.selected_size nulls first, grouped.selected_color nulls first
        ),
        '[]'::jsonb
      )
      from (
        select
          item->>'id' as product_id,
          nullif(trim(item->>'selected_size'), '') as selected_size,
          nullif(trim(item->>'selected_color'), '') as selected_color,
          nullif(trim(item->>'custom_variant_id'), '') as custom_variant_id,
          sum((item->>'quantity')::integer)::integer as quantity
        from jsonb_array_elements(p_order->'items') e(item)
        group by
          item->>'id',
          nullif(trim(item->>'selected_size'), ''),
          nullif(trim(item->>'selected_color'), ''),
          nullif(trim(item->>'custom_variant_id'), '')
      ) grouped
    ),
    'coupon_code', v_coupon_code,
    'delivery_region', v_region
  );
  -- Preserve old idempotent snapshots when no add-ons are selected.
  if exists (
    select 1 from jsonb_array_elements(p_order->'items') e(item)
    where coalesce((item->>'gift_wrap')::boolean, false)
       or coalesce((item->>'vip_warranty')::boolean, false)
       or nullif(trim(item->>'gift_message'), '') is not null
  ) then
    v_request := v_request || jsonb_build_object(
      'customizations',
      (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', grouped.product_id,
          'selected_size', grouped.selected_size,
          'selected_color', grouped.selected_color,
          'gift_wrap', grouped.gift_wrap,
          'vip_warranty', grouped.vip_warranty,
          'gift_message', grouped.gift_message,
          'quantity', grouped.quantity
        ) || CASE WHEN grouped.custom_variant_id IS NOT NULL
          THEN jsonb_build_object('custom_variant_id', grouped.custom_variant_id)
          ELSE '{}'::jsonb END order by grouped.product_id, grouped.selected_size nulls first,
          grouped.selected_color nulls first, grouped.gift_wrap,
          grouped.vip_warranty, grouped.gift_message), '[]'::jsonb)
        from (
          select
            item->>'id' as product_id,
            nullif(trim(item->>'selected_size'), '') as selected_size,
            nullif(trim(item->>'selected_color'), '') as selected_color,
            nullif(trim(item->>'custom_variant_id'), '') as custom_variant_id,
            coalesce((item->>'gift_wrap')::boolean, false) as gift_wrap,
            coalesce((item->>'vip_warranty')::boolean, false) as vip_warranty,
            nullif(trim(item->>'gift_message'), '') as gift_message,
            sum((item->>'quantity')::integer)::integer as quantity
          from jsonb_array_elements(p_order->'items') e(item)
          where coalesce((item->>'gift_wrap')::boolean, false)
             or coalesce((item->>'vip_warranty')::boolean, false)
             or nullif(trim(item->>'gift_message'), '') is not null
          group by item->>'id',
            nullif(trim(item->>'selected_size'), ''),
            nullif(trim(item->>'selected_color'), ''),
            nullif(trim(item->>'custom_variant_id'), ''),
            coalesce((item->>'gift_wrap')::boolean, false),
            coalesce((item->>'vip_warranty')::boolean, false),
            nullif(trim(item->>'gift_message'), '')
        ) grouped
      )
    );
  end if;
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
  for v_item in
    select item->>'id' as product_id,
           nullif(trim(item->>'custom_variant_id'), '') as custom_variant_id,
           sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_order->'items') e(item)
     group by item->>'id', nullif(trim(item->>'custom_variant_id'), '')
     order by item->>'id', nullif(trim(item->>'custom_variant_id'), '')
  loop
    if coalesce(trim(v_item.product_id), '') = '' or v_item.quantity is null or v_item.quantity <= 0 or v_item.quantity > 100 then
      raise exception 'პროდუქტის ID ან რაოდენობა არასწორია.';
    end if;
    select id, name, price_gel, stock, purchase_cost, vendor, category, variants into v_product
      from public.products where id = v_item.product_id for update;
    if not found then raise exception 'პროდუქტი ვერ მოიძებნა: %', v_item.product_id; end if;
    if v_item.custom_variant_id is null then
      if jsonb_typeof(v_product.variants) = 'array' and jsonb_array_length(v_product.variants) > 0 then
        raise exception 'ამ პროდუქტისთვის შეკვეთამდე ინდივიდუალური ვარიანტის არჩევაა აუცილებელი.';
      end if;
      if coalesce(v_product.stock, 0) < v_item.quantity then
        raise exception 'პროდუქტი აღარ არის საკმარისი რაოდენობით მარაგში: %', v_item.product_id;
      end if;
      v_price := v_product.price_gel;
    else
      v_variant := null;
      select element into v_variant
        from jsonb_array_elements(case when jsonb_typeof(v_product.variants) = 'array' then v_product.variants else '[]'::jsonb end) as entry(element)
       where element->>'id' = v_item.custom_variant_id
       limit 1;
      if v_variant is null then raise exception 'არჩეული ვარიანტი ამ პროდუქტისთვის აღარ არსებობს.'; end if;
      if coalesce((v_variant->>'stock')::integer, 0) < v_item.quantity then
        raise exception 'არჩეული ვარიანტის მარაგი არასაკმარისია: %', v_variant->>'name';
      end if;
      v_price := nullif(v_variant->>'priceGEL', '')::numeric;
    end if;
    if v_price is null or v_price < 0 then raise exception 'პროდუქტის ან ვარიანტის ფასი არასწორია.'; end if;
    v_subtotal := v_subtotal + (v_price * v_item.quantity);
  end loop;

  -- Fixed add-on fees are calculated here, never from browser-supplied prices.
  select coalesce(sum(
    (
      (case when coalesce((item->>'gift_wrap')::boolean, false) then 5 else 0 end)
      + (case when coalesce((item->>'vip_warranty')::boolean, false) then 15 else 0 end)
    ) * (item->>'quantity')::numeric
  ), 0)
  into v_addon_subtotal
  from jsonb_array_elements(p_order->'items') e(item);
  v_subtotal := v_subtotal + v_addon_subtotal;

  -- Preserve each size/color/customization as a separate order line.
  for v_item in
    select
      item->>'id' as product_id,
      (item->>'quantity')::integer as quantity,
      nullif(trim(item->>'selected_size'), '') as selected_size,
      nullif(trim(item->>'selected_color'), '') as selected_color,
      nullif(trim(item->>'custom_variant_id'), '') as custom_variant_id,
      coalesce((item->>'gift_wrap')::boolean, false) as gift_wrap,
      coalesce((item->>'vip_warranty')::boolean, false) as vip_warranty,
      nullif(trim(item->>'gift_message'), '') as gift_message,
      (case when coalesce((item->>'gift_wrap')::boolean, false) then 5 else 0 end)
        + (case when coalesce((item->>'vip_warranty')::boolean, false) then 15 else 0 end) as addon_fee
    from jsonb_array_elements(p_order->'items') e(item)
    order by item->>'id', item->>'selected_size', item->>'selected_color',
      item->>'gift_wrap', item->>'vip_warranty', item->>'gift_message'
  loop
    select id, name, price_gel, purchase_cost, vendor, category, available_sizes, available_colors, variants into v_product
      from public.products where id = v_item.product_id;
    if not found then raise exception 'პროდუქტი ვერ მოიძებნა: %', v_item.product_id; end if;
    v_variant := null;
    v_variant_price := v_product.price_gel;
    if v_item.custom_variant_id is not null then
      select element into v_variant
        from jsonb_array_elements(case when jsonb_typeof(v_product.variants) = 'array' then v_product.variants else '[]'::jsonb end) as entry(element)
       where element->>'id' = v_item.custom_variant_id
       limit 1;
      if v_variant is null then raise exception 'არჩეული ვარიანტი ამ პროდუქტისთვის აღარ არსებობს.'; end if;
      v_variant_price := nullif(v_variant->>'priceGEL', '')::numeric;
      if v_variant_price is null or v_variant_price < 0 then raise exception 'არჩეული ვარიანტის ფასი არასწორია.'; end if;
    end if;
    if coalesce(jsonb_typeof(v_product.available_sizes), '') = 'array'
      and jsonb_array_length(v_product.available_sizes) > 0
      and v_item.selected_size is null then
      raise exception 'ამ პროდუქტისთვის ზომის არჩევა აუცილებელია.';
    end if;
    if v_item.selected_size is not null and not exists (
      select 1
      from jsonb_array_elements_text(
        case when jsonb_typeof(v_product.available_sizes) = 'array'
          then v_product.available_sizes else '[]'::jsonb end
      ) as allowed(value)
      where allowed.value = v_item.selected_size
    ) then
      raise exception 'არჩეული ზომა ამ პროდუქტისთვის ხელმისაწვდომი არ არის.';
    end if;
    if coalesce(jsonb_typeof(v_product.available_colors), '') = 'array'
      and jsonb_array_length(v_product.available_colors) > 0
      and v_item.selected_color is null then
      raise exception 'ამ პროდუქტისთვის ფერის არჩევა აუცილებელია.';
    end if;
    if v_item.selected_color is not null and not exists (
      select 1
      from jsonb_array_elements_text(
        case when jsonb_typeof(v_product.available_colors) = 'array'
          then v_product.available_colors else '[]'::jsonb end
      ) as allowed(value)
      where allowed.value = v_item.selected_color
    ) then
      raise exception 'არჩეული ფერი ამ პროდუქტისთვის ხელმისაწვდომი არ არის.';
    end if;
    v_line := jsonb_build_object(
      'id', v_product.id,
      'name', v_product.name,
      'price', v_variant_price + v_item.addon_fee,
      'base_price', v_variant_price,
      'customVariantId', v_item.custom_variant_id,
      'customVariantName', case when v_variant is null then null else v_variant->>'name' end,
      'addon_total', v_item.addon_fee,
      'gift_wrap', v_item.gift_wrap,
      'vip_warranty', v_item.vip_warranty,
      'gift_message', v_item.gift_message,
      'quantity', v_item.quantity,
      'selectedSize', v_item.selected_size,
      'selectedColor', v_item.selected_color,
      'purchase_cost', v_product.purchase_cost,
      'vendor', v_product.vendor,
      'category', v_product.category
    );
    v_items := v_items || jsonb_build_array(v_line);
  end loop;
  if v_coupon_code <> '' then
    select discount_percent, min_order_gel into v_coupon from public.store_coupons where code = v_coupon_code and active = true;
    if not found then raise exception 'კუპონი არასწორია ან აღარ არის აქტიური.'; end if;
    if v_subtotal < v_coupon.min_order_gel then raise exception 'კუპონის მინიმალური შეკვეთის თანხა არ შესრულდა.'; end if;
    v_discount := round(v_subtotal * v_coupon.discount_percent / 100, 2);
  end if;
  v_total := greatest(0, v_subtotal - v_discount) + v_delivery;
  perform set_config('geostore.variant_stock_adjustment', 'on', true);
  for v_item in
    select item->>'id' as product_id,
           nullif(trim(item->>'customVariantId'), '') as custom_variant_id,
           sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_items) e(item)
     group by item->>'id', nullif(trim(item->>'customVariantId'), '')
     order by item->>'id', nullif(trim(item->>'customVariantId'), '')
  loop
    if v_item.custom_variant_id is null then
      update public.products set stock = coalesce(stock, 0) - v_item.quantity
       where id = v_item.product_id and coalesce(stock, 0) >= v_item.quantity;
    else
      update public.products p
         set variants = (
           select jsonb_agg(
             case when element->>'id' = v_item.custom_variant_id
               then jsonb_set(element, '{stock}', to_jsonb((element->>'stock')::integer - v_item.quantity), true)
               else element end
             order by ordinality
           )
           from jsonb_array_elements(case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end)
             with ordinality as variant_rows(element, ordinality)
         )
       where p.id = v_item.product_id
         and exists (
           select 1 from jsonb_array_elements(case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end) element
            where element->>'id' = v_item.custom_variant_id
              and coalesce((element->>'stock')::integer, 0) >= v_item.quantity
         );
    end if;
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then raise exception 'მარაგის განახლება ვერ მოხერხდა პროდუქტისთვის ან ვარიანტისთვის: %', v_item.product_id; end if;
  end loop;
  v_result := jsonb_build_object('order_id', v_order_id, 'stock_deducted', true, 'items', v_items,
    'subtotal_gel', v_subtotal, 'discount_gel', v_discount, 'delivery_gel', v_delivery, 'total_gel', v_total);
  insert into public.orders(id, customer_name, phone, address, user_email, customer_email, items,
    total_gel, status, stock_deducted_at, checkout_result, checkout_request)
  values (v_order_id, p_order->>'customer_name', p_order->>'phone', p_order->>'address',
    v_user_email, v_customer_email, v_items, v_total, 'ახალი', now(), v_result, v_request);
  return v_result;
end;
$function$;


-- Admin variant inventory RPC (merged here to keep migration versions unique).
-- Secure admin restocking for custom product variants.
-- The latest custom-variant migration installs a stock-preservation trigger;
-- this RPC marks only its own row-locked inventory update as authorized.

CREATE OR REPLACE FUNCTION private.admin_adjust_product_variant_stock(
  p_product_id text,
  p_variant_id text,
  p_delta integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_product_id text;
  v_variants jsonb;
  v_variant_count integer;
  v_current_stock integer;
  v_new_stock integer;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to adjust product inventory' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(trim(p_product_id), '') IS NULL
     OR length(trim(p_product_id)) > 64
     OR NULLIF(trim(p_variant_id), '') IS NULL
     OR length(trim(p_variant_id)) > 80
     OR p_delta IS NULL OR p_delta = 0
     OR p_delta < -1000000 OR p_delta > 1000000 THEN
    RAISE EXCEPTION 'Invalid variant stock adjustment' USING ERRCODE = '22023';
  END IF;

  SELECT id, variants INTO v_product_id, v_variants
    FROM public.products
   WHERE id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  IF jsonb_typeof(v_variants) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Product variants are invalid' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_variant_count
    FROM jsonb_array_elements(v_variants) AS e(item)
   WHERE item ->> 'id' = p_variant_id;

  IF v_variant_count <> 1 THEN
    RAISE EXCEPTION 'Variant not found or duplicated' USING ERRCODE = 'P0002';
  END IF;

  SELECT CASE
    WHEN coalesce(item ->> 'stock', '') ~ '^[0-9]{1,7}$'
      THEN (item ->> 'stock')::integer
    ELSE NULL
  END
    INTO v_current_stock
    FROM jsonb_array_elements(v_variants) AS e(item)
   WHERE item ->> 'id' = p_variant_id;

  IF v_current_stock IS NULL OR v_current_stock > 1000000 THEN
    RAISE EXCEPTION 'Variant stock is invalid or exceeds the allowed limit' USING ERRCODE = '22023';
  END IF;

  v_new_stock := v_current_stock + p_delta;
  IF v_new_stock < 0 OR v_new_stock > 1000000 THEN
    RAISE EXCEPTION 'Variant stock would be outside the allowed range' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('geostore.variant_stock_adjustment', 'on', true);

  UPDATE public.products AS p
     SET variants = (
       SELECT jsonb_agg(
         CASE WHEN element ->> 'id' = p_variant_id
           THEN jsonb_set(element, '{stock}', to_jsonb(v_new_stock), true)
           ELSE element
         END
         ORDER BY ordinality
       )
       FROM jsonb_array_elements(v_variants)
         WITH ORDINALITY AS variant_rows(element, ordinality)
     )
   WHERE p.id = p_product_id
   RETURNING p.id, p.variants INTO v_product_id, v_variants;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product inventory update failed' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('id', v_product_id, 'variants', v_variants);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_adjust_product_variant_stock(
  p_product_id text,
  p_variant_id text,
  p_delta integer
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.admin_adjust_product_variant_stock(p_product_id, p_variant_id, p_delta);
$function$;

REVOKE ALL ON FUNCTION private.admin_adjust_product_variant_stock(text, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_adjust_product_variant_stock(text, text, integer)
  TO authenticated;
REVOKE ALL ON FUNCTION public.admin_adjust_product_variant_stock(text, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_product_variant_stock(text, text, integer)
  TO authenticated;
