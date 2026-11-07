-- Atomic custom product variants: server-authoritative pricing and stock, cancellation/reactivation, and stale-admin protection.
BEGIN;
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
  v_variant jsonb;
  v_variant_price numeric;
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
       or length(coalesce(item->>'custom_variant_id', '')) > 120
       or (item ? 'custom_variant_id' and jsonb_typeof(item->'custom_variant_id') not in ('string', 'null'))
       or (jsonb_typeof(item->'custom_variant_id') = 'string' and nullif(trim(item->>'custom_variant_id'), '') is null)
       or (item ? 'gift_message' and jsonb_typeof(item->'gift_message') not in ('string', 'null'))
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
          order by grouped.product_id, grouped.selected_size nulls first,
                   grouped.selected_color nulls first, grouped.custom_variant_id nulls first
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
          grouped.selected_color nulls first, grouped.custom_variant_id nulls first,
          grouped.gift_wrap, grouped.vip_warranty, grouped.gift_message), '[]'::jsonb)
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
      select count(*) into v_variant_count
        from jsonb_array_elements(case when jsonb_typeof(v_product.variants) = 'array' then v_product.variants else '[]'::jsonb end) as entry(element)
       where element->>'id' = v_item.custom_variant_id;
      if v_variant_count <> 1 then
        raise exception 'არჩეული ვარიანტი ვერ მოიძებნა ან დუბლირებულია.';
      end if;
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
      item->>'custom_variant_id', item->>'gift_wrap', item->>'vip_warranty', item->>'gift_message'
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
$function$
;
CREATE OR REPLACE FUNCTION private.admin_update_order_status(p_order_id text, p_new_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_updated integer;
begin
  if coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     or auth.uid() is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid then
    raise exception 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  end if;

  if p_new_status is null
     or p_new_status not in ('ახალი', 'მუშავდება', 'გაგზავნილი', 'დასრულებული', 'გაუქმებული') then
    raise exception 'შეკვეთის სტატუსი არასწორია.';
  end if;

  select * into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'შეკვეთა ვერ მოიძებნა.';
  end if;

  if v_order.status in ('დასრულებული', 'ჩაბარებულია')
     and p_new_status not in ('დასრულებული', 'ჩაბარებულია') then
    raise exception 'ჩაბარებული შეკვეთა დასრულებულად რჩება. სტატუსის უკუსვლა დაუშვებელია.';
  end if;

  if v_order.status in ('გაგზავნილი', 'გზაშია')
     and p_new_status not in ('გაგზავნილი', 'გზაშია', 'დასრულებული', 'ჩაბარებულია') then
    raise exception 'გაგზავნილი შეკვეთის წინა სტატუსზე დაბრუნება ან გაუქმება დაუშვებელია.';
  end if;

  if v_order.status = 'გაუქმებული' and p_new_status <> 'გაუქმებული' then
    raise exception 'გაუქმებული შეკვეთის ხელახლა გააქტიურება დაუშვებელია.';
  end if;

  if p_new_status = 'გაუქმებული'
     and v_order.status <> 'გაუქმებული'
     and v_order.stock_deducted_at is not null
     and v_order.stock_restored_at is null then
    if jsonb_typeof(coalesce(v_order.items, '[]'::jsonb)) is distinct from 'array' then
      raise exception 'შეკვეთის პროდუქტების სია არასწორია.';
    end if;
    if jsonb_array_length(coalesce(v_order.items, '[]'::jsonb)) = 0 then
      raise exception 'შეკვეთის პროდუქტების სია ცარიელია.';
    end if;

    -- Validate each raw line before aggregation. This prevents a negative or
    -- malformed quantity from being hidden by another line for the same SKU.
    if exists (
      select 1
        from jsonb_array_elements(v_order.items) as e(item)
       where jsonb_typeof(e.item) is distinct from 'object'
          or coalesce(trim(e.item->>'id'), '') = ''
          or coalesce(e.item->>'quantity', '') !~ ('^[0-9]+' || chr(36))
          or case
               when coalesce(e.item->>'quantity', '') ~ ('^[0-9]+' || chr(36))
                 then (e.item->>'quantity')::numeric not between 1 and 100
               else true
             end
    ) then
      raise exception 'შეკვეთის პროდუქტის ID ან რაოდენობა არასწორია.';
    end if;

    if exists (
      select 1
        from jsonb_array_elements(v_order.items) as e(item)
       group by e.item->>'id'
      having sum((e.item->>'quantity')::numeric) > 100
    ) then
      raise exception 'ერთი პროდუქტის ჯამური რაოდენობა 100-ს არ უნდა აღემატებოდეს.';
    end if;

    perform set_config('geostore.variant_stock_adjustment', 'on', true);
    for v_item in
      select item->>'id' as product_id,
             nullif(trim(item->>'customVariantId'), '') as custom_variant_id,
             sum((item->>'quantity')::integer)::integer as quantity
        from jsonb_array_elements(v_order.items) as e(item)
       group by item->>'id', nullif(trim(item->>'customVariantId'), '')
       order by item->>'id', nullif(trim(item->>'customVariantId'), '')
    loop
      if coalesce(trim(v_item.product_id), '') = '' or v_item.quantity is null or v_item.quantity <= 0 then
        raise exception 'შეკვეთის პროდუქტის ID ან რაოდენობა არასწორია.';
      end if;

      if v_item.custom_variant_id is null then
        update public.products set stock = coalesce(stock, 0) + v_item.quantity
         where id = v_item.product_id;
      else
        update public.products p
           set variants = (
             select jsonb_agg(
               case when element->>'id' = v_item.custom_variant_id
                 then jsonb_set(element, '{stock}', to_jsonb((element->>'stock')::integer + v_item.quantity), true)
                 else element end
               order by ordinality
             )
             from jsonb_array_elements(case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end)
               with ordinality as variant_rows(element, ordinality)
           )
         where p.id = v_item.product_id
           and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end) element where element->>'id' = v_item.custom_variant_id);
      end if;

      get diagnostics v_updated = row_count;
      if v_updated <> 1 then raise exception 'მარაგის აღდგენა ვერ მოხერხდა პროდუქტისთვის ან ვარიანტისთვის: %', v_item.product_id; end if;
    end loop;

    update public.orders
       set status = p_new_status,
           stock_restored_at = now()
     where id = p_order_id;
  else
    update public.orders
       set status = p_new_status
     where id = p_order_id;
  end if;

  return jsonb_build_object('order_id', p_order_id, 'status', p_new_status);
end;
$function$
;
CREATE OR REPLACE FUNCTION private.admin_reactivate_cancelled_order(p_order_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_updated integer;
  v_password_auth_time bigint;
begin
  if auth.uid() is null
     or coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     or auth.uid() is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid then
    raise exception 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  end if;

  select max((entry->>'timestamp')::bigint)
    into v_password_auth_time
    from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) as entry
   where entry->>'method' = 'password'
     and coalesce(entry->>'timestamp', '') ~ '^[0-9]+$';

  if v_password_auth_time is null
     or extract(epoch from now())::bigint - v_password_auth_time > 300
     or v_password_auth_time > extract(epoch from now())::bigint + 30 then
    raise exception 'ხელახლა გააქტიურებისთვის საჭიროა ადმინისტრატორის პაროლის ახლიდან დადასტურება.';
  end if;

  select * into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'შეკვეთა ვერ მოიძებნა.';
  end if;
  if v_order.status <> 'გაუქმებული' then
    raise exception 'მხოლოდ გაუქმებული შეკვეთის ხელახლა გააქტიურებაა შესაძლებელი.';
  end if;
  if v_order.stock_restored_at is null then
    raise exception 'შეკვეთის მარაგის აღდგენის ჩანაწერი ვერ დადასტურდა.';
  end if;
  if v_order.stock_deducted_at is null then
    raise exception 'შეკვეთას მარაგის ჩამოჭრის ჩანაწერი არ აქვს.';
  end if;
  if jsonb_typeof(coalesce(v_order.items, '[]'::jsonb)) is distinct from 'array' then
    raise exception 'შეკვეთის პროდუქტების სია არასწორია.';
  end if;
  if jsonb_array_length(coalesce(v_order.items, '[]'::jsonb)) = 0 then
    raise exception 'შეკვეთის პროდუქტების სია ცარიელია.';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_order.items) as e(item)
     where jsonb_typeof(e.item) is distinct from 'object'
        or coalesce(trim(e.item->>'id'), '') = ''
        or coalesce(e.item->>'quantity', '') !~ '^[0-9]{1,3}$'
        or case
             when coalesce(e.item->>'quantity', '') ~ '^[0-9]{1,3}$'
               then (e.item->>'quantity')::numeric not between 1 and 100
             else true
           end
  ) then
    raise exception 'შეკვეთის პროდუქტის ID ან რაოდენობა არასწორია.';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_order.items) as e(item)
     group by e.item->>'id'
    having sum((e.item->>'quantity')::numeric) > 100
  ) then
    raise exception 'ერთი პროდუქტის ჯამური რაოდენობა 100-ს არ უნდა აღემატებოდეს.';
  end if;

  perform set_config('geostore.variant_stock_adjustment', 'on', true);
  for v_item in
    select item->>'id' as product_id,
           nullif(trim(item->>'customVariantId'), '') as custom_variant_id,
           sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_order.items) as e(item)
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
         and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end) element where element->>'id' = v_item.custom_variant_id and coalesce((element->>'stock')::integer, 0) >= v_item.quantity);
    end if;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'მარაგში აღარ არის საკმარისი რაოდენობა პროდუქტისთვის ან ვარიანტისთვის: %', v_item.product_id;
    end if;
  end loop;

  -- Mark this transaction so the trigger permits reactivation only
  -- through this RPC, after stock has been atomically deducted above.
  perform set_config('geostore.order_reactivation', 'on', true);

  update public.orders
     set status = 'ახალი',
         stock_deducted_at = now(),
         stock_restored_at = null
   where id = p_order_id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'ახალი',
    'stock_deducted', true,
    'reauthorized', true
  );
end;
$function$
;
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
  IF coalesce(current_setting('geostore.variant_stock_adjustment', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF jsonb_typeof(coalesce(NEW.variants, '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტების მონაცემები არასწორია.';
  END IF;
  FOR v_removed IN
    SELECT old_variant FROM jsonb_array_elements(coalesce(OLD.variants, '[]'::jsonb)) old_variant
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(coalesce(NEW.variants, '[]'::jsonb)) new_variant
      WHERE new_variant->>'id' = old_variant->>'id'
    )
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.orders o
      CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) item
      WHERE item->>'id' = OLD.id AND item->>'customVariantId' = v_removed->>'id'
    ) THEN
      RAISE EXCEPTION 'ვარიანტი შეკვეთების ისტორიაში გამოიყენება და მისი წაშლა დაუშვებელია.';
    END IF;
  END LOOP;
  FOR v_variant IN SELECT value FROM jsonb_array_elements(coalesce(NEW.variants, '[]'::jsonb))
  LOOP
    IF jsonb_typeof(v_variant) IS DISTINCT FROM 'object'
       OR coalesce(trim(v_variant->>'id'), '') = ''
       OR coalesce(trim(v_variant->>'name'), '') = ''
       OR coalesce(v_variant->>'priceGEL', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
       OR coalesce(v_variant->>'stock', '') !~ '^[0-9]{1,7}$' THEN
      RAISE EXCEPTION 'პროდუქტის ვარიანტის სახელი, ფასი ან მარაგი არასწორია.';
    END IF;
    SELECT value INTO v_existing
      FROM jsonb_array_elements(coalesce(OLD.variants, '[]'::jsonb))
     WHERE value->>'id' = v_variant->>'id'
     LIMIT 1;
    IF v_existing IS NOT NULL THEN
      IF coalesce(v_existing->>'stock', '') !~ '^[0-9]{1,7}$' THEN
        RAISE EXCEPTION 'არსებული ვარიანტის მარაგის ჩანაწერი არასწორია.';
      END IF;
      v_variant := jsonb_set(v_variant, '{stock}', to_jsonb((v_existing->>'stock')::integer), true);
    ELSE
      IF EXISTS (
        SELECT 1 FROM public.orders o
        CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) item
        WHERE item->>'id' = NEW.id AND item->>'customVariantId' = v_variant->>'id'
      ) THEN
        RAISE EXCEPTION 'ამ ვარიანტის ID შეკვეთების ისტორიაში უკვე გამოიყენება.';
      END IF;
    END IF;
    v_result := v_result || jsonb_build_array(v_variant);
    v_existing := NULL;
  END LOOP;
  NEW.variants := v_result;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION private.lookup_order_for_tracking(p_order_id text, p_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_order public.orders%rowtype;
  v_input_phone text;
  v_input_order text;
  v_phone_hash text;
  v_order_hash text;
  v_phone_attempts integer;
  v_order_attempts integer;
  v_phone_window timestamptz;
  v_order_window timestamptz;
  v_retry_after integer;
BEGIN
  -- Bound input size before normalization or database work.
  IF coalesce(length(p_order_id), 0) > 64
     OR coalesce(length(p_phone), 0) > 32 THEN
    RETURN NULL;
  END IF;

  v_input_order := upper(trim(coalesce(p_order_id, '')));
  v_input_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  IF length(v_input_order) < 6
     OR length(v_input_order) > 64
     OR v_input_order !~ '^[A-Z0-9_-]+$'
     OR length(v_input_phone) < 9
     OR length(v_input_phone) > 15 THEN
    RETURN NULL;
  END IF;

  -- Remove expired buckets so old lookup keys do not accumulate indefinitely.
  DELETE FROM private.order_tracking_rate_limits
   WHERE window_started_at < now() - interval '1 hour';

  -- SHA-256 hashes prevent raw phone numbers/order codes being stored in this table.
  v_phone_hash := encode(
    extensions.digest(convert_to('phone:' || v_input_phone, 'UTF8'), 'sha256'),
    'hex'
  );
  v_order_hash := encode(
    extensions.digest(convert_to('order:' || v_input_order, 'UTF8'), 'sha256'),
    'hex'
  );

  -- Independent 15-minute buckets: 10 attempts per phone and 10 per order code.
  INSERT INTO private.order_tracking_rate_limits AS limits
    (bucket_type, bucket_hash, window_started_at, attempts)
  VALUES ('phone', v_phone_hash, now(), 1)
  ON CONFLICT (bucket_type, bucket_hash) DO UPDATE
    SET attempts = CASE
          WHEN limits.window_started_at <= now() - interval '15 minutes' THEN 1
          ELSE limits.attempts + 1
        END,
        window_started_at = CASE
          WHEN limits.window_started_at <= now() - interval '15 minutes' THEN now()
          ELSE limits.window_started_at
        END
  RETURNING attempts, window_started_at
    INTO v_phone_attempts, v_phone_window;

  INSERT INTO private.order_tracking_rate_limits AS limits
    (bucket_type, bucket_hash, window_started_at, attempts)
  VALUES ('order', v_order_hash, now(), 1)
  ON CONFLICT (bucket_type, bucket_hash) DO UPDATE
    SET attempts = CASE
          WHEN limits.window_started_at <= now() - interval '15 minutes' THEN 1
          ELSE limits.attempts + 1
        END,
        window_started_at = CASE
          WHEN limits.window_started_at <= now() - interval '15 minutes' THEN now()
          ELSE limits.window_started_at
        END
  RETURNING attempts, window_started_at
    INTO v_order_attempts, v_order_window;

  IF v_phone_attempts > 10 OR v_order_attempts > 10 THEN
    v_retry_after := greatest(
      1,
      ceil(extract(epoch FROM (
        greatest(v_phone_window, v_order_window) + interval '15 minutes' - now()
      )))::integer
    );
    RETURN jsonb_build_object(
      'rateLimited', true,
      'retryAfterSeconds', v_retry_after
    );
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE upper(id) = v_input_order
     AND regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = v_input_phone
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'totalGEL', v_order.total_gel,
    'status', coalesce(v_order.status, 'ახალი'),
    'date', to_char(v_order.created_at at time zone 'Asia/Tbilisi', 'DD.MM.YYYY'),
    'itemSummary', coalesce((
      SELECT string_agg(
        coalesce(item->>'name', 'პროდუქტი') ||
        CASE WHEN nullif(trim(item->>'customVariantName'), '') IS NOT NULL
          THEN ' — ' || trim(item->>'customVariantName') ELSE '' END ||
        ' (x' || coalesce(item->>'quantity', '1') || ')',
        ', '
      )
      FROM jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) AS item
    ), 'პროდუქტები')
  );
END;
$function$
;
DROP TRIGGER IF EXISTS preserve_product_variant_stock ON public.products;
CREATE TRIGGER preserve_product_variant_stock
BEFORE UPDATE OF variants ON public.products
FOR EACH ROW EXECUTE FUNCTION private.preserve_product_variant_stock();
REVOKE ALL ON FUNCTION private.preserve_product_variant_stock() FROM PUBLIC, anon, authenticated;
-- Validate final variant JSON after stock-preservation triggers have run.
-- This also runs for inserts and for the controlled inventory RPC, which bypasses
-- only the stale-stock preservation trigger.
CREATE OR REPLACE FUNCTION private.validate_product_variant_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $validate_variant$
BEGIN
  IF jsonb_typeof(NEW.variants) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტების სია არასწორია.';
  END IF;
  IF jsonb_array_length(NEW.variants) > 50 THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტების რაოდენობა დასაშვებ ზღვარს აჭარბებს.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(NEW.variants) AS e(item)
     WHERE jsonb_typeof(item) IS DISTINCT FROM 'object'
        OR jsonb_typeof(item -> 'id') IS DISTINCT FROM 'string'
        OR jsonb_typeof(item -> 'name') IS DISTINCT FROM 'string'
        OR NULLIF(trim(item ->> 'id'), '') IS NULL
        OR length(trim(item ->> 'id')) > 80
        OR NULLIF(trim(item ->> 'name'), '') IS NULL
        OR length(trim(item ->> 'name')) > 80
        OR coalesce(item ->> 'priceGEL', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
        OR coalesce(item ->> 'stock', '') !~ '^[0-9]{1,7}$'
        OR CASE
             WHEN coalesce(item ->> 'stock', '') ~ '^[0-9]{1,7}$'
               THEN (item ->> 'stock')::integer > 1000000
             ELSE TRUE
           END
  ) THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტის ID, სახელი, ფასი ან მარაგი არასწორია.';
  END IF;

  IF EXISTS (
    SELECT item ->> 'id'
      FROM jsonb_array_elements(NEW.variants) AS e(item)
     GROUP BY item ->> 'id'
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT lower(trim(item ->> 'name'))
      FROM jsonb_array_elements(NEW.variants) AS e(item)
     GROUP BY lower(trim(item ->> 'name'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტის ID ან სახელი დუბლირებულია.';
  END IF;

  RETURN NEW;
END;
$validate_variant$;

REVOKE ALL ON FUNCTION private.validate_product_variant_identity() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS z_validate_product_variant_identity ON public.products;
CREATE TRIGGER z_validate_product_variant_identity
BEFORE INSERT OR UPDATE OF variants ON public.products
FOR EACH ROW EXECUTE FUNCTION private.validate_product_variant_identity();

COMMIT;
