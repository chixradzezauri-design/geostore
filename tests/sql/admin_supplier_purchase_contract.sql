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
\ir ../../release/staged-admin-supplier-payments.sql
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
-- Payment ledger: received value, not approved commitment, is the balance.
DO $payment_test$
DECLARE po uuid:='10000000-0000-4000-8000-000000000001'; p uuid:='40000000-0000-4000-8000-000000000001'; result jsonb; rev bigint;
BEGIN
 SELECT revision INTO rev FROM public.admin_purchase_orders WHERE id=po;
 result:=public.admin_read_purchase_payments(po);
 IF result->>'received_tetri'<>'3725' OR result->>'paid_tetri'<>'0' OR result->>'balance_tetri'<>'3725' THEN RAISE EXCEPTION 'Initial balance mismatch: %',result; END IF;
 result:=public.admin_record_purchase_payment(po,p,rev,'1000','bank_transfer','test-001');
 IF result->>'amount_tetri'<>'1000' OR result->>'idempotent_replay'<>'false' THEN RAISE EXCEPTION 'Payment snapshot mismatch'; END IF;
 result:=public.admin_record_purchase_payment(po,p,rev,'1000','bank_transfer','test-001');
 IF result->>'idempotent_replay'<>'true' THEN RAISE EXCEPTION 'Payment replay failed'; END IF;
 BEGIN PERFORM public.admin_record_purchase_payment(po,p,rev,'1001','bank_transfer','test-001'); RAISE EXCEPTION 'Changed replay accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_record_purchase_payment(po,gen_random_uuid(),rev,'1','cash','stale'); RAISE EXCEPTION 'Stale payment accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 rev:=rev+1;
 BEGIN PERFORM public.admin_record_purchase_payment(po,gen_random_uuid(),rev,'2726','cash','over'); RAISE EXCEPTION 'Overpayment accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_record_purchase_payment(po,gen_random_uuid(),rev,'1','bank_transfer','TEST-001'); RAISE EXCEPTION 'Duplicate reference accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM public.admin_record_purchase_payment(po,gen_random_uuid(),rev,'0','cash','zero'); RAISE EXCEPTION 'Zero payment accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_record_purchase_payment(po,gen_random_uuid(),rev,'1.5','cash','fraction'); RAISE EXCEPTION 'Fractional tetri accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 result:=public.admin_read_purchase_payments(po);
 IF result->>'paid_tetri'<>'1000' OR result->>'balance_tetri'<>'2725' OR result->>'payment_count'<>'1' OR result->>'revision'<>rev::text THEN RAISE EXCEPTION 'Partial balance mismatch'; END IF;
 PERFORM public.admin_record_purchase_payment(po,gen_random_uuid(),rev,'2725','cash','test-002');
 result:=public.admin_read_purchase_payments(po);
 IF result->>'paid_tetri'<>'3725' OR result->>'balance_tetri'<>'0' OR result->>'payment_count'<>'2' OR jsonb_array_length(result->'payments')<>2 THEN RAISE EXCEPTION 'Settled balance mismatch'; END IF;
 BEGIN UPDATE public.admin_purchase_payments SET amount_tetri=1 WHERE id=p; RAISE EXCEPTION 'Direct payment write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $payment_test$;
DO $correction_test$
DECLARE po uuid:='10000000-0000-4000-8000-000000000001'; p uuid:='40000000-0000-4000-8000-000000000001'; c uuid:='50000000-0000-4000-8000-000000000001'; s uuid; rev bigint; result jsonb;
BEGIN
 SELECT revision,supplier_id INTO rev,s FROM public.admin_purchase_orders WHERE id=po;
 result:=public.admin_correct_purchase_payment(po,p,c,rev,'Duplicate payment entry');
 IF result->>'amount_tetri'<>'1000' OR result->>'idempotent_replay'<>'false' THEN RAISE EXCEPTION 'Correction snapshot mismatch'; END IF;
 result:=public.admin_correct_purchase_payment(po,p,c,rev,'Duplicate payment entry');
 IF result->>'idempotent_replay'<>'true' THEN RAISE EXCEPTION 'Correction retry failed'; END IF;
 BEGIN PERFORM public.admin_correct_purchase_payment(po,p,c,rev,'Different reason'); RAISE EXCEPTION 'Changed replay accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 rev:=rev+1;
 BEGIN PERFORM public.admin_correct_purchase_payment(po,p,gen_random_uuid(),rev,'Second correction'); RAISE EXCEPTION 'Double correction accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_correct_purchase_payment('10000000-0000-4000-8000-000000000009',p,gen_random_uuid(),rev,'Wrong purchase'); RAISE EXCEPTION 'Cross-purchase correction allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 result:=public.admin_read_purchase_payments(po);
 IF result->>'paid_tetri'<>'2725' OR result->>'balance_tetri'<>'1000' OR result->>'correction_count'<>'1' OR result->>'payment_count'<>'2' THEN RAISE EXCEPTION 'Corrected balance mismatch: %',result; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result->'payments') e(item) WHERE item->>'id'=p::text AND item->'correction'->>'id'=c::text) THEN RAISE EXCEPTION 'Correction history missing'; END IF;
 result:=public.admin_read_supplier_balance(s);
 IF result->>'received_tetri'<>'7425' OR result->>'paid_tetri'<>'2725' OR result->>'balance_tetri'<>'4700' OR result->>'purchase_count'<>'2' THEN RAISE EXCEPTION 'Supplier balance mismatch: %',result; END IF;
 IF public.admin_read_supplier_balance(NULL)->>'balance_tetri'<>'4700' THEN RAISE EXCEPTION 'Global balance mismatch'; END IF;
 PERFORM public.admin_record_purchase_payment(po,gen_random_uuid(),rev,'1000','bank_transfer','test-003-corrected');
 IF public.admin_read_purchase_payments(po)->>'balance_tetri'<>'0' THEN RAISE EXCEPTION 'Replacement payment failed'; END IF;
END $correction_test$;
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
 BEGIN PERFORM public.admin_read_supplier_balance(NULL); RAISE EXCEPTION 'Non-owner supplier balance'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.admin_correct_purchase_payment('10000000-0000-4000-8000-000000000001',gen_random_uuid(),gen_random_uuid(),1,'Staff correction'); RAISE EXCEPTION 'Non-owner correction'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.admin_read_purchase_payments('10000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'Non-owner payment read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.admin_record_purchase_payment('10000000-0000-4000-8000-000000000001',gen_random_uuid(),1,'1','cash','staff'); RAISE EXCEPTION 'Non-owner payment write'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.admin_create_purchase(gen_random_uuid(),gen_random_uuid(),'[]'); RAISE EXCEPTION 'Non-owner RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.admin_suppliers(name,commission,is_active) VALUES('Bad',1,true); RAISE EXCEPTION 'Non-owner supplier write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
RESET ROLE;
DO $test$ BEGIN
 IF has_function_privilege('anon','public.admin_receive_purchase(uuid,uuid,uuid,bigint,integer)','EXECUTE') OR has_table_privilege('anon','public.admin_purchase_receipts','SELECT') THEN RAISE EXCEPTION 'Anonymous privilege'; END IF;
END $test$;
DO $payment_privileges$
BEGIN
 IF has_function_privilege('anon','public.admin_record_purchase_payment(uuid,uuid,bigint,text,text,text)','EXECUTE') OR has_function_privilege('anon','public.admin_read_purchase_payments(uuid)','EXECUTE') OR has_table_privilege('authenticated','public.admin_purchase_payments','SELECT') THEN RAISE EXCEPTION 'Payment privilege leak'; END IF;
 IF (SELECT count(*) FROM public.admin_purchase_payments)<>3 OR (SELECT count(*) FROM public.admin_purchase_payment_corrections)<>1 THEN RAISE EXCEPTION 'Unexpected audit count'; END IF;
 IF has_function_privilege('anon','public.admin_correct_purchase_payment(uuid,uuid,uuid,bigint,text)','EXECUTE') OR has_function_privilege('anon','public.admin_read_supplier_balance(uuid)','EXECUTE') OR has_table_privilege('authenticated','public.admin_purchase_payment_corrections','SELECT') THEN RAISE EXCEPTION 'Correction privilege leak'; END IF;
 BEGIN DELETE FROM public.admin_purchase_payment_corrections; RAISE EXCEPTION 'Correction deletion allowed'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
 BEGIN DELETE FROM public.admin_purchase_payments; RAISE EXCEPTION 'Payment audit deletion allowed'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
END $payment_privileges$;
\echo 'PASS supplier, purchase and payment contract (isolated)'
