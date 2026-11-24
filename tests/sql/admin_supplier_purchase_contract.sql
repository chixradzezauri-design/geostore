-- Run in a NEW disposable PostgreSQL database, not production.
\set ON_ERROR_STOP on
CREATE SCHEMA private;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA private,auth,public TO authenticated,anon;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.jwt',true),''),'{}')::jsonb; $$;
CREATE TABLE public.products(id text PRIMARY KEY,name text NOT NULL,category text,vendor text,stock integer CHECK(stock BETWEEN 0 AND 1000000),variants jsonb DEFAULT '[]',purchase_cost numeric);
REVOKE ALL ON public.products FROM PUBLIC,anon,authenticated;
INSERT INTO public.products VALUES ('base','Fixture base','fixture','Supplier',10,'[]',3),('other','Other','fixture','Supplier',2,'[]',7),('variant','Variant','fixture','Supplier',2,'[{"id":"v","name":"Red S","variantType":"size_color","stock":2,"priceGEL":20},{"id":"w","name":"Blue M","variantType":"size_color","stock":4,"priceGEL":25}]',8);
\i /tmp/stage60_original_inventory_trigger_prefix.sql
\ir ../../release/staged-admin-suppliers.sql
\ir ../../release/staged-admin-purchases.sql
SET ROLE authenticated;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$
DECLARE supplier uuid; po uuid:='10000000-0000-4000-8000-000000000001'; line uuid; otherline uuid; receipt uuid:='20000000-0000-4000-8000-000000000001'; result jsonb;
BEGIN
 INSERT INTO public.admin_suppliers(name,commission,is_active) VALUES('Supplier',5,true) RETURNING id INTO supplier;
 UPDATE public.admin_suppliers SET commission=6 WHERE id=supplier AND revision=1;
 IF (SELECT revision FROM public.admin_suppliers WHERE id=supplier)<>2 THEN RAISE EXCEPTION 'Supplier revision failed'; END IF;
 BEGIN INSERT INTO public.admin_suppliers(name,commission,is_active) VALUES('supplier',4,true); RAISE EXCEPTION 'Duplicate allowed'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN UPDATE public.admin_suppliers SET name='renamed' WHERE id=supplier; RAISE EXCEPTION 'Rename allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.admin_suppliers WHERE id=supplier; RAISE EXCEPTION 'Delete allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 result:=public.admin_create_purchase(po,supplier,'[{"product_id":"base","quantity":5,"unit_cost":4.25},{"product_id":"other","quantity":2,"unit_cost":8}]');
 IF result->>'status'<>'draft' THEN RAISE EXCEPTION 'Draft failed'; END IF;
 SELECT id INTO line FROM public.admin_purchase_lines WHERE purchase_id=po AND product_id='base';
 SELECT id INTO otherline FROM public.admin_purchase_lines WHERE purchase_id=po AND product_id='other';
 BEGIN PERFORM public.admin_receive_purchase(po,line,receipt,1,2); RAISE EXCEPTION 'Draft receipt allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM public.admin_transition_purchase(po,1,'approve');
 result:=public.admin_receive_purchase(po,line,receipt,2,2);
 IF (result->>'stock_before')::integer<>10 OR (result->>'stock_after')::integer<>12 OR (result->>'unit_cost')::numeric<>4.25 THEN RAISE EXCEPTION 'Receipt snapshot mismatch'; END IF;
 result:=public.admin_receive_purchase(po,line,receipt,2,2);
 IF result->>'idempotent_replay'<>'true' THEN RAISE EXCEPTION 'Receipt retry failed'; END IF;
 BEGIN PERFORM public.admin_receive_purchase(po,line,receipt,2,3); RAISE EXCEPTION 'Changed replay allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_receive_purchase(po,line,gen_random_uuid(),2,1); RAISE EXCEPTION 'Stale revision allowed'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM public.admin_receive_purchase(po,line,gen_random_uuid(),3,4); RAISE EXCEPTION 'Overreceipt allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_transition_purchase(po,3,'cancel'); RAISE EXCEPTION 'Partial cancellation allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM public.admin_receive_purchase(po,line,gen_random_uuid(),3,3);
 PERFORM public.admin_receive_purchase(po,otherline,gen_random_uuid(),4,2);
 IF (SELECT status FROM public.admin_purchase_orders WHERE id=po)<>'received' OR (SELECT count(*) FROM public.admin_purchase_receipts WHERE purchase_id=po)<>3 THEN RAISE EXCEPTION 'Completion failed'; END IF;
 BEGIN PERFORM public.admin_create_purchase(gen_random_uuid(),supplier,'[{"product_id":"variant","quantity":2,"unit_cost":1}]'); RAISE EXCEPTION 'Variant receipt incorrectly supported'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN UPDATE public.admin_purchase_receipts SET quantity=1 WHERE id=receipt; RAISE EXCEPTION 'Receipt write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
-- Independent variant order: two variants of one product may be purchased separately.
DO $variant_test$
DECLARE supplier uuid; po uuid:='10000000-0000-4000-8000-000000000009'; line uuid; otherline uuid; receipt uuid:=gen_random_uuid(); result jsonb;
BEGIN
 SELECT id INTO supplier FROM public.admin_suppliers WHERE name='Supplier';
 BEGIN PERFORM public.admin_create_purchase(gen_random_uuid(),supplier,'[{"product_id":"variant","variant_id":"missing","quantity":1,"unit_cost":1}]'); RAISE EXCEPTION 'Unknown variant accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_create_purchase(gen_random_uuid(),supplier,'[{"product_id":"variant","variant_id":"v","quantity":1,"unit_cost":1},{"product_id":"variant","variant_id":"v","quantity":1,"unit_cost":1}]'); RAISE EXCEPTION 'Duplicate variant accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 PERFORM public.admin_create_purchase(po,supplier,'[{"product_id":"variant","variant_id":"v","quantity":3,"unit_cost":9},{"product_id":"variant","variant_id":"w","quantity":1,"unit_cost":10}]');
 SELECT id INTO line FROM public.admin_purchase_lines WHERE purchase_id=po AND variant_id='v';
 SELECT id INTO otherline FROM public.admin_purchase_lines WHERE purchase_id=po AND variant_id='w';
 PERFORM public.admin_transition_purchase(po,1,'approve');
 result:=public.admin_receive_purchase(po,line,receipt,2,3);
 IF result->>'stock_before'<>'2' OR result->>'stock_after'<>'5' THEN RAISE EXCEPTION 'Variant receipt snapshot mismatch'; END IF;
 PERFORM public.admin_receive_purchase(po,otherline,gen_random_uuid(),3,1);
 result:=public.admin_receive_purchase(po,line,receipt,2,3);
 IF result->>'idempotent_replay'<>'true' OR (SELECT status FROM public.admin_purchase_orders WHERE id=po)<>'received' THEN RAISE EXCEPTION 'Completed variant replay failed'; END IF;
END $variant_test$;
RESET ROLE;
DO $test$
BEGIN
 IF (SELECT stock FROM public.products WHERE id='base')<>15 OR (SELECT stock FROM public.products WHERE id='other')<>4 OR (SELECT stock FROM public.products WHERE id='variant')<>2 OR (SELECT purchase_cost FROM public.products WHERE id='base')<>3 THEN RAISE EXCEPTION 'Stock or historical cost mismatch'; END IF;
 IF (SELECT sum(quantity_delta) FROM private.inventory_movements WHERE reason='manual_adjustment' AND product_id='base')<>5 THEN RAISE EXCEPTION 'Existing movement audit missing'; END IF;
 IF (SELECT (variants->0->>'stock')::integer FROM public.products WHERE id='variant')<>5 OR (SELECT (variants->1->>'stock')::integer FROM public.products WHERE id='variant')<>5 OR (SELECT (variants->0->>'priceGEL')::integer FROM public.products WHERE id='variant')<>20 OR (SELECT purchase_cost FROM public.products WHERE id='variant')<>8 THEN RAISE EXCEPTION 'Variant stock or price mismatch'; END IF;
 IF (SELECT count(*) FROM private.inventory_movements WHERE product_id='variant' AND reason='manual_adjustment')<>2 OR (SELECT sum(quantity_delta) FROM private.inventory_movements WHERE product_id='variant' AND reason='manual_adjustment')<>4 THEN RAISE EXCEPTION 'Variant movement audit mismatch'; END IF;
 IF (SELECT count(*) FROM public.admin_purchase_orders)<>2 THEN RAISE EXCEPTION 'Invalid draft not rolled back'; END IF;
END $test$;
SET ROLE authenticated;
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000003';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$
BEGIN
 IF EXISTS(SELECT 1 FROM public.admin_suppliers) OR EXISTS(SELECT 1 FROM public.admin_purchase_orders) OR EXISTS(SELECT 1 FROM public.admin_purchase_lines) OR EXISTS(SELECT 1 FROM public.admin_purchase_receipts) THEN RAISE EXCEPTION 'Non-owner read'; END IF;
 BEGIN PERFORM public.admin_create_purchase(gen_random_uuid(),gen_random_uuid(),'[]'); RAISE EXCEPTION 'Non-owner RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.admin_suppliers(name,commission,is_active) VALUES('Bad',1,true); RAISE EXCEPTION 'Non-owner supplier write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
RESET ROLE;
DO $test$ BEGIN
 IF has_function_privilege('anon','public.admin_receive_purchase(uuid,uuid,uuid,bigint,integer)','EXECUTE') OR has_table_privilege('anon','public.admin_purchase_receipts','SELECT') THEN RAISE EXCEPTION 'Anonymous privilege'; END IF;
END $test$;
\echo 'PASS supplier and base purchase contract (isolated)'
