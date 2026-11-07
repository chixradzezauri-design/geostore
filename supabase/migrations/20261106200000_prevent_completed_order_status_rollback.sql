-- Enforce delivered-order immutability at the database boundary.
-- The UI already blocks this transition; this protects direct RPC callers too.
-- Staged only: reconcile live migration history before applying.

CREATE OR REPLACE FUNCTION private.admin_update_order_status(p_order_id text, p_new_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
         set stock = coalesce(stock, 0) + v_item.quantity
       where id = v_item.product_id;

      get diagnostics v_updated = row_count;
      if v_updated <> 1 then
        raise exception 'მარაგის აღდგენა ვერ მოხერხდა პროდუქტისთვის: %', v_item.product_id;
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


-- Enforce the same transition rules for direct table updates, not only RPC calls.
-- The dedicated reactivation RPC remains supported only with fresh password auth
-- and an atomic stock-restoration reversal.
CREATE OR REPLACE FUNCTION private.guard_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_password_auth_time bigint;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status IN ('დასრულებული', 'ჩაბარებულია')
     AND NEW.status NOT IN ('დასრულებული', 'ჩაბარებულია') THEN
    RAISE EXCEPTION 'ჩაბარებული შეკვეთის სტატუსის შეცვლა დაუშვებელია.';
  END IF;

  IF OLD.status IN ('გაგზავნილი', 'გზაშია')
     AND NEW.status NOT IN ('გაგზავნილი', 'გზაშია', 'დასრულებული', 'ჩაბარებულია') THEN
    RAISE EXCEPTION 'გაგზავნილი შეკვეთის წინა სტატუსზე დაბრუნება ან გაუქმება დაუშვებელია.';
  END IF;

  IF OLD.status = 'გაუქმებული' AND NEW.status <> 'გაუქმებული' THEN
    IF NEW.status <> 'ახალი'
       OR OLD.stock_restored_at IS NULL
       OR OLD.stock_deducted_at IS NULL
       OR NEW.stock_restored_at IS NOT NULL
       OR NEW.stock_deducted_at IS NULL
       OR NEW.stock_deducted_at <= OLD.stock_deducted_at
       OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
       OR coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
       -- Only the atomic reactivation RPC may set this transaction-local marker.
       OR coalesce(current_setting('geostore.order_reactivation', true), '') <> 'on' THEN
      RAISE EXCEPTION 'გაუქმებული შეკვეთის ხელახლა გააქტიურება მხოლოდ დაცული პროცედურით არის შესაძლებელი.';
    END IF;

    SELECT max((entry->>'timestamp')::bigint)
      INTO v_password_auth_time
      FROM jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) AS entry
     WHERE entry->>'method' = 'password'
       AND coalesce(entry->>'timestamp', '') ~ '^[0-9]+$';

    IF v_password_auth_time IS NULL
       OR extract(epoch FROM now())::bigint - v_password_auth_time > 300
       OR v_password_auth_time > extract(epoch FROM now())::bigint + 30 THEN
      RAISE EXCEPTION 'ხელახლა გააქტიურებისთვის საჭიროა პაროლის ახლიდან დადასტურება.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS orders_guard_status_transition ON public.orders;

CREATE TRIGGER orders_guard_status_transition
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.guard_order_status_transition();

-- Validate every stored order line before aggregating during reactivation.
-- This mirrors checkout/cancellation limits so malformed legacy JSON cannot
-- hide negative quantities or inflate a product's stock deduction.
CREATE OR REPLACE FUNCTION private.admin_reactivate_cancelled_order(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
  if jsonb_typeof(coalesce(v_order.items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(v_order.items, '[]'::jsonb)) = 0 then
    raise exception 'შეკვეთის პროდუქტების სია ცარიელია ან არასწორია.';
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

  for v_item in
    select item->>'id' as product_id,
           sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_order.items) as e(item)
     group by item->>'id'
     order by item->>'id'
  loop
    update public.products
       set stock = coalesce(stock, 0) - v_item.quantity
     where id = v_item.product_id
       and coalesce(stock, 0) >= v_item.quantity;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'მარაგში აღარ არის საკმარისი რაოდენობა პროდუქტისთვის: %', v_item.product_id;
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
$function$;

-- Orders are an audit and stock-accounting ledger. The admin UI has no
-- order-delete workflow; prevent direct REST deletion from erasing that ledger.
DROP POLICY IF EXISTS "Admin can delete orders" ON public.orders;
REVOKE DELETE ON TABLE public.orders FROM PUBLIC, anon, authenticated;
