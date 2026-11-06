-- GEOSTORE: keep per-variant stock synchronized through cancel/reactivate.
-- Global product stock remains unchanged as the aggregate inventory limit.
-- Missing/deleted variant records stop the transaction rather than silently
-- corrupting stock accounting. Apply only after migration history is reconciled.
do $guard$
begin
  if to_regprocedure('private.admin_update_order_status(text,text)') is null
     or to_regprocedure('private.admin_reactivate_cancelled_order(text)') is null then
    raise exception 'Required private order functions are missing; reconcile prior migrations before applying this change.';
  end if;
end;
$guard$;

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
  v_variant jsonb;
  v_variant_stock_text text;
  v_variant_stock integer;
  v_product record;

begin
  if coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     or auth.uid() is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid then
    raise exception 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  end if;
  if p_new_status is null
     or p_new_status not in ('ახალი', 'მუშავდება', 'გაგზავნილი', 'დასრულებული', 'გაუქმებული') then
    raise exception 'შეკვეთის სტატუსი არასწორია.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'შეკვეთა ვერ მოიძებნა.'; end if;
  if v_order.status = 'გაუქმებული' and p_new_status <> 'გაუქმებული' then
    raise exception 'გაუქმებული შეკვეთის ხელახლა გააქტიურება დაუშვებელია.';
  end if;

  if p_new_status = 'გაუქმებული'
     and v_order.status <> 'გაუქმებული'
     and v_order.stock_deducted_at is not null
     and v_order.stock_restored_at is null then
    for v_item in
      select item->>'id' as product_id,
             sum((item->>'quantity')::integer)::integer as quantity
        from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) as e(item)
       group by item->>'id'
       order by item->>'id'
    loop
      update public.products
         set stock = coalesce(stock, 0) + v_item.quantity
       where id = v_item.product_id;
      get diagnostics v_updated = row_count;
      if v_updated <> 1 then
        raise exception 'მარაგის აღდგენა ვერ მოხერხდა პროდუქტისთვის: %', v_item.product_id;
      end if;
    end loop;
    -- Restore the selected variant's own stock before marking the order cancelled.
    for v_item in
      select item->>'id' as product_id,
             coalesce(item->>'selected_variant_id', item->>'selectedVariantId') as variant_id,
             sum((item->>'quantity')::integer)::integer as quantity
        from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) as e(item)
       where coalesce(trim(coalesce(item->>'selected_variant_id', item->>'selectedVariantId')), '') <> ''
       group by item->>'id', coalesce(item->>'selected_variant_id', item->>'selectedVariantId')
       order by item->>'id', coalesce(item->>'selected_variant_id', item->>'selectedVariantId')
    loop
      select variants into v_product
        from public.products where id = v_item.product_id for update;
      if not found then
        raise exception 'პროდუქტი ვერ მოიძებნა ვარიანტის მარაგის აღსადგენად: %', v_item.product_id;
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
        raise exception 'შეკვეთის ვარიანტი აღარ არსებობს; მარაგის აღდგენა შეჩერებულია.';
      end if;
      v_variant_stock_text := v_variant->>'stock';
      if coalesce(v_variant_stock_text, '') <> '' then
        if v_variant_stock_text !~ '^[0-9]{1,9}$' then
          raise exception 'ვარიანტის მარაგის მონაცემი არასწორია.';
        end if;
        v_variant_stock := v_variant_stock_text::integer + v_item.quantity;
        update public.products p
           set variants = (
             select jsonb_agg(
               case when entry.variant->>'id' = v_item.variant_id
                 then jsonb_set(entry.variant, '{stock}', to_jsonb(v_variant_stock), true)
                 else entry.variant
               end order by entry.ordinality
             )
               from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb))
                    with ordinality as entry(variant, ordinality)
           )
         where p.id = v_item.product_id;
      end if;
    end loop;

    update public.orders set status = p_new_status, stock_restored_at = now()
     where id = p_order_id;
  else
    update public.orders set status = p_new_status where id = p_order_id;
  end if;
  return jsonb_build_object('order_id', p_order_id, 'status', p_new_status);
end;
$function$;

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
  v_variant jsonb;
  v_variant_stock_text text;
  v_variant_stock integer;
  v_product record;

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
  if jsonb_typeof(coalesce(v_order.items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(v_order.items, '[]'::jsonb)) = 0 then
    raise exception 'შეკვეთის პროდუქტების სია ცარიელია ან არასწორია.';
  end if;

  for v_item in
    select item->>'id' as product_id,
           sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_order.items) as e(item)
     group by item->>'id'
     order by item->>'id'
  loop
    if coalesce(trim(v_item.product_id), '') = ''
       or v_item.quantity is null
       or v_item.quantity <= 0 then
      raise exception 'შეკვეთის პროდუქტის ID ან რაოდენობა არასწორია.';
    end if;

    update public.products
       set stock = coalesce(stock, 0) - v_item.quantity
     where id = v_item.product_id
       and coalesce(stock, 0) >= v_item.quantity;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'მარაგში აღარ არის საკმარისი რაოდენობა პროდუქტისთვის: %', v_item.product_id;
    end if;
  end loop;

  -- Restore the selected variant's own stock reservation as well as
  -- the aggregate product stock already deducted above.
  for v_item in
    select item->>'id' as product_id,
           coalesce(item->>'selected_variant_id', item->>'selectedVariantId') as variant_id,
           sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_order.items) as e(item)
     where coalesce(trim(coalesce(item->>'selected_variant_id', item->>'selectedVariantId')), '') <> ''
     group by item->>'id', coalesce(item->>'selected_variant_id', item->>'selectedVariantId')
     order by item->>'id', coalesce(item->>'selected_variant_id', item->>'selectedVariantId')
  loop
    select variants into v_product
      from public.products where id = v_item.product_id for update;
    if not found then
      raise exception 'პროდუქტი ვერ მოიძებნა ვარიანტის მარაგის აღსადგენად: %', v_item.product_id;
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
      raise exception 'შეკვეთის ვარიანტი აღარ არსებობს; ხელახლა გააქტიურება შეჩერებულია.';
    end if;
    v_variant_stock_text := v_variant->>'stock';
    if coalesce(v_variant_stock_text, '') <> '' then
      if v_variant_stock_text !~ '^[0-9]{1,9}$' then
        raise exception 'ვარიანტის მარაგის მონაცემი არასწორია.';
      end if;
      v_variant_stock := v_variant_stock_text::integer;
      if v_variant_stock < v_item.quantity then
        raise exception 'არჩეული ვარიანტის მარაგი აღარ არის საკმარისი ხელახლა გასააქტიურებლად.';
      end if;
      update public.products p
         set variants = (
           select jsonb_agg(
             case when entry.variant->>'id' = v_item.variant_id
               then jsonb_set(entry.variant, '{stock}', to_jsonb(v_variant_stock - v_item.quantity), true)
               else entry.variant
             end order by entry.ordinality
           )
             from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb))
                  with ordinality as entry(variant, ordinality)
         )
       where p.id = v_item.product_id;
    end if;
  end loop;

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
$function$;
