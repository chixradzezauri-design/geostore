-- Bind primary-admin product RPCs to the immutable Supabase Auth user ID.
-- This removes fragile email-string comparisons while retaining trusted app_metadata role checks.
-- Secure product create/update/delete operations.
-- Only the primary administrator may invoke these SECURITY DEFINER functions.
CREATE OR REPLACE FUNCTION private.admin_save_product(p_product jsonb)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_product public.products;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to save products' USING ERRCODE = '42501';
  END IF;

  IF p_product IS NULL OR COALESCE(p_product ->> 'id', '') = ''
     OR COALESCE(p_product ->> 'name', '') = ''
     OR NULLIF(p_product ->> 'price_gel', '') IS NULL
     OR (p_product ->> 'price_gel')::numeric < 0
     OR COALESCE((p_product ->> 'stock')::integer, 0) < 0 THEN
    RAISE EXCEPTION 'Invalid product payload' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.products AS existing
  SELECT (jsonb_populate_record(NULL::public.products, p_product)).*
  ON CONFLICT (id) DO UPDATE SET
    sku = EXCLUDED.sku,
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    brand = EXCLUDED.brand,
    vendor = EXCLUDED.vendor,
    price_gel = EXCLUDED.price_gel,
    old_price_gel = EXCLUDED.old_price_gel,
    stock = EXCLUDED.stock,
    image = EXCLUDED.image,
    description = EXCLUDED.description,
    available_sizes = EXCLUDED.available_sizes,
    available_colors = EXCLUDED.available_colors,
    material = EXCLUDED.material,
    durability = EXCLUDED.durability,
    purchase_cost = EXCLUDED.purchase_cost,
    gallery = EXCLUDED.gallery,
    variants = EXCLUDED.variants,
    tags = EXCLUDED.tags,
    model = EXCLUDED.model,
    cpu = EXCLUDED.cpu,
    ram = EXCLUDED.ram,
    storage = EXCLUDED.storage,
    gpu = EXCLUDED.gpu,
    screen_size = EXCLUDED.screen_size,
    os = EXCLUDED.os,
    is_featured = EXCLUDED.is_featured
  RETURNING * INTO v_product;

  RETURN v_product;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_product(p_product jsonb)
RETURNS public.products
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.admin_save_product(p_product);
$$;

CREATE OR REPLACE FUNCTION private.admin_delete_product(p_product_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_deleted integer;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to delete products' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.products WHERE id = p_product_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_product(p_product_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.admin_delete_product(p_product_id);
$$;

REVOKE ALL ON FUNCTION private.admin_save_product(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.admin_delete_product(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_save_product(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_product(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_product(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(text) TO authenticated;
