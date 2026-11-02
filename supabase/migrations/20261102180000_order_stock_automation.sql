-- GEOSTORE: atomic checkout stock deduction and one-time cancellation restoration
alter table public.orders
  add column if not exists stock_deducted_at timestamptz,
  add column if not exists stock_restored_at timestamptz;

create or replace function public.create_order_with_stock(p_order jsonb)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_updated integer;
  v_order_id text;
  v_user_email text;
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
  if coalesce((p_order->>'total_gel')::numeric, -1) < 0 then
    raise exception 'შეკვეთის ჯამი არასწორია.';
  end if;

  v_user_email := coalesce(p_order->>'user_email', 'guest');
  if auth.uid() is null then
    if v_user_email <> 'guest' then
      raise exception 'სტუმრის შეკვეთის ავტორიზაცია ვერ დადასტურდა.';
    end if;
  elsif lower(v_user_email) <> lower(coalesce(auth.jwt()->>'email', '')) then
    raise exception 'მომხმარებლის სესია შეკვეთის მონაცემებს არ ემთხვევა.';
  end if;

  for v_item in
    select item->>'id' as product_id,
           sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_order->'items') as item
     group by item->>'id'
     order by item->>'id'
  loop
    if coalesce(trim(v_item.product_id), '') = ''
       or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'პროდუქტის ID ან რაოდენობა არასწორია.';
    end if;
    update public.products
       set stock = coalesce(stock, 0) - v_item.quantity
     where id = v_item.product_id
       and coalesce(stock, 0) >= v_item.quantity;
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'პროდუქტი აღარ არის საკმარისი რაოდენობით მარაგში: %', v_item.product_id;
    end if;
  end loop;

  v_order_id := p_order->>'id';
  insert into public.orders (
    id, customer_name, phone, address, user_email, items,
    total_gel, status, stock_deducted_at
  ) values (
    v_order_id, p_order->>'customer_name', p_order->>'phone',
    p_order->>'address', v_user_email, p_order->'items',
    (p_order->>'total_gel')::numeric, 'ახალი', now()
  );
  return jsonb_build_object('order_id', v_order_id, 'stock_deducted', true);
end;
$$;

create or replace function public.admin_update_order_status(p_order_id text, p_new_status text)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_updated integer;
begin
  if coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     or lower(coalesce(auth.jwt()->>'email', '')) <> 'chixradzezauri@gmail.com' then
    raise exception 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  end if;
  if p_new_status not in ('ახალი', 'მუშავდება', 'გაგზავნილი', 'დასრულებული', 'გაუქმებული') then
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
        from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) as item
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
    update public.orders set status = p_new_status, stock_restored_at = now()
     where id = p_order_id;
  else
    update public.orders set status = p_new_status where id = p_order_id;
  end if;
  return jsonb_build_object('order_id', p_order_id, 'status', p_new_status);
end;
$$;

revoke all on function public.create_order_with_stock(jsonb) from public;
grant execute on function public.create_order_with_stock(jsonb) to anon, authenticated;
revoke all on function public.admin_update_order_status(text, text) from public;
grant execute on function public.admin_update_order_status(text, text) to authenticated;
