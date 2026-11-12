begin;

-- Reassert the intended column-level catalogue permissions.
-- Production currently has a table-level SELECT grant for authenticated,
-- which overrides the earlier column-level restriction and exposes
-- purchase_cost on published product rows.
-- Admin full-row reads continue through the protected admin_list_products RPC.
revoke select on table public.products from anon, authenticated;

grant select (
  id,
  sku,
  name,
  category,
  brand,
  vendor,
  price_gel,
  old_price_gel,
  stock,
  image,
  description,
  available_sizes,
  available_colors,
  material,
  durability,
  created_at,
  gallery,
  variants,
  tags,
  model,
  cpu,
  ram,
  storage,
  gpu,
  screen_size,
  os,
  is_featured,
  is_published
) on table public.products to anon, authenticated;

commit;
