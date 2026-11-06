-- GEOSTORE: server-authoritative pricing and inventory for custom variants/add-ons.
-- Preserves the existing checkout authentication, coupon, delivery, idempotency,
-- product-level stock transaction, and order snapshot behavior.
-- Apply only after the historical migration chain has been reconciled.
do $guard$
begin
  if to_regprocedure('private.create_order_with_stock(jsonb)') is null then
    raise exception 'Required private checkout function is missing; reconcile prior migrations before applying this change.';
  end if;
end;
$guard$;

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
  v_variant jsonb;
  v_variant_id text;
  v_variant_name text;
  v_variant_price numeric;
  v_variant_price_text text;
  v_variant_stock_text text;
  v_variant_stock integer;
  v_gift_wrap boolean;
  v_gift_message text;
  v_vip_warranty boolean;
  v_addon numeric;
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
       or length(coalesce(item->>'selected_variant_id', '')) > 80
       or length(coalesce(item->>'selected_variant', '')) > 120
       or length(coalesce(item->>'gift_message', '')) > 300
       or (item ? 'gift_wrap' and jsonb_typeof(item->'gift_wrap') is distinct from 'boolean')
       or (item ? 'vip_warranty' and jsonb_typeof(item->'vip_warranty') is distinct from 'boolean')
       or (
         coalesce(trim(item->>'gift_message'), '') <> ''
         and coalesce((item->>'gift_wrap')::boolean, false) is not true
       )
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
          || case when grouped.selected_variant_id is not null
               then jsonb_build_object('selected_variant_id', grouped.selected_variant_id, 'selected_variant', grouped.selected_variant)
               else '{}'::jsonb end
          || case when grouped.gift_wrap
               then jsonb_build_object('gift_wrap', true, 'gift_message', grouped.gift_message)
               else '{}'::jsonb end
          || case when grouped.vip_warranty
               then jsonb_build_object('vip_warranty', true)
               else '{}'::jsonb end
          order by grouped.product_id, grouped.selected_size nulls first, grouped.selected_color nulls first,
                   grouped.selected_variant_id nulls first, grouped.gift_wrap, grouped.vip_warranty
        ),
        '[]'::jsonb
      )
      from (
        select
          item->>'id' as product_id,
          nullif(trim(item->>'selected_size'), '') as selected_size,
          nullif(trim(item->>'selected_color'), '') as selected_color,
          nullif(trim(item->>'selected_variant_id'), '') as selected_variant_id,
          nullif(trim(item->>'selected_variant'), '') as selected_variant,
          coalesce((item->>'gift_wrap')::boolean, false) as gift_wrap,
          nullif(trim(item->>'gift_message'), '') as gift_message,
          coalesce((item->>'vip_warranty')::boolean, false) as vip_warranty,
          sum((item->>'quantity')::integer)::integer as quantity
        from jsonb_array_elements(p_order->'items') e(item)
        group by
          item->>'id',
          nullif(trim(item->>'selected_size'), ''),
          nullif(trim(item->>'selected_color'), ''),
          nullif(trim(item->>'selected_variant_id'), ''),
          nullif(trim(item->>'selected_variant'), ''),
          coalesce((item->>'gift_wrap')::boolean, false),
          nullif(trim(item->>'gift_message'), ''),
          coalesce((item->>'vip_warranty')::boolean, false)
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
    if v_product.price_gel is null or v_product.price_gel < 0 then
      raise exception 'პროდუქტის ფასი არასწორია.';
    end if;
  end loop;

  -- Keep each selected configuration as a separate order line. All
  -- configurable prices are resolved from the server-side catalogue.
  for v_item in
    select
      item->>'id' as product_id,
      (item->>'quantity')::integer as quantity,
      nullif(trim(item->>'selected_size'), '') as selected_size,
      nullif(trim(item->>'selected_color'), '') as selected_color,
      nullif(trim(item->>'selected_variant_id'), '') as selected_variant_id,
      nullif(trim(item->>'selected_variant'), '') as selected_variant,
      coalesce((item->>'gift_wrap')::boolean, false) as gift_wrap,
      nullif(trim(item->>'gift_message'), '') as gift_message,
      coalesce((item->>'vip_warranty')::boolean, false) as vip_warranty
    from jsonb_array_elements(p_order->'items') e(item)
    order by item->>'id', item->>'selected_size', item->>'selected_color',
             item->>'selected_variant_id', item->>'gift_wrap', item->>'vip_warranty'
  loop
    select id, name, price_gel, purchase_cost, vendor, category, variants into v_product
      from public.products where id = v_item.product_id;
    if not found then raise exception 'პროდუქტი ვერ მოიძებნა: %', v_item.product_id; end if;

    v_variant := null;
    v_variant_id := v_item.selected_variant_id;
    v_variant_name := v_item.selected_variant;
    v_variant_price := v_product.price_gel;

    if v_variant_id is not null or v_variant_name is not null then
      select entry.variant into v_variant
        from jsonb_array_elements(
          case when jsonb_typeof(coalesce(v_product.variants, '[]'::jsonb)) = 'array'
               then coalesce(v_product.variants, '[]'::jsonb)
               else '[]'::jsonb end
        ) as entry(variant)
       where (v_variant_id is not null and entry.variant->>'id' = v_variant_id)
          or (v_variant_id is null and v_variant_name is not null and entry.variant->>'name' = v_variant_name)
       limit 1;
      if v_variant is null then
        raise exception 'არჩეული პროდუქტის ვარიანტი აღარ არსებობს. განაახლეთ პროდუქტი და სცადეთ თავიდან.';
      end if;
      if v_variant_name is not null and v_variant->>'name' is distinct from v_variant_name then
        raise exception 'არჩეული პროდუქტის ვარიანტი არ ემთხვევა კატალოგს.';
      end if;
      v_variant_name := nullif(trim(v_variant->>'name'), '');
      v_variant_price_text := coalesce(v_variant->>'priceGEL', v_variant->>'price_gel');
      if coalesce(v_variant_price_text, '') !~ '^[0-9]+([.][0-9]{1,2})?$' then
        raise exception 'პროდუქტის ვარიანტის ფასი არასწორია.';
      end if;
      v_variant_price := v_variant_price_text::numeric;
    end if;

    if v_variant_price is null or v_variant_price < 0 then
      raise exception 'პროდუქტის ფასი არასწორია.';
    end if;

    v_gift_wrap := coalesce(v_item.gift_wrap, false);
    v_gift_message := case when v_gift_wrap then v_item.gift_message else null end;
    v_vip_warranty := coalesce(v_item.vip_warranty, false);
    v_addon := (case when v_gift_wrap then 5 else 0 end)
             + (case when v_vip_warranty then 15 else 0 end);
    v_price := v_variant_price + v_addon;
    v_subtotal := v_subtotal + (v_price * v_item.quantity);

    v_line := jsonb_build_object(
      'id', v_product.id,
      'name', v_product.name,
      'price', v_price,
      'base_price', v_product.price_gel,
      'variant_price', v_variant_price,
      'gift_wrap_fee', case when v_gift_wrap then 5 else 0 end,
      'vip_warranty_fee', case when v_vip_warranty then 15 else 0 end,
      'quantity', v_item.quantity,
      'selectedSize', v_item.selected_size,
      'selectedColor', v_item.selected_color,
      'selected_variant', v_variant_name,
      'selected_variant_id', v_variant_id,
      'gift_wrap', v_gift_wrap,
      'gift_message', v_gift_message,
      'vip_warranty', v_vip_warranty,
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
  v_total := round(greatest(0, v_subtotal - v_discount) + v_delivery, 2);
  for v_item in
    select item->>'id' as product_id, sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_items) e(item) group by item->>'id' order by item->>'id'
  loop
    update public.products set stock = coalesce(stock, 0) - v_item.quantity
     where id = v_item.product_id and coalesce(stock, 0) >= v_item.quantity;
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then raise exception 'მარაგის განახლება ვერ მოხერხდა პროდუქტისთვის: %', v_item.product_id; end if;
  end loop;
  -- Enforce and deduct per-variant stock where the variant defines a stock count.
  -- The product-level stock remains the aggregate cap and is deducted above.
  for v_item in
    select item->>'id' as product_id,
           item->>'selected_variant_id' as variant_id,
           sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_items) e(item)
     where coalesce(trim(item->>'selected_variant_id'), '') <> ''
     group by item->>'id', item->>'selected_variant_id'
     order by item->>'id', item->>'selected_variant_id'
  loop
    select variants into v_product
      from public.products
     where id = v_item.product_id
     for update;
    if not found then
      raise exception 'პროდუქტი ვერ მოიძებნა: %', v_item.product_id;
    end if;
    select entry.variant into v_variant
      from jsonb_array_elements(
        case when jsonb_typeof(coalesce(v_product.variants, '[]'::jsonb)) = 'array'
             then coalesce(v_product.variants, '[]'::jsonb)
             else '[]'::jsonb end
      ) as entry(variant)
     where entry.variant->>'id' = v_item.variant_id
     limit 1;
    if v_variant is null then
      raise exception 'არჩეული ვარიანტი აღარ არსებობს. განაახლეთ პროდუქტი და სცადეთ თავიდან.';
    end if;
    v_variant_stock_text := v_variant->>'stock';
    if coalesce(v_variant_stock_text, '') <> '' then
      if v_variant_stock_text !~ '^[0-9]{1,9}$' then
        raise exception 'პროდუქტის ვარიანტის მარაგის მონაცემი არასწორია.';
      end if;
      v_variant_stock := v_variant_stock_text::integer;
      if v_variant_stock < v_item.quantity then
        raise exception 'არჩეული ვარიანტის მარაგი აღარ არის საკმარისი.';
      end if;
      update public.products p
         set variants = (
           select jsonb_agg(
             case when entry.variant->>'id' = v_item.variant_id
               then jsonb_set(entry.variant, '{stock}', to_jsonb(v_variant_stock - v_item.quantity), true)
               else entry.variant
             end
             order by entry.ordinality
           )
             from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb))
                  with ordinality as entry(variant, ordinality)
         )
       where p.id = v_item.product_id;
    end if;
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
