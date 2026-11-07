-- Harden order JSON validation and prevent ambiguous duplicate product variants.
-- Function bodies are based on the live database definitions inspected on 2026-11-07.
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
           and exists (
             select 1
               from jsonb_array_elements(case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end) element
              where element->>'id' = v_item.custom_variant_id
                and CASE
                      WHEN coalesce(element->>'stock', '') ~ '^[0-9]{1,7}$'
                        THEN (element->>'stock')::integer BETWEEN 0 AND (1000000 - v_item.quantity)
                      ELSE false
                    END
           );
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
         and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end) element where element->>'id' = v_item.custom_variant_id and CASE
                 WHEN coalesce(element->>'stock', '') ~ '^[0-9]{1,7}$'
                   THEN (element->>'stock')::integer >= v_item.quantity
                 ELSE false
               END);
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
  IF jsonb_array_length(coalesce(NEW.variants, '[]'::jsonb)) > 50 THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტების რაოდენობა 50-ს არ უნდა აღემატებოდეს.';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(coalesce(NEW.variants, '[]'::jsonb)) AS e(item)
     GROUP BY item->>'id'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ვარიანტის ID დუბლირებულია.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(coalesce(NEW.variants, '[]'::jsonb)) AS e(item)
     GROUP BY lower(trim(coalesce(item->>'name', '')))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ვარიანტის სახელი დუბლირებულია.';
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
       OR length(trim(coalesce(v_variant->>'id', ''))) > 80
       OR coalesce(trim(v_variant->>'name'), '') = ''
       OR length(trim(coalesce(v_variant->>'name', ''))) > 80
       OR coalesce(v_variant->>'priceGEL', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
       OR coalesce(v_variant->>'stock', '') !~ '^[0-9]{1,7}$' THEN
      RAISE EXCEPTION 'პროდუქტის ვარიანტის სახელი, ფასი ან მარაგი არასწორია.';
    END IF;
    IF (v_variant->>'priceGEL')::numeric > 1000000000
       OR (v_variant->>'stock')::integer > 1000000 THEN
      RAISE EXCEPTION 'ვარიანტის ფასი ან მარაგი დასაშვებ ზღვარს აჭარბებს.';
    END IF;
    SELECT value INTO v_existing
      FROM jsonb_array_elements(coalesce(OLD.variants, '[]'::jsonb))
     WHERE value->>'id' = v_variant->>'id'
     LIMIT 1;
    IF v_existing IS NOT NULL THEN
      IF coalesce(v_existing->>'stock', '') !~ '^[0-9]{1,7}$' THEN
        RAISE EXCEPTION 'არსებული ვარიანტის მარაგის ჩანაწერი არასწორია.';
      END IF;
      IF (v_existing->>'stock')::integer > 1000000 THEN
        RAISE EXCEPTION 'არსებული ვარიანტის მარაგი დასაშვებ ზღვარს აჭარბებს.';
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
