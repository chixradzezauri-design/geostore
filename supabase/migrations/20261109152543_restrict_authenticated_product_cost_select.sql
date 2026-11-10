-- Signed-in customers need the public catalogue, not internal purchase costs.
-- Admins receive full product rows only through the protected admin_list_products RPC.
REVOKE SELECT ON TABLE public.products FROM authenticated;
GRANT SELECT (
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
  is_featured
) ON TABLE public.products TO authenticated;
