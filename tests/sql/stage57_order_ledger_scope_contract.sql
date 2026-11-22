-- Stage57: run the exact staged RPC/ACL migration in disposable Postgres17.
-- Depends on the Stage54 public.orders fixture and Stage56 synthetic Auth.
\set ON_ERROR_STOP on
\echo 'Stage57: prepare full order record columns and fake orders-only identity'
BEGIN;
ALTER TABLE public.orders
 ADD COLUMN customer_name text,
 ADD COLUMN phone text,
 ADD COLUMN address text,
 ADD COLUMN user_email text,
 ADD COLUMN customer_email text,
 ADD COLUMN admin_note text,
 ADD COLUMN stock_deducted_at timestamptz,
 ADD COLUMN stock_restored_at timestamptz,
 ADD COLUMN checkout_result jsonb,
 ADD COLUMN checkout_request jsonb;
UPDATE public.orders
SET customer_name='Fixture Customer',phone='599123456',
    address='Fixture street 7',user_email='customer@stage57.test',
    customer_email='customer@stage57.test',
    admin_note='Pack carefully',
    checkout_result=jsonb_build_object(
      'items',jsonb_build_array(jsonb_build_object('purchase_cost',777)),
      'subtotal_gel',160,'discount_gel',10,'delivery_gel',5,
      'internal_vendor','secret'
    ),
    checkout_request=jsonb_build_object(
      'coupon_code','TEST-10','private_note','should-not-leak'
    )
WHERE id='STG54-ORDER-A';
UPDATE public.orders
SET items=jsonb_set(items,'{0,image}',to_jsonb('https://fixture.example/snapshot.png'::text),true)
WHERE id='STG54-ORDER-A';
INSERT INTO auth.users(id,email_confirmed_at) VALUES
 ('56000000-0000-4000-8000-000000000006', now());
INSERT INTO public.admin_staff_members(
 user_id,email,display_name,role,permissions,is_active
) VALUES (
 '56000000-0000-4000-8000-000000000006','orders@stage57.test',
 'Orders Operator','operator',
 '{"orders":true,"expenses":false,"products":false}'::jsonb,true
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stage57 fixture orders visibility" ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_staff_permission('orders'));
COMMIT;

-- Execute the exact Stage57 SQL, not a fixture-specific rewrite.
\ir ../../supabase/migrations/20261121210000_scope_admin_order_ledger_permissions.sql

-- Phase A must keep the original deployed admin's read paths working until
-- the new frontend has deployed. Never revoke raw order grants first.
DO $bridge$
BEGIN
 IF NOT has_column_privilege('authenticated','public.orders','items','SELECT')
    OR NOT has_column_privilege('authenticated','public.orders','checkout_result','SELECT')
    OR to_regprocedure('public.admin_order_ledger_page(integer,integer)') IS NULL
    OR to_regprocedure('public.admin_order_image_refs_page(integer,integer)') IS NULL
 THEN RAISE EXCEPTION 'Stage70 phase A broke live legacy admin order reads'; END IF;
END $bridge$;

-- Phase B can run only AFTER the new frontend switches to RPCs.
-- Fixture runs both phases consecutively, but release operations cannot.
\ir ../../supabase/migrations/20261121213000_revoke_legacy_order_snapshot_reads.sql

\echo 'Stage57: check grants, private SECURITY DEFINER, public SECURITY INVOKER'
DO $check$
BEGIN
  IF has_column_privilege('authenticated','public.orders','items','SELECT')
     OR has_column_privilege('authenticated','public.orders','checkout_result','SELECT')
     OR has_column_privilege('authenticated','public.orders','checkout_request','SELECT')
  THEN RAISE EXCEPTION 'Stage57 raw finance-bearing columns remain exposed'; END IF;
  IF NOT has_column_privilege('authenticated','public.orders','status','SELECT')
     OR NOT has_column_privilege('authenticated','public.orders','id','SELECT')
  THEN RAISE EXCEPTION 'Stage57 safe metadata lost read grant'; END IF;
  IF has_function_privilege('anon','public.admin_order_ledger_page(integer,integer)','EXECUTE')
     OR has_function_privilege('anon','public.admin_order_image_refs_page(integer,integer)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.admin_order_ledger_page(integer,integer)','EXECUTE')
  THEN RAISE EXCEPTION 'Stage57 RPC invoker grants were widened'; END IF;
  IF (SELECT prosecdef FROM pg_proc WHERE oid='public.admin_order_ledger_page(integer,integer)'::regprocedure)
     OR NOT (SELECT prosecdef FROM pg_proc WHERE oid='private.admin_order_ledger_page(integer,integer)'::regprocedure)
  THEN RAISE EXCEPTION 'Stage57 order RPC execution mode unsafe'; END IF;
END $check$;

\echo 'Stage57: orders-only operator gets operational order data without costs'
SET ROLE authenticated;
SET request.jwt.claim.jwt='{}';
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000006';
DO $test$
DECLARE
  page jsonb;
  line jsonb;
  blocked boolean := false;
BEGIN
  page := public.admin_order_ledger_page(0,1000);
  IF jsonb_typeof(page) <> 'array' OR jsonb_array_length(page) <> 3
  THEN RAISE EXCEPTION 'Stage57 page not complete for orders-only staff'; END IF;
  SELECT row.value INTO line FROM jsonb_array_elements(page) AS row(value)
  WHERE row.value->>'id'='STG54-ORDER-A';
  IF line IS NULL
     OR line->>'customer_name' <> 'Fixture Customer'
     OR line->>'phone' <> '599123456'
     OR line->>'admin_note' <> 'Pack carefully'
     OR line->'items'->0->>'price' <> '100'
     OR line->'items'->0->>'selectedSize' <> 'M'
     OR line->'checkout_result'->>'subtotal_gel' <> '160'
     OR line->'checkout_result'->>'delivery_gel' <> '5'
     OR line->'checkout_request'->>'coupon_code' <> 'TEST-10'
  THEN RAISE EXCEPTION 'Stage57 order UI fields were lost'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(line->'items') AS item(value)
    WHERE item.value ?| ARRAY[
      'purchase_cost','purchaseCost','cost_price','costPrice','vendor',
      'unit_cost','unitCost','cost','margin','profit','supplier',
      'supplier_name','supplierName'
    ]
  ) THEN RAISE EXCEPTION 'Stage57 orders-only leaked financial fields'; END IF;
  IF line->'checkout_result' ? 'items'
    OR line->'checkout_result' ? 'internal_vendor'
    OR line->'checkout_request' ? 'private_note'
  THEN RAISE EXCEPTION 'Stage57 checkout snapshot leaked'; END IF;
  BEGIN
    PERFORM items FROM public.orders LIMIT 1;
    RAISE EXCEPTION 'Stage57 direct raw items read succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Stage57 direct order-item column access unsafe'; END IF;
  IF jsonb_array_length(public.admin_order_ledger_page(0,1)) <> 1
     OR jsonb_array_length(public.admin_order_ledger_page(1,1)) <> 1
     OR jsonb_array_length(public.admin_order_ledger_page(2,1)) <> 1
     OR jsonb_array_length(public.admin_order_ledger_page(3,1)) <> 0
  THEN RAISE EXCEPTION 'Stage57 paging is incomplete or duplicated'; END IF;
END $test$;

\echo 'Stage57: finance operator retains original costs only through protected RPC'
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000005';
DO $test$
DECLARE page jsonb; rowA jsonb;
BEGIN
  page := public.admin_order_ledger_page(0,100);
  SELECT obj.value INTO rowA FROM jsonb_array_elements(page) AS obj(value)
  WHERE obj.value->>'id'='STG54-ORDER-A';
  IF rowA->'items'->0->>'purchase_cost' <> '40'
     OR rowA->'items'->0->>'vendor' <> 'internal-vendor'
     OR rowA->'items'->1->>'costPrice' <> '22'
  THEN RAISE EXCEPTION 'Stage57 finance-authorized snapshots missing'; END IF;
  IF rowA->'checkout_result' ? 'items'
     OR rowA->'checkout_request' ? 'private_note'
  THEN RAISE EXCEPTION 'Stage57 unneeded raw checkout fields leaked'; END IF;
END $test$;

\echo 'Stage57: products-only staff see strictly image-reference data'
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000003';
DO $test$
DECLARE refs jsonb; lines jsonb; denied boolean := false;
BEGIN
  refs := public.admin_order_image_refs_page(0,1000);
  IF jsonb_array_length(refs) <> 3 OR jsonb_typeof(refs->0->'items') <> 'array'
  THEN RAISE EXCEPTION 'Stage57 historical image reference scan incomplete'; END IF;
  SELECT row.value->'items' INTO lines
    FROM jsonb_array_elements(refs) AS row(value)
   WHERE row.value->'items'->0->>'id'='fixture-1';
  IF lines->0->>'image' <> 'https://fixture.example/snapshot.png'
  THEN RAISE EXCEPTION 'Stage57 historical image snapshot was lost'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(refs) AS r(value)
    WHERE (SELECT string_agg(key,',') FROM jsonb_object_keys(r.value) AS key) <> 'items'
  ) THEN RAISE EXCEPTION 'Stage57 image scan reveals order information'; END IF;
  IF lines->0 ? 'purchase_cost' OR lines->0 ? 'price'
     OR lines->0 ? 'vendor' OR lines->0 ? 'customer_name'
  THEN RAISE EXCEPTION 'Stage57 images RPC exposes order finance/PII'; END IF;
  BEGIN
    PERFORM public.admin_order_ledger_page(0,100);
    RAISE EXCEPTION 'Stage57 products-only staff read orders';
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Stage57 order permission bypass'; END IF;
END $test$;

\echo 'Stage57: no-session, inactive and invalid pagination fail closed'
SET request.jwt.claim.sub='';
DO $test$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    PERFORM public.admin_order_ledger_page(0,100);
    RAISE EXCEPTION 'Stage57 no-session read succeeded';
  EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Stage57 no-session missing denial'; END IF;
END $test$;
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000004';
DO $test$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.admin_order_image_refs_page(0,100);
    RAISE EXCEPTION 'Stage57 inactive staff read image refs';
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Stage57 inactive staff permission bypass'; END IF;
END $test$;
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000005';
DO $test$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.admin_order_ledger_page(-1,100);
    RAISE EXCEPTION 'Stage57 invalid page was allowed';
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Stage57 invalid offset accepted'; END IF;
END $test$;
RESET ROLE;
RESET request.jwt.claim.sub;
RESET request.jwt.claim.jwt;

\echo 'Stage57: internal source of truth is unmodified for idempotent finance'
DO $test$
BEGIN
  IF (SELECT items->0->>'purchase_cost' FROM public.orders WHERE id='STG54-ORDER-A') IS DISTINCT FROM '40'
     OR (SELECT checkout_result->'items'->0->>'purchase_cost' FROM public.orders WHERE id='STG54-ORDER-A') IS DISTINCT FROM '777'
  THEN RAISE EXCEPTION 'Stage57 finance/idempotency snapshots were altered'; END IF;
END $test$;
\echo 'PASS Stage57 disposable PG17: orders-only redact cost, finance retained, product images safe, raw grants revoked, role/offset gates'
