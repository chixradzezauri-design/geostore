-- Stage54: isolated PostgreSQL contract for the actual customer-history migration.
-- Execute after Stage52 in the SAME disposable postgres:17-alpine database.
\set ON_ERROR_STOP on
\echo 'Stage54: prepare synthetic authenticated order histories'
BEGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE SET search_path TO ''
  AS $uid$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid; $uid$;
CREATE TABLE public.orders (
  id text PRIMARY KEY, user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  total_gel numeric NOT NULL,
  status text NOT NULL,
  items jsonb NOT NULL,
  status_changed_at timestamptz
);
REVOKE ALL ON TABLE public.orders FROM PUBLIC, anon, authenticated;
INSERT INTO public.orders(id,user_id,total_gel,status,items)
VALUES (
  'STG54-ORDER-A', '54000000-0000-4000-8000-00000000000a', 160,'ახალი',
  jsonb_build_array(
    jsonb_build_object(
      'id','fixture-1','name','Customer product','price',100,'quantity',1,
      'selectedSize','M','gift_wrap',true,
      'purchase_cost',40,'purchaseCost',41,
      'cost_price',42,'costPrice',43,
      'vendor','internal-vendor','unitCost',44,'supplier','internal-supplier',
      'margin',60,'profit',61
    ),
    jsonb_build_object(
      'id','fixture-2','name','Customer accessory','price',60,'quantity',1,
      'costPrice',22,'selectedColor','black','vip_warranty',true
    )
  )
), (
  'STG54-ORDER-B', '54000000-0000-4000-8000-00000000000b', 90,'მუშავდება',
  jsonb_build_array(jsonb_build_object('id','other-owner','price',90,'cost_price',25))
), (
  'STG54-ORDER-GUEST', NULL,50,'ახალი',
  jsonb_build_array(jsonb_build_object('id','guest','price',50,'purchase_cost',15))
);

COMMIT;

-- Test the EXACT Stage54 migration, not a test-only rewrite.
\ir ../../supabase/migrations/20261121190000_redact_alternate_costs_from_order_history.sql

-- Preserve the exact existing public SECURITY INVOKER signature.
CREATE FUNCTION public.get_my_orders()
RETURNS TABLE (
  id text, created_at timestamptz, total_gel numeric,
  status text, items jsonb, status_changed_at timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO ''
AS $wrapper$ SELECT * FROM private.get_my_orders(); $wrapper$;
REVOKE ALL ON FUNCTION public.get_my_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_orders() TO authenticated;

\echo 'Stage54: signed-in identity A sees its own customer-friendly items only'
SET request.jwt.claim.sub = '54000000-0000-4000-8000-00000000000a';
SET ROLE authenticated;
DO $test$
DECLARE
  n integer;
  order_record record;
BEGIN
  SELECT count(*) INTO n FROM public.get_my_orders();
  IF n <> 1 THEN
    RAISE EXCEPTION 'Stage54: signed-in user A can see unexpected order count: %',n;
  END IF;
  SELECT * INTO order_record FROM public.get_my_orders();
  IF order_record.id IS DISTINCT FROM 'STG54-ORDER-A'
     OR order_record.total_gel <> 160
     OR jsonb_array_length(order_record.items) <> 2
     OR order_record.items->0->>'selectedSize' <> 'M'
     OR order_record.items->1->>'selectedColor' <> 'black'
     OR order_record.items->0->>'gift_wrap' <> 'true'
     OR order_record.items->0->>'price' <> '100'
     OR order_record.items->1->>'vip_warranty' <> 'true' THEN
    RAISE EXCEPTION 'Stage54: order history altered customer fields or owner';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(order_record.items) AS entry(item)
    WHERE entry.item ?| ARRAY[
      'purchase_cost','purchaseCost','cost_price','costPrice','vendor',
      'unit_cost','unitCost','cost','margin','profit','supplier',
      'supplier_name','supplierName']
  ) THEN
    RAISE EXCEPTION 'Stage54: customer history exposed finance-only item fields';
  END IF;
END $test$;
RESET ROLE;

\echo 'Stage54: authenticated identity B sees only B, nobody sees guests'
SET request.jwt.claim.sub = '54000000-0000-4000-8000-00000000000b';
SET ROLE authenticated;
DO $test$
DECLARE
  n integer;
  order_id text;
BEGIN
  SELECT count(*), min(id) INTO n,order_id FROM public.get_my_orders();
  IF n <> 1 OR order_id IS DISTINCT FROM 'STG54-ORDER-B' THEN
    RAISE EXCEPTION 'Stage54: user B sees another account''s order';
  END IF;
END $test$;
RESET ROLE;

\echo 'Stage54: anonymous and unauthenticated sessions are denied'
DO $test$
BEGIN
  IF has_function_privilege('anon','public.get_my_orders()','EXECUTE')
     OR has_function_privilege('anon','private.get_my_orders()','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.get_my_orders()','EXECUTE') THEN
    RAISE EXCEPTION 'Stage54: order history function role grants changed';
  END IF;
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid='private.get_my_orders()'::regprocedure)
     OR (SELECT prosecdef FROM pg_proc WHERE oid='public.get_my_orders()'::regprocedure) THEN
    RAISE EXCEPTION 'Stage54: existing security definer/invoker boundary changed';
  END IF;
  IF has_table_privilege('authenticated','public.orders','SELECT') THEN
    RAISE EXCEPTION 'Stage54: authenticated role acquired direct orders table access';
  END IF;
  IF (SELECT items->0->>'costPrice' FROM public.orders WHERE id='STG54-ORDER-A') IS DISTINCT FROM '43'
     OR (SELECT items->1->>'costPrice' FROM public.orders WHERE id='STG54-ORDER-A') IS DISTINCT FROM '22' THEN
    RAISE EXCEPTION 'Stage54: underlying finance snapshots were modified';
  END IF;
END $test$;

\echo 'PASS Stage54 PostgreSQL 17: signed-in orders isolated by owner, all internal cost aliases redacted, item details and finance snapshots preserved'
