alter table public.orders
  add column if not exists checkout_request jsonb;

create or replace function public.create_order_with_stock(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_item record;
  v_updated integer;
  v_order_id text;
  v_user_email text;
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

  if jsonb_typeof(p_order->'items') <> 'array'
    or jsonb_array_length(p_order->'items') = 0 then
    raise exception 'შეკვეთაში პროდუქტები არ არის.';
  end if;

  v_order_id := p_order->>'id';
  v_user_email := coalesce(p_order->>'user_email', 'guest');

  if auth.uid() is null then
    if v_user_email <> 'guest' then
      raise exception 'სტუმრის შეკვეთის ავტორიზაცია ვერ დადასტურდა.';
    end if;
  elsif lower(v_user_email) <> lower(coalesce(auth.jwt()->>'email', '')) then
    raise exception 'მომხმარებლის სესია შეკვეთის მონაცემებს არ ემთხვევა.';
  end if;

  v_region := coalesce(p_order->>'delivery_region', 'tbilisi');
  v_coupon_code := upper(trim(coalesce(p_order->>'coupon_code', '')));

  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', grouped.product_id, 'quantity', grouped.quantity)
      order by grouped.product_id
    ),
    '[]'::jsonb
  )
  into v_request
  from (
    select item->>'id' as product_id,
           sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_order->'items') e(item)
     group by item->>'id'
  ) grouped;

  v_request := jsonb_build_object(
    'customer_name', p_order->>'customer_name',
    'phone', p_order->>'phone',
    'address', p_order->>'address',
    'user_email', v_user_email,
    'items', v_request,
    'coupon_code', v_coupon_code,
    'delivery_region', v_region
  );

  perform pg_advisory_xact_lock(hashtextextended(v_order_id, 0));

  select * into v_existing
    from public.orders
   where id = v_order_id
   for update;

  if found then
    if v_existing.checkout_request is null
      or v_existing.checkout_request is distinct from v_request then
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

  select fee_gel into v_delivery
    from public.store_delivery_fees
   where region = v_region;

  if not found then
    raise exception 'მიწოდების საფასური ვერ მოიძებნა.';
  end if;

  for v_item in
    select item->>'id' as product_id,
           sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_order->'items') e(item)
     group by item->>'id'
     order by item->>'id'
  loop
    if coalesce(trim(v_item.product_id), '') = ''
      or v_item.quantity is null
      or v_item.quantity <= 0
      or v_item.quantity > 100 then
      raise exception 'პროდუქტის ID ან რაოდენობა არასწორია.';
    end if;

    select id, name, price_gel, stock into v_product
      from public.products
     where id = v_item.product_id
     for update;

    if not found then
      raise exception 'პროდუქტი ვერ მოიძებნა: %', v_item.product_id;
    end if;

    if coalesce(v_product.stock, 0) < v_item.quantity then
      raise exception 'პროდუქტი აღარ არის საკმარისი რაოდენობით მარაგში: %', v_item.product_id;
    end if;

    v_price := v_product.price_gel;
    if v_price is null or v_price < 0 then
      raise exception 'პროდუქტის ფასი არასწორია.';
    end if;

    v_subtotal := v_subtotal + (v_price * v_item.quantity);
    v_line := jsonb_build_object(
      'id', v_product.id,
      'name', v_product.name,
      'price', v_price,
      'quantity', v_item.quantity
    );
    v_items := v_items || jsonb_build_array(v_line);
  end loop;

  if v_coupon_code <> '' then
    select discount_percent, min_order_gel into v_coupon
      from public.store_coupons
     where code = v_coupon_code
       and active = true;

    if not found then
      raise exception 'კუპონი არასწორია ან აღარ არის აქტიური.';
    end if;

    if v_subtotal < v_coupon.min_order_gel then
      raise exception 'კუპონის მინიმალური შეკვეთის თანხა არ შესრულდა.';
    end if;

    v_discount := round(v_subtotal * v_coupon.discount_percent / 100, 2);
  end if;

  v_total := greatest(0, v_subtotal - v_discount) + v_delivery;

  for v_item in
    select item->>'id' as product_id,
           sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_items) e(item)
     group by item->>'id'
     order by item->>'id'
  loop
    update public.products
       set stock = coalesce(stock, 0) - v_item.quantity
     where id = v_item.product_id
       and coalesce(stock, 0) >= v_item.quantity;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'მარაგის განახლება ვერ მოხერხდა პროდუქტისთვის: %', v_item.product_id;
    end if;
  end loop;

  v_result := jsonb_build_object(
    'order_id', v_order_id,
    'stock_deducted', true,
    'items', v_items,
    'subtotal_gel', v_subtotal,
    'discount_gel', v_discount,
    'delivery_gel', v_delivery,
    'total_gel', v_total
  );

  insert into public.orders(
    id, customer_name, phone, address, user_email, items,
    total_gel, status, stock_deducted_at, checkout_result, checkout_request
  )
  values (
    v_order_id, p_order->>'customer_name', p_order->>'phone',
    p_order->>'address', v_user_email, v_items,
    v_total, 'ახალი', now(), v_result, v_request
  );

  return v_result;
end;
$function$;
