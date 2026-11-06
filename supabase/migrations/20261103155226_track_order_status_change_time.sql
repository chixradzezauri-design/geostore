-- Persist the time of the latest order status transition.
-- Existing orders keep NULL and are sorted by created_at as a safe fallback.

alter table public.orders
  add column if not exists status_changed_at timestamptz;

create or replace function private.set_order_status_changed_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$function$;

drop trigger if exists orders_set_status_changed_at on public.orders;
create trigger orders_set_status_changed_at
before update of status on public.orders
for each row
execute function private.set_order_status_changed_at();

revoke all on function private.set_order_status_changed_at() from public, anon, authenticated;
