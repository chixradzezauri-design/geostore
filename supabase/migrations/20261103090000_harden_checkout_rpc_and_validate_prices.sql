-- GEOSTORE: validate checkout line prices against database records and keep
-- privileged implementations outside the exposed public API schema.
--
-- The public RPC names and JSON response shapes remain unchanged so the
-- existing storefront checkout and Admin Panel callers do not need rewiring.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.create_order_with_stock(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_raw_item jsonb;
  v_quantity numeric;
  v_updated integer;
  v_order_id text;
  v_user_email text;
  v_product_price numeric;
  v_product_name text;
begin
  if p_order is null or pg_catalog.jsonb_typeof(p_order) <> 'object' then
    raise exception 'შეკვეთის მონაცემები არასწორია.';
  end if;

  if coalesce(nullif(pg_catalog.btrim(p_order->>'id'), ''), '') = ''
     or coalesce(nullif(pg_catalog.btrim(p_order->>'customer_name'), ''), '') = ''
     or coalesce(nullif(pg_catalog.btrim(p_order->>'phone'), ''), '') = ''
     or coalesce(nullif(pg_catalog.btrim(p_order->>'address'), ''), '') = '' then
    raise exception 'შეავსეთ შეკვეთის სავალდებულო ველები.';
  end if;

  if coalesce(pg_catalog.jsonb_typeof(p_order->'items'), '') <> 'array'
     or pg_catalog.jsonb_array_length(p_order->'items') = 0 then
    raise exception 'შეკვეთაში პროდუქტები არ არის.';
  end if;

  if coalesce(pg_catalog.jsonb_typeof(p_order->'total_gel'), '') <> 'number'
     or (p_order->>'total_gel')::numeric < 0 then
    raise exception 'შეკვეთის ჯამი არასწორია.';
  end if;

  -- Reject malformed line items before any stock is changed.
  for v_raw_item in
    select e.value
      from pg_catalog.jsonb_array_elements(p_order->'items') as e(value)
  loop
    if pg_catalog.jsonb_typeof(v_raw_item) <> 'object'
       or coalesce(nullif(pg_catalog.btrim(v_raw_item->>'id'), ''), '') = ''
       or coalesce(nullif(pg_catalog.btrim(v_raw_item->>'name'), ''), '') = ''
       or coalesce(pg_catalog.jsonb_typeof(v_raw_item->'price'), '') <> 'number'
       or coalesce(pg_catalog.jsonb_typeof(v_raw_item->'quantity'), '') <> 'number' then
      raise exception 'პროდუქტის მონაცემები არასწორია.';
    end if;

    v_quantity := (v_raw_item->>'quantity')::numeric;
    if v_quantity <= 0
       or v_quantity <> pg_catalog.trunc(v_quantity)
       or v_quantity > 2147483647 then
      raise exception 'პროდუქტის რაოდენობა არასწორია.';
    end if;

    if (v_raw_item->>'price')::numeric < 0 then
      raise exception 'პროდუქტის ფასი არასწორია.';
    end if;
  end loop;

  v_user_email := coalesce(p_order->>'user_email', 'guest');
  if auth.uid() is null then
    if v_user_email <> 'guest' then
      raise exception 'სტუმრის შეკვეთის ავტორიზაცია ვერ დადასტურდა.';
    end if;
  elsif lower(v_user_email) <> lower(coalesce(auth.jwt()->>'email', '')) then
    raise exception 'მომხმარებლის სესია შეკვეთის მონაცემებს არ ემთხვევა.';
  end if;

  -- Aggregate duplicate product lines, lock each product, and compare the
  -- submitted unit price/name with the authoritative database values.
  for v_item in
    select
      item->>'id' as product_id,
      sum((item->>'quantity')::numeric)::bigint as quantity,
      min((item->>'price')::numeric) as unit_price,
      count(distinct (item->>'price')::numeric) as price_variants,
      min(item->>'name') as item_name,
      count(distinct item->>'name') as name_variants
    from pg_catalog.jsonb_array_elements(p_order->'items') as e(item)
    group by item->>'id'
    order by item->>'id'
  loop
    if v_item.quantity > 2147483647 then
      raise exception 'პროდუქტის რაოდენობა დასაშვებ ზღვარს აჭარბებს.';
    end if;

    select p.price_gel, p.name
      into v_product_price, v_product_name
      from public.products as p
     where p.id = v_item.product_id
     for update;

    if not found then
      raise exception 'პროდუქტი ვერ მოიძებნა: %', v_item.product_id;
    end if;

    if v_item.price_variants <> 1
       or v_item.unit_price <> v_product_price then
      raise exception 'პროდუქტის ფასი შეიცვალა. განაახლეთ კალათა და სცადეთ თავიდან: %', v_item.product_id;
    end if;

    if v_item.name_variants <> 1 or v_item.item_name <> v_product_name then
      raise exception 'პროდუქტის მონაცემები განახლებულია. განაახლეთ კალათა და სცადეთ თავიდან: %', v_item.product_id;
    end if;

    update public.products
       set stock = coalesce(stock, 0) - v_item.quantity::integer
     where id = v_item.product_id
       and coalesce(stock, 0) >= v_item.quantity::integer;

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
    (p_order->>'total_gel')::numeric, 'ახალი', pg_catalog.now()
  );

  return pg_catalog.jsonb_build_object(
    'order_id', v_order_id,
    'stock_deducted', true
  );
end;
$$;

create or replace function private.admin_update_order_status(
  p_order_id text,
  p_new_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
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

  if coalesce(p_new_status, '') not in ('ახალი', 'მუშავდება', 'გაგზავნილი', 'დასრულებული', 'გაუქმებული') then
    raise exception 'შეკვეთის სტატუსი არასწორია.';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'შეკვეთა ვერ მოიძებნა.';
  end if;

  if v_order.status = 'გაუქმებული' and p_new_status <> 'გაუქმებული' then
    raise exception 'გაუქმებული შეკვეთის ხელახლა გააქტიურება დაუშვებელია.';
  end if;

  if p_new_status = 'გაუქმებული'
     and v_order.status <> 'გაუქმებული'
     and v_order.stock_deducted_at is not null
     and v_order.stock_restored_at is null then
    for v_item in
      select
        item->>'id' as product_id,
        sum((item->>'quantity')::integer)::integer as quantity
      from pg_catalog.jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) as e(item)
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

    update public.orders
       set status = p_new_status,
           stock_restored_at = pg_catalog.now()
     where id = p_order_id;
  else
    update public.orders
       set status = p_new_status
     where id = p_order_id;
  end if;

  return pg_catalog.jsonb_build_object(
    'order_id', p_order_id,
    'status', p_new_status
  );
end;
$$;

-- Keep the existing public RPC endpoints, but make the exposed wrappers
-- SECURITY INVOKER. The privileged implementation is in the unexposed schema.
create or replace function public.create_order_with_stock(p_order jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_order_with_stock(p_order);
$$;

create or replace function public.admin_update_order_status(
  p_order_id text,
  p_new_status text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.admin_update_order_status(p_order_id, p_new_status);
$$;

revoke all on function private.create_order_with_stock(jsonb) from public;
grant execute on function private.create_order_with_stock(jsonb) to anon, authenticated;

revoke all on function private.admin_update_order_status(text, text) from public;
grant execute on function private.admin_update_order_status(text, text) to authenticated;

revoke all on function public.create_order_with_stock(jsonb) from public;
grant execute on function public.create_order_with_stock(jsonb) to anon, authenticated;

revoke all on function public.admin_update_order_status(text, text) from public, anon;
grant execute on function public.admin_update_order_status(text, text) to authenticated;


-- Keep all order creation behind the atomic RPC. The live application uses
-- create_order_with_stock and does not insert directly into public.orders.
-- Direct table inserts would bypass stock validation and deduction.
revoke insert on table public.orders from anon, authenticated;
drop policy if exists "Guest and signed-in checkout can create orders" on public.orders;

-- The Admin Panel's order-note editor updates this field through PostgREST.
-- It was missing from the live schema, so add it without touching existing rows.
alter table public.orders
  add column if not exists admin_note text;

-- Expose order reads only to signed-in sessions (RLS still limits rows
-- to the configured admin), and allow only the existing admin-note column
-- update through PostgREST. All other writes stay behind the RPCs.
revoke all on table public.orders from anon, authenticated;
grant select on table public.orders to authenticated;
grant update (admin_note) on table public.orders to authenticated;
