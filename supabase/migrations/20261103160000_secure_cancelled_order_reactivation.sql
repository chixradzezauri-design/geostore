-- Secure, password-reauthenticated reactivation of cancelled orders.
-- The RPC is atomic: it checks current stock, deducts it, then restores the order to "ახალი".
create or replace function private.admin_reactivate_cancelled_order(p_order_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_updated integer;
  v_auth_time bigint;
begin
  if auth.uid() is null
     or coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     or lower(coalesce(auth.jwt()->>'email', '')) <> 'chixradzezauri@gmail.com' then
    raise exception 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  end if;

  v_auth_time := nullif(auth.jwt()->>'auth_time', '')::bigint;
  if v_auth_time is null
     or extract(epoch from now())::bigint - v_auth_time > 300
     or v_auth_time > extract(epoch from now())::bigint + 30 then
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

create or replace function public.admin_reactivate_cancelled_order(p_order_id text)
returns jsonb
language sql
set search_path = ''
as $function$
  select private.admin_reactivate_cancelled_order(p_order_id);
$function$;

revoke all on function private.admin_reactivate_cancelled_order(text) from public, anon;
grant execute on function private.admin_reactivate_cancelled_order(text) to authenticated;
revoke all on function public.admin_reactivate_cancelled_order(text) from public, anon;
grant execute on function public.admin_reactivate_cancelled_order(text) to authenticated;
