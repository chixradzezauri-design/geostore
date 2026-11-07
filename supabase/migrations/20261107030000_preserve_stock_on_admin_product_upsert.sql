-- Keep checkout stock deductions authoritative when the admin product RPC
-- receives an upsert for an existing product.
-- Product edits in the current UI use a PATCH that omits stock; this is an
-- additional database-level safeguard for other authorized RPC callers.
-- Staged only: apply only after live/repository migration history is reconciled.

CREATE OR REPLACE FUNCTION private.admin_save_product(p_product jsonb)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_product public.products;
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to save products' USING ERRCODE = '42501';
  END IF;

  IF p_product IS NULL
     OR COALESCE(p_product ->> 'id', '') = ''
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
    -- Never overwrite live stock from a potentially stale product form.
    -- Stock changes belong to checkout/cancellation/reactivation or the
    -- dedicated compare-and-set stock editor.
    stock = existing.stock,
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
$function$;
