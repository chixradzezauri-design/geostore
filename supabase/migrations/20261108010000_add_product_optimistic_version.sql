-- Cross-session optimistic concurrency for all admin product mutations.
-- This migration is staged only; reconcile migration history before applying.

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
for each row execute function private.touch_product_updated_at();

create or replace function private.admin_adjust_product_variant_stock(
  p_product_id text,
  p_variant_id text,
  p_delta integer,
  p_expected_version bigint
)
returns public.products
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jwt jsonb := (select auth.jwt());
  v_product public.products;
  v_variant_count integer;
begin
  if coalesce(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     or auth.uid() is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid then
    raise exception 'Not authorized to adjust product variant stock' using errcode = '42501';
  end if;
  if coalesce(trim(p_product_id), '') = ''
     or coalesce(trim(p_variant_id), '') = ''
     or p_delta is null or p_delta = 0
     or p_delta < -1000000 or p_delta > 1000000
     or p_expected_version is null or p_expected_version < 1 then
    raise exception 'Invalid variant stock adjustment' using errcode = '22023';
  end if;

  select count(*) into v_variant_count
  from public.products p
  cross join lateral jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) v
  where p.id = p_product_id and v->>'id' = p_variant_id;

  if v_variant_count <> 1 then
    raise exception 'Variant not found or duplicated' using errcode = 'P0002';
  end if;

  perform pg_catalog.set_config('geostore.variant_stock_adjustment', 'on', true);
  update public.products p
  set variants = (
    select jsonb_agg(
      case when v->>'id' = p_variant_id
        then jsonb_set(v, '{stock}', to_jsonb((v->>'stock')::integer + p_delta), true)
        else v
      end order by ord
    )
    from jsonb_array_elements(p.variants) with ordinality as e(v, ord)
  )
  where p.id = p_product_id
    and p.version = p_expected_version
    and exists (
      select 1 from jsonb_array_elements(p.variants) v
      where v->>'id' = p_variant_id
        and coalesce(v->>'stock', '') ~ '^[0-9]{1,7}$'
        and (v->>'stock')::integer + p_delta between 0 and 1000000
    )
  returning p.* into v_product;

  if not found then
    raise exception 'Product or variant changed. Refresh and retry.' using errcode = '40001';
  end if;
  return v_product;
end;
$$;

create or replace function public.admin_adjust_product_variant_stock(
  p_product_id text,
  p_variant_id text,
  p_delta integer,
  p_expected_version bigint
)
returns public.products
language sql
security definer
set search_path = ''
as $$
  select private.admin_adjust_product_variant_stock(
    p_product_id, p_variant_id, p_delta, p_expected_version
  );
$$;

create or replace function private.admin_delete_product_if_version(
  p_product_id text,
  p_expected_version bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jwt jsonb := (select auth.jwt());
  v_deleted integer;
begin
  if coalesce(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     or auth.uid() is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid then
    raise exception 'Not authorized to delete products' using errcode = '42501';
  end if;
  if coalesce(trim(p_product_id), '') = ''
     or p_expected_version is null or p_expected_version < 1 then
    raise exception 'Invalid product deletion request' using errcode = '22023';
  end if;
  delete from public.products
  where id = p_product_id and version = p_expected_version;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

create or replace function public.admin_delete_product_if_version(
  p_product_id text,
  p_expected_version bigint
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.admin_delete_product_if_version(p_product_id, p_expected_version);
$$;

revoke all on function private.admin_adjust_product_variant_stock(text,text,integer,bigint) from public, anon, authenticated;
revoke all on function public.admin_adjust_product_variant_stock(text,text,integer,bigint) from public, anon;
grant execute on function public.admin_adjust_product_variant_stock(text,text,integer,bigint) to authenticated;

revoke all on function private.admin_delete_product_if_version(text,bigint) from public, anon, authenticated;
revoke all on function public.admin_delete_product_if_version(text,bigint) from public, anon;
grant execute on function public.admin_delete_product_if_version(text,bigint) to authenticated;
