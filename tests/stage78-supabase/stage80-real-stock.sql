-- Stage80 real checkout/variant transaction, disposable local Supabase only.
\set ON_ERROR_STOP on
CREATE TABLE public.products (
 id text PRIMARY KEY,name text NOT NULL,category text NOT NULL,
 stock integer NOT NULL DEFAULT 0,variants jsonb NOT NULL DEFAULT '[]'::jsonb,
 price_gel numeric NOT NULL,purchase_cost numeric,vendor text,image text,
 gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
 available_sizes jsonb NOT NULL DEFAULT '[]'::jsonb,
 available_colors jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.products FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.products TO service_role;
CREATE TABLE public.store_delivery_fees(region text PRIMARY KEY,fee_gel numeric NOT NULL);
INSERT INTO public.store_delivery_fees(region,fee_gel) VALUES
('tbilisi',5),('bigCities',7),('other',9);
CREATE TABLE public.store_coupons(
 code text PRIMARY KEY,active boolean NOT NULL,
 discount_percent numeric NOT NULL,min_order_gel numeric NOT NULL
);
INSERT INTO public.store_coupons VALUES ('STAGE80TEN',true,10,50);

-- This file is extracted from the exact historical Stage92 migration by
-- the EXISTING checked Stage60 source parser, not a new mock trigger.
\i /tmp/stage60_original_inventory_trigger_prefix.sql

INSERT INTO public.products(
 id,name,category,stock,variants,price_gel,purchase_cost,vendor,
 image,gallery,available_sizes,available_colors
) VALUES (
 'STAGE80-SHOE','Stage80 synthetic shoe','shoes',0,
 '[{"id":"red-s","name":"Red S","variantType":"size_color","size":"S","color":"Red","stock":3,"priceGEL":120},
   {"id":"blue-m","name":"Blue M","variantType":"size_color","size":"M","color":"Blue","stock":2,"priceGEL":140}]'::jsonb,
 100,52,'internal-ci-vendor','ci-shoe.png',
 '["ci-shoe.png"]'::jsonb,'["S","M"]'::jsonb,'["Red","Blue"]'::jsonb
), (
 'STAGE80-BASE','Stage80 basic product','general',5,
 '[]'::jsonb,100,40,'internal-ci-vendor','ci-base.png',
 '["ci-base.png"]'::jsonb,'[]'::jsonb,'[]'::jsonb
);

-- Replace the synthetic Stage79 checkout writer with the EXACT Stage61-tested
-- versioned real SQL private checkout transaction.
\ir ../../supabase/migrations/20261117231546_stable_checkout_idempotency_ordering.sql
-- Add exact versioned private staff cancellation implementation.
\ir ../../supabase/migrations/20261117231459_staff_orders_permission.sql
REVOKE ALL ON FUNCTION private.admin_update_order_status(text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.admin_update_order_status(text,text)
 TO authenticated;
-- Existing live public RPC uses a SECURITY INVOKER delegate. This is the
-- only hand-built status wrapper; internal logic is sourced unmodified.
CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id text,p_new_status text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $d$ SELECT private.admin_update_order_status(p_order_id,p_new_status); $d$;
REVOKE ALL ON FUNCTION public.admin_update_order_status(text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(text,text)
 TO authenticated;
NOTIFY pgrst, 'reload schema';
