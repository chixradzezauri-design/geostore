-- Stage61: run the exact private checkout transaction, existing Stage51 public
-- redaction wrapper, owner variant-stock RPC, original ledger trigger, and
-- Stage59 staff cancellation together in the SAME disposable PostgreSQL 17.
-- Production connection, customer records and real inventory are NEVER used.
\set ON_ERROR_STOP on
\echo 'Stage61: extend synthetic products with actual checkout schema columns'
BEGIN;
ALTER TABLE public.products
 ADD COLUMN price_gel numeric NOT NULL DEFAULT 100,
 ADD COLUMN purchase_cost numeric(12,2) NOT NULL DEFAULT 40,
 ADD COLUMN vendor text NOT NULL DEFAULT 'private-fixture-vendor',
 ADD COLUMN image text,
 ADD COLUMN gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
 ADD COLUMN available_sizes jsonb NOT NULL DEFAULT '[]'::jsonb,
 ADD COLUMN available_colors jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE TABLE public.store_delivery_fees (
 region text PRIMARY KEY,fee_gel numeric NOT NULL
);
INSERT INTO public.store_delivery_fees(region,fee_gel)
 VALUES('tbilisi',5),('bigCities',7),('other',9);
CREATE TABLE public.store_coupons (
 code text PRIMARY KEY,active boolean NOT NULL,
 discount_percent numeric NOT NULL,min_order_gel numeric NOT NULL
);
INSERT INTO public.products(
 id,name,category,stock,variants,price_gel,purchase_cost,vendor,
 image,gallery,available_sizes,available_colors
) VALUES (
 'STG61-SHOE','Stage61 Size/Color Shoe','shoes',0,
 '[{"id":"red-s","name":"Red S","variantType":"size_color","size":"S","color":"Red","stock":3,"priceGEL":120},
   {"id":"blue-m","name":"Blue M","variantType":"size_color","size":"M","color":"Blue","stock":2,"priceGEL":140}]'::jsonb,
 100,52,'private-wholesale-vendor','https://fixture.example/shoe.png',
 '["https://fixture.example/shoe.png"]'::jsonb,
 '["S","M"]'::jsonb,'["Red","Blue"]'::jsonb
);
COMMIT;

-- Existing true private checkout implementation replaces Stage52's mock.
-- Stage51/55 public SECURITY INVOKER redaction remains installed unchanged.
\ir ../../supabase/migrations/20261117160000_stable_checkout_idempotency_ordering.sql
-- Actual owner-only size/color stock editor (not fixture-implemented).
\ir ../../supabase/migrations/20261109151847_move_variant_stock_security_definer_to_private.sql

\echo 'Stage61: guest checkout with split S/Red lines + M/Blue variants'
SET ROLE anon;
SET request.jwt.claim.sub='';
SET request.jwt.claim.jwt='{}';
DO $test$
DECLARE
 request jsonb;
 receipt jsonb;
 replay jsonb;
BEGIN
 request:=jsonb_build_object(
  'id','STG61-VARIANTS-001','customer_name','Stage61 Fixture Customer',
  'phone','+995555123456','address','Fixture address 7',
  'user_email','guest','customer_email','guest@stage61.test',
  'delivery_region','tbilisi',
  'items',jsonb_build_array(
    jsonb_build_object('id','STG61-SHOE','quantity',1,'custom_variant_id','red-s',
                       'selected_size','S','selected_color','Red'),
    jsonb_build_object('id','STG61-SHOE','quantity',1,'custom_variant_id','red-s',
                       'selected_size','S','selected_color','Red','gift_wrap',true),
    jsonb_build_object('id','STG61-SHOE','quantity',2,'custom_variant_id','blue-m',
                       'selected_size','M','selected_color','Blue')
  )
 );
 receipt:=public.create_order_with_stock(request);
 IF receipt->>'stock_deducted' IS DISTINCT FROM 'true'
    OR receipt->>'subtotal_gel' IS DISTINCT FROM '525'
    OR receipt->>'delivery_gel' IS DISTINCT FROM '5'
    OR receipt->>'total_gel' IS DISTINCT FROM '530'
    OR jsonb_array_length(receipt->'items')<>3
 THEN RAISE EXCEPTION 'Stage61 real variant checkout totals or item count incorrect: %',receipt; END IF;
 IF EXISTS (
   SELECT 1 FROM jsonb_array_elements(receipt->'items') AS line(item)
   WHERE line.item ?| ARRAY[
     'purchase_cost','purchaseCost','cost_price','costPrice','vendor',
     'unit_cost','unitCost','cost','margin','profit','supplier',
     'supplier_name','supplierName'
   ]
 ) THEN RAISE EXCEPTION 'Stage61 real checkout returned internal vendor or cost data'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(receipt->'items') AS line(item)
     WHERE line.item->>'customVariantId'='red-s')<>2
    OR (SELECT count(*) FROM jsonb_array_elements(receipt->'items') AS line(item)
      WHERE line.item->>'customVariantId'='blue-m')<>1
    OR (SELECT count(*) FROM jsonb_array_elements(receipt->'items') AS line(item)
      WHERE line.item->>'selectedSize'='S' AND line.item->>'selectedColor'='Red')<>2
    OR (SELECT count(*) FROM jsonb_array_elements(receipt->'items') AS line(item)
      WHERE line.item->>'gift_wrap'='true')<>1
 THEN RAISE EXCEPTION 'Stage61 size, color or addon line was incorrectly combined'; END IF;
 replay:=public.create_order_with_stock(request);
 IF replay->>'idempotent_replay' IS DISTINCT FROM 'true'
    OR (replay-'idempotent_replay') IS DISTINCT FROM receipt
 THEN RAISE EXCEPTION 'Stage61 variant replay changed receipt or costs'; END IF;
END $test$;
RESET ROLE;
RESET request.jwt.claim.sub;
RESET request.jwt.claim.jwt;

\echo 'Stage61: verify variant-only reductions and exact audited stock deltas'
DO $test$
DECLARE red integer;blue integer;
BEGIN
 SELECT (SELECT (e.value->>'stock')::integer
         FROM jsonb_array_elements(variants) e(value)
         WHERE e.value->>'id'='red-s'),
        (SELECT (e.value->>'stock')::integer
         FROM jsonb_array_elements(variants) e(value)
         WHERE e.value->>'id'='blue-m')
 INTO red,blue
 FROM public.products WHERE id='STG61-SHOE';
 IF red<>1 OR blue<>0
    OR (SELECT stock FROM public.products WHERE id='STG61-SHOE')<>0
 THEN RAISE EXCEPTION 'Stage61 checkout double-deducted parent or variant stock'; END IF;
 IF (SELECT count(*) FROM private.inventory_movements
      WHERE related_order_id='STG61-VARIANTS-001'
        AND reason='order_deduction')<>2
    OR (SELECT coalesce(sum(quantity_delta),0) FROM private.inventory_movements
      WHERE related_order_id='STG61-VARIANTS-001')<>-4
 THEN RAISE EXCEPTION 'Stage61 variant deduction movement audit mismatch'; END IF;
 IF (SELECT count(*) FROM public.orders WHERE id='STG61-VARIANTS-001')<>1
    OR (SELECT total_gel FROM public.orders WHERE id='STG61-VARIANTS-001')<>530
    OR (SELECT (items->0->>'purchase_cost')::numeric FROM public.orders
        WHERE id='STG61-VARIANTS-001') IS DISTINCT FROM 52
 THEN RAISE EXCEPTION 'Stage61 guest order accounting snapshot missing'; END IF;
END $test$;

\echo 'Stage61: reject mismatched variant identity/size and oversell without stock changes'
SET ROLE anon;
SET request.jwt.claim.sub='';
SET request.jwt.claim.jwt='{}';
DO $test$
DECLARE request jsonb; denied boolean;
BEGIN
 request:=jsonb_build_object(
  'id','STG61-BAD-VARIANT-001','customer_name','Stage61 Bad Variant',
  'phone','+995555123456','address','Fixture address 7',
  'user_email','guest','delivery_region','tbilisi',
  'items',jsonb_build_array(
    jsonb_build_object('id','STG61-SHOE','quantity',1,
      'custom_variant_id','red-s','selected_size','M','selected_color','Red')
  )
 );
 denied:=false;
 BEGIN
  PERFORM public.create_order_with_stock(request);
 EXCEPTION WHEN raise_exception THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Stage61 mismatched custom variant size was accepted'; END IF;
 request:=jsonb_set(request,'{id}',to_jsonb('STG61-OVERSELL-001'::text));
 request:=jsonb_set(request,'{items,0,custom_variant_id}',to_jsonb('blue-m'::text));
 request:=jsonb_set(request,'{items,0,selected_color}',to_jsonb('Blue'::text));
 denied:=false;
 BEGIN
  PERFORM public.create_order_with_stock(request);
 EXCEPTION WHEN raise_exception THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Stage61 depleted color variant was oversold'; END IF;
END $test$;
RESET ROLE;
RESET request.jwt.claim.sub;
RESET request.jwt.claim.jwt;

DO $test$
BEGIN
 IF (SELECT count(*) FROM public.orders WHERE id LIKE 'STG61-%')<>1
    OR (SELECT count(*) FROM private.inventory_movements
        WHERE related_order_id='STG61-VARIANTS-001')<>2
 THEN RAISE EXCEPTION 'Stage61 failed checkout consumed stock or wrote phantom order'; END IF;
END $test$;

\echo 'Stage61: original status RPC restores each variant, never aggregate parent stock'
SET ROLE authenticated;
SET request.jwt.claim.jwt='{}';
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000006';
DO $test$
DECLARE x jsonb;
BEGIN
 x:=public.admin_update_order_status('STG61-VARIANTS-001','გაუქმებული');
 IF x->>'status' IS DISTINCT FROM 'გაუქმებული' THEN
  RAISE EXCEPTION 'Stage61 variant order cancellation status failed'; END IF;
 x:=public.admin_update_order_status('STG61-VARIANTS-001','გაუქმებული');
 IF x->>'status' IS DISTINCT FROM 'გაუქმებული' THEN
  RAISE EXCEPTION 'Stage61 repeated variant cancellation failed'; END IF;
END $test$;
RESET ROLE;
RESET request.jwt.claim.sub;
RESET request.jwt.claim.jwt;

DO $test$
DECLARE red integer;blue integer;
BEGIN
 SELECT (SELECT (e.value->>'stock')::integer
         FROM jsonb_array_elements(variants) e(value)
         WHERE e.value->>'id'='red-s'),
        (SELECT (e.value->>'stock')::integer
         FROM jsonb_array_elements(variants) e(value)
         WHERE e.value->>'id'='blue-m')
 INTO red,blue
 FROM public.products WHERE id='STG61-SHOE';
 IF red<>3 OR blue<>2 OR (SELECT stock FROM public.products WHERE id='STG61-SHOE')<>0
 THEN RAISE EXCEPTION 'Stage61 variant cancellation failed to restore exact stock once'; END IF;
 IF (SELECT count(*) FROM private.inventory_movements
      WHERE related_order_id='STG61-VARIANTS-001' AND reason='order_cancellation')<>2
    OR (SELECT coalesce(sum(quantity_delta),0) FROM private.inventory_movements
      WHERE related_order_id='STG61-VARIANTS-001')<>0
 THEN RAISE EXCEPTION 'Stage61 variant stock movement reconciliation failed'; END IF;
 IF (SELECT (items->0->>'purchase_cost')::numeric FROM public.orders
     WHERE id='STG61-VARIANTS-001') IS DISTINCT FROM 52
    OR (SELECT total_gel FROM public.orders WHERE id='STG61-VARIANTS-001')<>530
 THEN RAISE EXCEPTION 'Stage61 cancellation modified private financial history'; END IF;
END $test$;

\echo 'Stage61: original owner-only size/color editor preserves distinct variant IDs'
SET ROLE authenticated;
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000003';
SET request.jwt.claim.jwt='{}';
DO $test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.admin_set_product_variant_stocks('STG61-SHOE',
    '[{"id":"red-s","stock":4},{"id":"blue-m","stock":2}]'::jsonb);
 EXCEPTION WHEN raise_exception THEN denied:=true;
 END;
 IF NOT denied THEN
  RAISE EXCEPTION 'Stage61 non-owner product staff changed size/color inventory'; END IF;
END $test$;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$
DECLARE denied boolean:=false;x jsonb;
BEGIN
 BEGIN
  PERFORM public.admin_set_product_variant_stocks('STG61-SHOE',
    '[{"id":"red-s","stock":4},{"id":"red-s","stock":10}]'::jsonb);
 EXCEPTION WHEN raise_exception THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Stage61 duplicate variant stock IDs accepted'; END IF;
 denied:=false;
 BEGIN
  PERFORM public.admin_set_product_variant_stocks('STG61-SHOE',
    '[{"id":"red-s","stock":4}]'::jsonb);
 EXCEPTION WHEN raise_exception THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Stage61 incomplete size/color variant update accepted'; END IF;
 x:=public.admin_set_product_variant_stocks('STG61-SHOE',
    '[{"id":"red-s","stock":4},{"id":"blue-m","stock":2}]'::jsonb);
 IF x->>'updated'<>'2' OR x->>'stock'<>'6'
 THEN RAISE EXCEPTION 'Stage61 real owner variant stock editor returned wrong totals'; END IF;
END $test$;
RESET ROLE;
RESET request.jwt.claim.sub;
RESET request.jwt.claim.jwt;

DO $test$
BEGIN
 IF (SELECT (e.value->>'stock')::integer
      FROM public.products p, jsonb_array_elements(p.variants) e(value)
      WHERE p.id='STG61-SHOE' AND e.value->>'id'='red-s')<>4
    OR (SELECT (e.value->>'stock')::integer
      FROM public.products p, jsonb_array_elements(p.variants) e(value)
      WHERE p.id='STG61-SHOE' AND e.value->>'id'='blue-m')<>2
 THEN RAISE EXCEPTION 'Stage61 owner stock edit changed the wrong size/color'; END IF;
 IF (SELECT count(*) FROM private.inventory_movements
      WHERE product_id='STG61-SHOE' AND related_order_id IS NULL
      AND before_quantity=3 AND after_quantity=4)<>1
 THEN RAISE EXCEPTION 'Stage61 owner stock adjustment missing from inventory ledger'; END IF;
END $test$;

\echo 'PASS Stage61 disposable PG17: exact real private checkout with 2 size/color variants, replay, oversell/mismatch rejection, exact variant restore, finance and inventory audit'
