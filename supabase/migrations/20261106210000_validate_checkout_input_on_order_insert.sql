begin;

-- Validate new orders at the database boundary as well as in the browser.
-- INSERT-only: existing historical orders are intentionally untouched.
create or replace function private.validate_order_checkout_input()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_phone_digits text;
begin
  if new.customer_name is null
    or length(btrim(new.customer_name)) not between 2 and 100
    or new.customer_name ~ '[[:cntrl:]]' then
    raise exception 'მომხმარებლის სახელი არასწორია.';
  end if;

  if coalesce(new.phone, '') !~ '^[+()0-9[:space:]-]+$'
    or new.phone ~ '[[:cntrl:]]' then
    raise exception 'ტელეფონის ნომერში დაუშვებელი სიმბოლოებია.';
  end if;

  v_phone_digits := regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');
  if length(v_phone_digits) not between 9 and 15 then
    raise exception 'ტელეფონის ნომერი უნდა შეიცავდეს 9–15 ციფრს.';
  end if;

  if new.address is null
    or length(btrim(new.address)) not between 3 and 400
    or new.address ~ '[[:cntrl:]]' then
    raise exception 'მისამართი არასწორია.';
  end if;

  if coalesce(new.user_email, 'guest') = 'guest' and
    (new.customer_email is null
      or length(new.customer_email) > 254
      or lower(btrim(new.customer_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then
    raise exception 'სტუმრის შეკვეთისთვის მიუთითეთ სწორი ელფოსტა.';
  end if;

  if new.customer_email is not null and
    (length(new.customer_email) > 254
      or lower(btrim(new.customer_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then
    raise exception 'ელფოსტის მისამართი არასწორია.';
  end if;

  if jsonb_typeof(new.items) is distinct from 'array' then
    raise exception 'შეკვეთის პროდუქტების სია არასწორია.';
  end if;

  -- The RPC appends a short delivery label to the stored address.
  -- The browser enforces the customer's actual address limit of 300 chars.
  if jsonb_array_length(new.items) not between 1 and 50 then
    raise exception 'შეკვეთის პროდუქტების სია არასწორია.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.items) as e(item)
    where jsonb_typeof(e.item) is distinct from 'object'
      or coalesce(btrim(e.item->>'id'), '') = ''
      or length(e.item->>'id') > 64
      or coalesce(e.item->>'quantity', '') !~ '^[0-9]{1,3}$'
      or case
          when coalesce(e.item->>'quantity', '') ~ '^[0-9]{1,3}$'
            then (e.item->>'quantity')::integer not between 1 and 100
          else true
        end
      or length(coalesce(e.item->>'selectedSize', e.item->>'selected_size', '')) > 40
      or length(coalesce(e.item->>'selectedColor', e.item->>'selected_color', '')) > 60
  ) then
    raise exception 'პროდუქტის ID, რაოდენობა, ზომა ან ფერი არასწორია.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.items) as e(item)
    group by e.item->>'id'
    having sum((e.item->>'quantity')::integer) > 100
  ) then
    raise exception 'ერთი პროდუქტის ჯამური რაოდენობა 100-ს არ უნდა აღემატებოდეს.';
  end if;

  return new;
end;
$function$;

revoke all on function private.validate_order_checkout_input() from public, anon, authenticated;

drop trigger if exists validate_order_checkout_input_before_insert on public.orders;
create trigger validate_order_checkout_input_before_insert
before insert on public.orders
for each row
execute function private.validate_order_checkout_input();

commit;
