-- Server-authoritative pricing for optional gift wrapping and VIP warranty.
-- Forward-only migration; keep staged until migration history is reconciled.
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
          )
          order by grouped.product_id, grouped.selected_size nulls first, grouped.selected_color nulls first
        ),
        '[]'::jsonb
      )
      from (
        select
          item->>'id' as product_id,
          nullif(trim(item->>'selected_size'), '') as selected_size,
          nullif(trim(item->>'selected_color'), '') as selected_color,
          sum((item->>'quantity')::integer)::integer as quantity
        from jsonb_array_elements(p_order->'items') e(item)
        group by
          item->>'id',
          nullif(trim(item->>'selected_size'), ''),
          nullif(trim(item->>'selected_color'), '')
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
        ) order by grouped.product_id, grouped.selected_size nulls first,
          grouped.selected_color nulls first, grouped.gift_wrap,
          grouped.vip_warranty, grouped.gift_message), '[]'::jsonb)
        from (
          select
            item->>'id' as product_id,
            nullif(trim(item->>'selected_size'), '') as selected_size,
            nullif(trim(item->>'selected_color'), '') as selected_color,
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
    select item->>'id' as product_id, sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_order->'items') e(item)
     group by item->>'id' order by item->>'id'
  loop
    if coalesce(trim(v_item.product_id), '') = '' or v_item.quantity is null or v_item.quantity <= 0 or v_item.quantity > 100 then
      raise exception 'პროდუქტის ID ან რაოდენობა არასწორია.';
    end if;
    select id, name, price_gel, stock, purchase_cost, vendor, category into v_product
      from public.products where id = v_item.product_id for update;
    if not found then raise exception 'პროდუქტი ვერ მოიძებნა: %', v_item.product_id; end if;
    if coalesce(v_product.stock, 0) < v_item.quantity then
      raise exception 'პროდუქტი აღარ არის საკმარისი რაოდენობით მარაგში: %', v_item.product_id;
    end if;
    v_price := v_product.price_gel;
    if v_price is null or v_price < 0 then raise exception 'პროდუქტის ფასი არასწორია.'; end if;
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
      coalesce((item->>'gift_wrap')::boolean, false) as gift_wrap,
      coalesce((item->>'vip_warranty')::boolean, false) as vip_warranty,
      nullif(trim(item->>'gift_message'), '') as gift_message,
      (case when coalesce((item->>'gift_wrap')::boolean, false) then 5 else 0 end)
        + (case when coalesce((item->>'vip_warranty')::boolean, false) then 15 else 0 end) as addon_fee
    from jsonb_array_elements(p_order->'items') e(item)
    order by item->>'id', item->>'selected_size', item->>'selected_color',
      item->>'gift_wrap', item->>'vip_warranty', item->>'gift_message'
  loop
    select id, name, price_gel, purchase_cost, vendor, category, available_sizes, available_colors into v_product
      from public.products where id = v_item.product_id;
    if not found then raise exception 'პროდუქტი ვერ მოიძებნა: %', v_item.product_id; end if;
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
      'price', v_product.price_gel + v_item.addon_fee,
      'base_price', v_product.price_gel,
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
  for v_item in
    select item->>'id' as product_id, sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_items) e(item) group by item->>'id' order by item->>'id'
  loop
    update public.products set stock = coalesce(stock, 0) - v_item.quantity
     where id = v_item.product_id and coalesce(stock, 0) >= v_item.quantity;
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then raise exception 'მარაგის განახლება ვერ მოხერხდა პროდუქტისთვის: %', v_item.product_id; end if;
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



-- Bound the public guest-checkout payload before it reaches the stock/price transaction.
-- The private checkout implementation remains the only writer of orders and stock.
CREATE OR REPLACE FUNCTION public.create_order_with_stock(p_order jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_phone text;
BEGIN
  IF p_order IS NULL OR jsonb_typeof(p_order) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'შეკვეთის მონაცემები არასწორია.';
  END IF;

  IF octet_length(p_order::text) > 65536 THEN
    RAISE EXCEPTION 'შეკვეთის მონაცემები ზედმეტად დიდია. შეამცირეთ პროდუქტების სია და სცადეთ ხელახლა.';
  END IF;

  IF coalesce(length(trim(p_order->>'id')), 0) NOT BETWEEN 6 AND 64
     OR coalesce(trim(p_order->>'id'), '') !~ '^[A-Za-z0-9_-]{6,64}$' THEN
    RAISE EXCEPTION 'შეკვეთის იდენტიფიკატორი არასწორია.';
  END IF;

  IF coalesce(length(trim(p_order->>'customer_name')), 0) NOT BETWEEN 2 AND 100
     OR coalesce(length(trim(p_order->>'address')), 0) NOT BETWEEN 3 AND 300
     OR coalesce(length(p_order->>'phone'), 0) > 32 THEN
    RAISE EXCEPTION 'სახელი, ტელეფონი ან მისამართი არასწორია.';
  END IF;

  v_phone := regexp_replace(coalesce(p_order->>'phone', ''), '[^0-9]', '', 'g');
  IF length(v_phone) NOT BETWEEN 9 AND 15 THEN
    RAISE EXCEPTION 'ტელეფონის ნომერი უნდა შეიცავდეს 9–15 ციფრს.';
  END IF;

  IF coalesce(length(p_order->>'customer_email'), 0) > 254
     OR coalesce(length(p_order->>'user_email'), 0) > 254
     OR coalesce(length(p_order->>'coupon_code'), 0) > 64
     OR coalesce(length(p_order->>'delivery_region'), 0) > 32 THEN
    RAISE EXCEPTION 'შეკვეთის დამატებითი ველები არასწორია.';
  END IF;

  IF jsonb_typeof(p_order->'items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'შეკვეთის პროდუქტების სია არასწორია.';
  END IF;

  IF jsonb_array_length(p_order->'items') NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'შეკვეთაში პროდუქტების რაოდენობა არასწორია.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_order->'items') AS entry(item)
     WHERE jsonb_typeof(item) IS DISTINCT FROM 'object'
        OR coalesce(length(trim(item->>'id')), 0) NOT BETWEEN 1 AND 64
        OR coalesce(length(item->>'selected_size'), 0) > 40
        OR coalesce(length(item->>'selected_color'), 0) > 60
        OR (item ? 'gift_wrap' AND jsonb_typeof(item->'gift_wrap') IS DISTINCT FROM 'boolean')
        OR (item ? 'vip_warranty' AND jsonb_typeof(item->'vip_warranty') IS DISTINCT FROM 'boolean')
        OR (item ? 'gift_message' AND jsonb_typeof(item->'gift_message') NOT IN ('string', 'null'))
        OR coalesce(length(item->>'gift_message'), 0) > 240
        OR (nullif(trim(item->>'gift_message'), '') IS NOT NULL AND item->'gift_wrap' IS DISTINCT FROM 'true'::jsonb)
  ) THEN
    RAISE EXCEPTION 'პროდუქტის მონაცემები არასწორია.';
  END IF;

  RETURN private.create_order_with_stock(p_order);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_order_with_stock(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock(jsonb) TO anon, authenticated;
