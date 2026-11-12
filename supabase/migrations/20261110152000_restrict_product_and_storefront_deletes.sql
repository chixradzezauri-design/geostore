begin;

-- Product deletion must always pass through admin_delete_product(), which
-- checks historical order references before removing a catalogue row.
drop policy if exists "Admin can delete products" on public.products;
revoke delete on table public.products from anon, authenticated;

-- Storefront configuration is saved through validated upsert/publish flows.
-- Direct deletion is unused and could remove the published storefront snapshot.
drop policy if exists "GEOSTORE admin deletes storefront config" on public.storefront_config;
revoke delete on table public.storefront_config from anon, authenticated;

commit;
