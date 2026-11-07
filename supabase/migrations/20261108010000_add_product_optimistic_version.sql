-- Add a database-managed revision token for optimistic product edits.
-- Staged for review; do not apply until live migration history is reconciled.
alter table public.products
  add column if not exists updated_at timestamptz not null default pg_catalog.now(),
  add column if not exists version bigint not null default 1;

create or replace function private.touch_product_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  new.version := old.version + 1;
  return new;
end;
$$;

drop trigger if exists touch_product_updated_at on public.products;
create trigger touch_product_updated_at
before update on public.products
for each row
execute function private.touch_product_updated_at();
