-- Stage78 Auth/PostgREST: disposable local database ONLY.
-- The local sample public.orders table is deliberately minimal. The staff
-- foundation and Phase A order projection functions below are the EXACT
-- versioned GEOSTORE migrations, not handwritten RPC substitutes.
\set ON_ERROR_STOP on

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE TABLE public.orders (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  customer_name text,
  phone text,
  address text,
  user_email text,
  customer_email text,
  user_id uuid,
  total_gel numeric,
  status text,
  admin_note text,
  status_changed_at timestamptz,
  stock_deducted_at timestamptz,
  stock_restored_at timestamptz,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  checkout_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  checkout_request jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.orders FROM PUBLIC, anon;
GRANT SELECT ON public.orders TO authenticated;

\ir ../../supabase/migrations/20261117231455_admin_staff_auth_foundation.sql

-- The full GEOSTORE production prerequisite for private.has_staff_permission
-- is supplied by another staged migration; this small fixture only delegates
-- to the exact current public permission implementation. This fixture is NOT
-- a complete schema replay and cannot replace full-schema release tests.
CREATE OR REPLACE FUNCTION private.has_staff_permission(p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$ SELECT public.has_staff_permission(p_permission); $fn$;
REVOKE ALL ON FUNCTION private.has_staff_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_staff_permission(text) TO authenticated, service_role;

CREATE POLICY "Stage78 signed-JWT orders read" ON public.orders
FOR SELECT TO authenticated USING (public.has_staff_permission('orders'));

INSERT INTO public.orders (
  id, customer_name, phone, address, total_gel, status, items,
  checkout_result, checkout_request
) VALUES (
  'STAGE78-ORDER', 'Synthetic Example', '000000000', 'CI-only street', 140,
  'ახალი',
  '[{"id":"ci-product","quantity":1,"price":140,"image":"ci-image.png","purchase_cost":40,"vendor":"private-ci-vendor"}]'::jsonb,
  '{"subtotal_gel":140,"delivery_gel":0,"internal_vendor":"private-ci-value","items":[{"purchase_cost":40}]}'::jsonb,
  '{"coupon_code":"CI","private_note":"hidden"}'::jsonb
);

-- Actual staged additive Phase A migration, NOT Phase B revocation.
\ir ../../supabase/migrations/20261121210000_scope_admin_order_ledger_permissions.sql
NOTIFY pgrst, 'reload schema';
