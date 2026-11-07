-- Keep custom-variant stock restoration within the same 0..1,000,000
-- inventory range enforced by the storefront/admin product workflows.
-- Base-product stock already has a database CHECK constraint; JSON variant
-- stock needs an explicit upper-bound predicate during cancellation.
-- Staged only: reconcile this migration with the live history before applying.

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
    if jsonb_typeof(coalesce(v_order.items, '[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(v_order.items, '[]'::jsonb)) = 0 then
      raise exception 'შეკვეთის პროდუქტების სია ცარიელია ან არასწორია.';
    end if;

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
        update public.products
           set stock = coalesce(stock, 0) + v_item.quantity
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
           and exists (
             select 1
               from jsonb_array_elements(case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end) element
              where element->>'id' = v_item.custom_variant_id
                and coalesce((element->>'stock')::integer, 0) between 0 and (1000000 - v_item.quantity)
           );
      end if;

      get diagnostics v_updated = row_count;
      if v_updated <> 1 then
        raise exception 'მარაგის აღდგენა ვერ მოხერხდა ან მარაგის დასაშვები ზღვარი გადაიჭარბებოდა პროდუქტისთვის ან ვარიანტისთვის: %', v_item.product_id;
      end if;
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
$function$;
