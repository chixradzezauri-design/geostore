-- Stage60: comprehensive, disposable PG17 order lifecycle integration.
-- Exact versioned status/notification/guard SQL plus original versioned
-- stock ledger trigger definitions; no real customers or Production writes.
\set ON_ERROR_STOP on
\echo 'Stage60: load actual order audit, guard, notification and ledger triggers'
BEGIN;
ALTER TABLE public.products
  ADD COLUMN name text NOT NULL DEFAULT 'Stage60 fixture product',
  ADD COLUMN category text NOT NULL DEFAULT 'Stage60 fixture category';
COMMIT;
-- The original ledger migration's remaining section rewrites six unrelated
-- product/checkout RPCs requiring the complete Production schema. Node extracts
-- its EXACT table/trigger prefix, with explicit structural checks.
\i /tmp/stage60_original_inventory_trigger_prefix.sql
\ir ../../supabase/migrations/20261103155226_track_order_status_change_time.sql
\ir ../../supabase/migrations/20261103122121_prevent_stock_restore_after_dispatch.sql
\ir ../../supabase/migrations/20261107130302_add_order_status_notifications.sql
\ir ../../supabase/migrations/20261117130000_reopen_completed_orders.sql
-- The Production trigger was introduced in the Stage70 status transition
-- migration. Here its function is the exact latest Stage100 revision above.
CREATE TRIGGER orders_guard_status_transition
  BEFORE UPDATE OF status ON public.orders FOR EACH ROW
  EXECUTE FUNCTION private.guard_order_status_transition();

\echo 'Stage60: simulate two checked-out orders using synthetic stock deduction'
BEGIN;
SELECT set_config('geostore.inventory_reason','order_deduction',true);
SELECT set_config('geostore.inventory_order_id','STG60-CANCEL-D',true);
UPDATE public.products SET stock=stock-1 WHERE id='fixture-1';
UPDATE public.products SET stock=stock-2 WHERE id='fixture-2';
INSERT INTO public.orders(
 id,user_id,created_at,total_gel,status,items,stock_deducted_at,user_email
) VALUES (
 'STG60-CANCEL-D',NULL,now(),170,'ახალი',
 '[{"id":"fixture-1","name":"Fixture 1","quantity":1,"price":70,"purchase_cost":22},{"id":"fixture-2","name":"Fixture 2","quantity":2,"price":50,"purchase_cost":16}]'::jsonb,
 now(),'guest'
);
COMMIT;

BEGIN;
SELECT set_config('geostore.inventory_reason','order_deduction',true);
SELECT set_config('geostore.inventory_order_id','STG60-COMPLETE-C',true);
UPDATE public.products SET stock=stock-1 WHERE id='fixture-1';
INSERT INTO public.orders(
 id,user_id,created_at,total_gel,status,items,stock_deducted_at,user_email
) VALUES (
 'STG60-COMPLETE-C','54000000-0000-4000-8000-00000000000a',now(),
 150,'ახალი',
 '[{"id":"fixture-1","name":"Fixture 1","quantity":1,"price":150,"purchase_cost":45,"selectedSize":"L"}]'::jsonb,
 now(),'stage60-customer@fixture.test'
);
COMMIT;

\echo 'Stage60: verify original ledger first recorded only synthetic checkout deductions'
DO $test$
BEGIN
 IF (SELECT stock FROM public.products WHERE id='fixture-1') <> 4
    OR (SELECT stock FROM public.products WHERE id='fixture-2') <> 8
 THEN RAISE EXCEPTION 'Stage60 initial synthetic checkout stock mismatch'; END IF;
 IF (SELECT count(*) FROM private.inventory_movements
     WHERE reason='order_deduction' AND related_order_id='STG60-CANCEL-D')<>2
    OR (SELECT count(*) FROM private.inventory_movements
     WHERE reason='order_deduction' AND related_order_id='STG60-COMPLETE-C')<>1
 THEN RAISE EXCEPTION 'Stage60 deduction audit entries missing'; END IF;
 IF (SELECT count(*) FROM public.order_notifications
      WHERE order_id='STG60-COMPLETE-C' AND event_key='created:ახალი')<>1
    OR (SELECT count(*) FROM public.order_notifications
      WHERE order_id='STG60-CANCEL-D')<>0
 THEN RAISE EXCEPTION 'Stage60 initial customer-vs-guest notification boundary changed'; END IF;
END $test$;

\echo 'Stage60: order operator handles lifecycle; status triggers persist timestamps/notifications'
SET ROLE authenticated;
SET request.jwt.claim.jwt='{}';
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000006';
DO $test$
DECLARE v_result jsonb;
BEGIN
 v_result:=public.admin_update_order_status('STG60-COMPLETE-C','მუშავდება');
 IF v_result->>'status'<>'მუშავდება' THEN
  RAISE EXCEPTION 'Stage60 processing update failed'; END IF;
 v_result:=public.admin_update_order_status('STG60-COMPLETE-C','გაგზავნილი');
 IF v_result->>'status'<>'გაგზავნილი' THEN
  RAISE EXCEPTION 'Stage60 dispatch update failed'; END IF;
 v_result:=public.admin_update_order_status('STG60-COMPLETE-C','დასრულებული');
 IF v_result->>'status'<>'დასრულებული' THEN
  RAISE EXCEPTION 'Stage60 completed update failed'; END IF;
END $test$;

\echo 'Stage60: dispatched/completed cancellation blocked by both RPC and original trigger'
DO $test$
DECLARE v_blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM public.admin_update_order_status('STG60-COMPLETE-C','გაუქმებული');
 EXCEPTION WHEN raise_exception THEN v_blocked:=true;
 END;
 IF NOT v_blocked THEN
  RAISE EXCEPTION 'Stage60 completed order allowed cancellation'; END IF;
END $test$;
RESET ROLE;
-- As the fixture database owner, this checks the trigger itself; the normal
-- authenticated client cannot directly UPDATE due to Stage57 ACL hardening.
DO $test$
DECLARE v_blocked boolean:=false;
BEGIN
 BEGIN
  UPDATE public.orders SET status='გაუქმებული'
  WHERE id='STG60-COMPLETE-C';
 EXCEPTION WHEN raise_exception THEN v_blocked:=true;
 END;
 IF NOT v_blocked THEN
  RAISE EXCEPTION 'Stage60 dispatched/delivered cancellation trigger bypassed';
 END IF;
END $test$;

\echo 'Stage60: completed order reopening requires current owner password AMR'
SET ROLE authenticated;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM public.admin_reopen_completed_order('STG60-COMPLETE-C');
 EXCEPTION WHEN raise_exception THEN blocked:=true;
 END;
 IF NOT blocked THEN
  RAISE EXCEPTION 'Stage60 completed-order reopening accepted stale/no password AMR';
 END IF;
END $test$;
SELECT set_config(
 'request.jwt.claim.jwt',
 jsonb_build_object(
  'app_metadata', jsonb_build_object('role','admin'),
  'amr', jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())::bigint))
 )::text,
 false
);
DO $test$
DECLARE v_result jsonb;
BEGIN
 v_result:=public.admin_reopen_completed_order('STG60-COMPLETE-C');
 IF v_result->>'status' IS DISTINCT FROM 'ახალი'
    OR v_result->>'stock_unchanged' IS DISTINCT FROM 'true'
 THEN RAISE EXCEPTION 'Stage60 owner completed-order reopening failed or duplicated deduction'; END IF;
END $test$;
RESET ROLE;
RESET request.jwt.claim.sub;
RESET request.jwt.claim.jwt;

\echo 'Stage60: cancellation restores stock once and creates trusted movement metadata'
SET ROLE authenticated;
SET request.jwt.claim.jwt='{}';
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000006';
DO $test$
DECLARE v_result jsonb;
BEGIN
 v_result:=public.admin_update_order_status('STG60-CANCEL-D','გაუქმებული');
 IF v_result->>'status' <> 'გაუქმებული' THEN
  RAISE EXCEPTION 'Stage60 cancellation failed'; END IF;
 v_result:=public.admin_update_order_status('STG60-CANCEL-D','გაუქმებული');
 IF v_result->>'status' <> 'გაუქმებული' THEN
  RAISE EXCEPTION 'Stage60 repeated cancel failed'; END IF;
END $test$;
RESET ROLE;
RESET request.jwt.claim.sub;
RESET request.jwt.claim.jwt;

\echo 'Stage60: check source audit ledger, authorized finance and public customer masks'
DO $test$
DECLARE row_finance jsonb;
BEGIN
 IF (SELECT stock FROM public.products WHERE id='fixture-1')<>5
    OR (SELECT stock FROM public.products WHERE id='fixture-2')<>10
 THEN RAISE EXCEPTION 'Stage60 stock drift after one cancellation and completion reopening'; END IF;
 IF (SELECT count(*) FROM private.inventory_movements
     WHERE reason='order_cancellation' AND related_order_id='STG60-CANCEL-D')<>2
 THEN RAISE EXCEPTION 'Stage60 cancellation movement audit missing/duplicated'; END IF;
 IF (SELECT count(*) FROM private.inventory_movements
     WHERE reason='order_deduction' AND related_order_id='STG60-COMPLETE-C')<>1
 THEN RAISE EXCEPTION 'Stage60 completed reopening added duplicate stock movement'; END IF;
 IF (SELECT coalesce(sum(quantity_delta),0) FROM private.inventory_movements
     WHERE related_order_id='STG60-CANCEL-D')<>0
    OR (SELECT coalesce(sum(quantity_delta),0) FROM private.inventory_movements
     WHERE related_order_id='STG60-COMPLETE-C')<>-1
 THEN RAISE EXCEPTION 'Stage60 inventory movement reconciliation failed'; END IF;
 IF (SELECT count(*) FROM public.order_notifications
     WHERE order_id='STG60-COMPLETE-C')<>5
 THEN RAISE EXCEPTION 'Stage60 notification events missing or duplicated'; END IF;
 IF (SELECT status FROM public.orders WHERE id='STG60-COMPLETE-C') <> 'ახალი'
    OR (SELECT status_changed_at FROM public.orders WHERE id='STG60-COMPLETE-C') IS NULL
 THEN RAISE EXCEPTION 'Stage60 status timestamp not persisted after reopening'; END IF;
 IF (SELECT total_gel FROM public.orders WHERE id='STG60-COMPLETE-C')<>150
    OR (SELECT total_gel FROM public.orders WHERE id='STG60-CANCEL-D')<>170
    OR (SELECT items->0->>'purchase_cost' FROM public.orders
        WHERE id='STG60-COMPLETE-C') IS DISTINCT FROM '45'
 THEN RAISE EXCEPTION 'Stage60 financial order amounts/snapshots changed'; END IF;
 IF (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.orders'::regclass
       AND tgname IN ('orders_guard_status_transition','prevent_cancellation_after_dispatch','orders_set_status_changed_at','orders_record_notification_after_status_update')
       AND NOT tgisinternal)<>4
 THEN RAISE EXCEPTION 'Stage60 expected original order trigger set missing'; END IF;
END $test$;

\echo 'Stage60: accounting role sees original costs, orders-only role does not'
SET ROLE authenticated;
SET request.jwt.claim.jwt='{}';
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000005';
DO $test$
DECLARE row_finance jsonb;
BEGIN
 SELECT value INTO row_finance
 FROM jsonb_array_elements(public.admin_order_ledger_page(0,100)) AS page(value)
 WHERE value->>'id'='STG60-COMPLETE-C';
 IF row_finance IS NULL OR row_finance->'items'->0->>'purchase_cost'<>'45'
    OR row_finance->>'status'<>'ახალი'
    OR (row_finance->>'total_gel')::numeric<>150
 THEN RAISE EXCEPTION 'Stage60 finance-accessed ledger inconsistent with lifecycle'; END IF;
END $test$;
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000006';
DO $test$
DECLARE row_public jsonb;
BEGIN
 SELECT value INTO row_public
 FROM jsonb_array_elements(public.admin_order_ledger_page(0,100)) AS page(value)
 WHERE value->>'id'='STG60-COMPLETE-C';
 IF row_public IS NULL OR row_public->'items'->0 ? 'purchase_cost'
    OR row_public->'items'->0->>'selectedSize'<>'L'
    OR (row_public->>'total_gel')::numeric<>150
 THEN RAISE EXCEPTION 'Stage60 orders-only ledger lost customer fields or leaked finance'; END IF;
END $test$;
RESET ROLE;
RESET request.jwt.claim.sub;
RESET request.jwt.claim.jwt;

\echo 'Stage60: original inventory audit is append-only'
DO $test$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  UPDATE private.inventory_movements SET metadata='{}'::jsonb WHERE id=(
    SELECT min(id) FROM private.inventory_movements);
 EXCEPTION WHEN object_not_in_prerequisite_state THEN blocked:=true;
 END;
 IF NOT blocked THEN
  RAISE EXCEPTION 'Stage60 inventory movement history was mutable';
 END IF;
END $test$;

\echo 'PASS Stage60 disposable PG17: original status/notification/inventory triggers, owner reopen, stock reconciliation, finance boundaries and immutable ledger'
