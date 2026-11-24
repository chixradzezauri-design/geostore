-- Stage59: test the REAL staff-orders status and note SQL under the
-- already staged Stage57 read-privilege restrictions in disposable PG17.
-- Uses synthetic products, order rows and Auth identities only.
\set ON_ERROR_STOP on
\echo 'Stage59: seed disposable matching product/stock columns and order states'
BEGIN;
CREATE TABLE public.products (
 id text PRIMARY KEY,
 stock integer NOT NULL,
 variants jsonb NOT NULL DEFAULT '[]'::jsonb
);
INSERT INTO public.products(id,stock,variants) VALUES
 ('fixture-1',5,'[]'::jsonb),
 ('fixture-2',9,'[]'::jsonb);
UPDATE public.orders
   SET stock_deducted_at=now(),stock_restored_at=NULL
 WHERE id='STG54-ORDER-A';
COMMIT;

-- Run the EXACT existing staff-orders authorization/status migration.
-- Its private functions are not reimplemented or edited for this fixture.
\ir ../../supabase/migrations/20261117231459_staff_orders_permission.sql

-- The current Production SQL uses SECURITY INVOKER wrappers for both RPCs.
-- These minimal fixture wrappers emulate that established API boundary,
-- while the private implementation above is the actual repo migration.
CREATE FUNCTION public.admin_update_order_status(
 p_order_id text,p_new_status text
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $fn$
 SELECT private.admin_update_order_status(p_order_id,p_new_status);
$fn$;
CREATE FUNCTION public.admin_save_order_note(
 p_order_id text,p_admin_note text
) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $fn$
 SELECT private.admin_save_order_note(p_order_id,p_admin_note);
$fn$;
REVOKE ALL ON FUNCTION public.admin_update_order_status(text,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_save_order_note(text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(text,text)
 TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_order_note(text,text)
 TO authenticated;
REVOKE ALL ON FUNCTION private.admin_update_order_status(text,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.admin_save_order_note(text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.admin_update_order_status(text,text)
 TO authenticated;
GRANT EXECUTE ON FUNCTION private.admin_save_order_note(text,text)
 TO authenticated;

\echo 'Stage59: check actual role RLS and safe-column SELECT survived Stage57'
SET ROLE authenticated;
SET request.jwt.claim.jwt='{}';
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000006';
DO $test$
DECLARE
 n integer;
 status_value text;
 direct_update boolean := false;
 raw_read boolean := false;
BEGIN
 SELECT count(*) INTO n FROM public.orders;
 IF n<>3 THEN
   RAISE EXCEPTION 'Stage59 order-staff direct safe-column read regressed (% rows)',n;
 END IF;
 SELECT status INTO status_value FROM public.orders WHERE id='STG54-ORDER-A';
 IF status_value IS DISTINCT FROM 'ახალი' THEN
   RAISE EXCEPTION 'Stage59 safe order status read returned wrong value';
 END IF;
 BEGIN
   PERFORM items FROM public.orders LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN raw_read := true;
 END;
 IF NOT raw_read THEN
   RAISE EXCEPTION 'Stage59 raw order items unexpectedly readable';
 END IF;
 BEGIN
   UPDATE public.orders SET status='გაგზავნილი' WHERE id='STG54-ORDER-A';
 EXCEPTION WHEN insufficient_privilege THEN direct_update := true;
 END;
 IF NOT direct_update THEN
   RAISE EXCEPTION 'Stage59 direct status update bypassed protected RPC';
 END IF;
END $test$;

\echo 'Stage59: orders operator can update status and admin note through real private logic'
DO $test$
DECLARE
 result jsonb;
 ok boolean;
 page jsonb;
 rowA jsonb;
BEGIN
 result:=public.admin_update_order_status('STG54-ORDER-A','მუშავდება');
 IF result->>'status' IS DISTINCT FROM 'მუშავდება' THEN
   RAISE EXCEPTION 'Stage59 processing status RPC lost post-Stage57 privileges';
 END IF;
 ok:=public.admin_save_order_note('STG54-ORDER-A','Fragile – pack safely');
 IF ok IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'Stage59 admin note writer failed';
 END IF;
 page:=public.admin_order_ledger_page(0,1000);
 SELECT entry.value INTO rowA FROM jsonb_array_elements(page) AS entry(value)
 WHERE entry.value->>'id'='STG54-ORDER-A';
 IF rowA->>'status' IS DISTINCT FROM 'მუშავდება'
    OR rowA->>'admin_note' IS DISTINCT FROM 'Fragile – pack safely'
    OR rowA->'items'->0 ? 'purchase_cost' THEN
   RAISE EXCEPTION 'Stage59 protected ledger lost status/note or exposed costs';
 END IF;
END $test$;

\echo 'Stage59: cancel restores product stock ONCE; replay does not double-restock'
DO $test$
DECLARE
 result jsonb;
BEGIN
 result:=public.admin_update_order_status('STG54-ORDER-A','გაუქმებული');
 IF result->>'status' IS DISTINCT FROM 'გაუქმებული' THEN
   RAISE EXCEPTION 'Stage59 cancellation RPC returned wrong status';
 END IF;
 -- Product stock is checked outside restricted role below.
 result:=public.admin_update_order_status('STG54-ORDER-A','გაუქმებული');
 IF result->>'status' IS DISTINCT FROM 'გაუქმებული' THEN
   RAISE EXCEPTION 'Stage59 repeated cancellation failed';
 END IF;
END $test$;

\echo 'Stage59: canceled/completed order status rollback remains guarded'
DO $test$
DECLARE
 denied boolean:=false;
BEGIN
 BEGIN
   PERFORM public.admin_update_order_status('STG54-ORDER-A','ახალი');
 EXCEPTION WHEN raise_exception THEN denied:=true;
 END;
 IF NOT denied THEN
   RAISE EXCEPTION 'Stage59 cancelled order was illegally reactivated';
 END IF;
END $test$;

\echo 'Stage59: products-only and unverified accounts cannot mutate order data'
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000003';
DO $test$
DECLARE
 denied_status boolean:=false;
 denied_note boolean:=false;
BEGIN
 BEGIN
   PERFORM public.admin_update_order_status('STG54-ORDER-B','გაგზავნილი');
 EXCEPTION WHEN insufficient_privilege THEN denied_status:=true;
 END;
 BEGIN
   PERFORM public.admin_save_order_note('STG54-ORDER-B','Unauthorized note');
 EXCEPTION WHEN insufficient_privilege THEN denied_note:=true;
 END;
 IF NOT denied_status OR NOT denied_note THEN
   RAISE EXCEPTION 'Stage59 products-only staff wrote orders';
 END IF;
END $test$;
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000002';
DO $test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
   PERFORM public.admin_update_order_status('STG54-ORDER-B','გაგზავნილი');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN
   RAISE EXCEPTION 'Stage59 unverified staff wrote orders';
 END IF;
END $test$;
RESET ROLE;
RESET request.jwt.claim.sub;
RESET request.jwt.claim.jwt;

\echo 'Stage59: verify persisted internal cost and stock invariants as PG owner'
DO $test$
BEGIN
 IF (SELECT stock FROM public.products WHERE id='fixture-1')<>6
    OR (SELECT stock FROM public.products WHERE id='fixture-2')<>10 THEN
   RAISE EXCEPTION 'Stage59 stock count drifted on cancelled/replayed orders';
 END IF;
 IF (SELECT status FROM public.orders WHERE id='STG54-ORDER-A')
      IS DISTINCT FROM 'გაუქმებული'
    OR (SELECT stock_restored_at FROM public.orders WHERE id='STG54-ORDER-A') IS NULL THEN
   RAISE EXCEPTION 'Stage59 cancellation audit timestamps missing';
 END IF;
 IF (SELECT status FROM public.orders WHERE id='STG54-ORDER-B')
      IS DISTINCT FROM 'მუშავდება' THEN
   RAISE EXCEPTION 'Stage59 unauthorized status changed unexpectedly';
 END IF;
 IF (SELECT items->0->>'purchase_cost' FROM public.orders
     WHERE id='STG54-ORDER-A') IS DISTINCT FROM '40' THEN
   RAISE EXCEPTION 'Stage59 internal purchase-cost snapshot was modified';
 END IF;
 IF (SELECT checkout_result->'items'->0->>'purchase_cost'
     FROM public.orders WHERE id='STG54-ORDER-A') IS DISTINCT FROM '777' THEN
   RAISE EXCEPTION 'Stage59 checkout idempotency snapshot was altered';
 END IF;
 IF has_function_privilege('anon','public.admin_update_order_status(text,text)','EXECUTE')
    OR has_function_privilege('anon','public.admin_save_order_note(text,text)','EXECUTE')
    OR (SELECT prosecdef FROM pg_proc WHERE oid='public.admin_update_order_status(text,text)'::regprocedure)
    OR NOT (SELECT prosecdef FROM pg_proc WHERE oid='private.admin_update_order_status(text,text)'::regprocedure)
 THEN
   RAISE EXCEPTION 'Stage59 status RPC grants/security mode drifted';
 END IF;
END $test$;
\echo 'PASS Stage59 disposable PostgreSQL 17: real staff-order RPC status/note, restricted columns, cancellation stock once, internal cost intact'
