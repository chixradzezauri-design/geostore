-- GEOSTORE: secure order writes and privileged RPCs without changing existing API contracts.
-- Existing product and order rows are not deleted or rewritten.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS admin_note text;

DO $migration$
BEGIN
  IF to_regprocedure('public.create_order_with_stock(jsonb)') IS NOT NULL
     AND to_regprocedure('private.create_order_with_stock(jsonb)') IS NULL THEN
    EXECUTE 'ALTER FUNCTION public.create_order_with_stock(jsonb) SET SCHEMA private';
  END IF;
  IF to_regprocedure('public.admin_update_order_status(text,text)') IS NOT NULL
     AND to_regprocedure('private.admin_update_order_status(text,text)') IS NULL THEN
    EXECUTE 'ALTER FUNCTION public.admin_update_order_status(text,text) SET SCHEMA private';
  END IF;
END
$migration$;

GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_order_with_stock(p_order jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$ SELECT private.create_order_with_stock(p_order); $function$;

REVOKE ALL ON FUNCTION public.create_order_with_stock(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock(jsonb) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.create_order_with_stock(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.create_order_with_stock(jsonb) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id text, p_new_status text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$ SELECT private.admin_update_order_status(p_order_id, p_new_status); $function$;

REVOKE ALL ON FUNCTION public.admin_update_order_status(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION private.admin_update_order_status(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_update_order_status(text, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Guest customer and admin checkout insert" ON public.orders;
REVOKE INSERT ON TABLE public.orders FROM PUBLIC, anon, authenticated;

REVOKE UPDATE ON TABLE public.orders FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (
  id, customer_name, phone, address, user_email, items, total_gel, status,
  created_at, stock_deducted_at, stock_restored_at, checkout_result,
  checkout_request, customer_email, admin_note
) ON TABLE public.orders FROM PUBLIC, anon, authenticated;
GRANT UPDATE (admin_note) ON TABLE public.orders TO authenticated;

DROP POLICY IF EXISTS "Admin can insert products" ON public.products;
CREATE POLICY "Admin can insert products" ON public.products FOR INSERT TO authenticated
WITH CHECK (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  AND lower(COALESCE(auth.jwt() ->> 'email', '')) = 'chixradzezauri@gmail.com'
);

REVOKE SELECT ON TABLE public.products FROM PUBLIC, anon, authenticated;
REVOKE SELECT (
  id, sku, name, category, brand, vendor, price_gel, old_price_gel, stock,
  image, description, available_sizes, available_colors, material, durability,
  created_at, purchase_cost, gallery, variants, tags, model, cpu, ram, storage,
  gpu, screen_size, os, is_featured
) ON TABLE public.products FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, sku, name, category, brand, vendor, price_gel, old_price_gel, stock,
  image, description, available_sizes, available_colors, material, durability,
  created_at, gallery, variants, tags, model, cpu, ram, storage, gpu,
  screen_size, os, is_featured
) ON TABLE public.products TO anon, authenticated;
