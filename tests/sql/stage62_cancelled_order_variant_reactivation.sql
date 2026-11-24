-- Stage62: cancelled-order reactivation of separate size/color stock,
-- using exact committed private reactivation function + original Stage92
-- inventory-context patch, against the Stage61 disposable PG17 order.
\set ON_ERROR_STOP on
\echo 'Stage62: install source-controlled private reactivation function'
\i /tmp/stage62_original_variant_reactivation.sql
-- Actual live public wrapper is SECURITY INVOKER and only members execute it.
CREATE OR REPLACE FUNCTION public.admin_reactivate_cancelled_order(p_order_id text)
 RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $wrapper$
 SELECT private.admin_reactivate_cancelled_order(p_order_id);
$wrapper$;
REVOKE ALL ON FUNCTION private.admin_reactivate_cancelled_order(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.admin_reactivate_cancelled_order(text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_reactivate_cancelled_order(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reactivate_cancelled_order(text) TO authenticated;

\echo 'Stage62: confirm cancelled source order and separate variant stocks'
DO $test$
BEGIN
 IF (SELECT status FROM public.orders WHERE id='STG61-VARIANTS-001') <> 'გაუქმებული'
    OR (SELECT stock_restored_at FROM public.orders WHERE id='STG61-VARIANTS-001') IS NULL
    OR (SELECT stock_deducted_at FROM public.orders WHERE id='STG61-VARIANTS-001') IS NULL
 THEN RAISE EXCEPTION 'Stage62 cancelled fixture order not available'; END IF;
 IF (SELECT (e.value->>'stock')::int FROM public.products p,
     jsonb_array_elements(p.variants) AS e(value)
     WHERE p.id='STG61-SHOE' AND e.value->>'id'='red-s')<>4
    OR (SELECT (e.value->>'stock')::int FROM public.products p,
     jsonb_array_elements(p.variants) AS e(value)
     WHERE p.id='STG61-SHOE' AND e.value->>'id'='blue-m')<>2
 THEN RAISE EXCEPTION 'Stage62 variant stock starting quantities changed'; END IF;
 IF has_function_privilege('anon','public.admin_reactivate_cancelled_order(text)','EXECUTE')
    OR (SELECT prosecdef FROM pg_proc WHERE oid='public.admin_reactivate_cancelled_order(text)'::regprocedure)
    OR NOT (SELECT prosecdef FROM pg_proc WHERE oid='private.admin_reactivate_cancelled_order(text)'::regprocedure)
 THEN RAISE EXCEPTION 'Stage62 reactivation function security boundary invalid'; END IF;
END $test$;

\echo 'Stage62: deny no-session and unauthorized staff, including fresh password'
SET ROLE authenticated;
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000006';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"},"amr":[{"method":"password","timestamp":1790000000}]}';
DO $test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.admin_reactivate_cancelled_order('STG61-VARIANTS-001');
 EXCEPTION WHEN raise_exception THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Stage62 fake staff admin role bypassed owner UUID'; END IF;
END $test$;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.admin_reactivate_cancelled_order('STG61-VARIANTS-001');
 EXCEPTION WHEN raise_exception THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Stage62 owner reactivation ignored missing recent password AMR'; END IF;
END $test$;

\echo 'Stage62: owner manual inventory reduces just Blue/M below required quantity'
SELECT set_config('request.jwt.claim.jwt',
 jsonb_build_object(
  'app_metadata',jsonb_build_object('role','admin'),
  'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())::bigint))
 )::text,false);
DO $test$
DECLARE updated jsonb;
BEGIN
 updated := public.admin_set_product_variant_stocks('STG61-SHOE',
   '[{"id":"red-s","stock":4},{"id":"blue-m","stock":1}]'::jsonb);
 IF updated->>'stock'<>'5' THEN
  RAISE EXCEPTION 'Stage62 fixture insufficient inventory setup failed'; END IF;
END $test$;

\echo 'Stage62: insufficient second variant must rollback the FIRST variant deduction'
DO $test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.admin_reactivate_cancelled_order('STG61-VARIANTS-001');
 EXCEPTION WHEN raise_exception THEN denied:=true;
 END;
 IF NOT denied THEN
  RAISE EXCEPTION 'Stage62 reactivation accepted insufficient Blue/M stock'; END IF;
END $test$;
RESET ROLE;
DO $test$
BEGIN
 IF (SELECT (e.value->>'stock')::int FROM public.products p,
    jsonb_array_elements(p.variants) AS e(value)
    WHERE p.id='STG61-SHOE' AND e.value->>'id'='red-s')<>4
    OR (SELECT (e.value->>'stock')::int FROM public.products p,
    jsonb_array_elements(p.variants) AS e(value)
    WHERE p.id='STG61-SHOE' AND e.value->>'id'='blue-m')<>1
    OR (SELECT status FROM public.orders WHERE id='STG61-VARIANTS-001')<>'გაუქმებული'
    OR (SELECT count(*) FROM private.inventory_movements
        WHERE related_order_id='STG61-VARIANTS-001' AND reason='order_reactivation')<>0
 THEN RAISE EXCEPTION 'Stage62 partial reactivation escaped transaction rollback'; END IF;
END $test$;

\echo 'Stage62: restore Blue/M inventory, authorize owner reactivation, verify exact deltas'
SET ROLE authenticated;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
DO $test$
DECLARE updated jsonb; reactivated jsonb;
BEGIN
 updated := public.admin_set_product_variant_stocks('STG61-SHOE',
   '[{"id":"red-s","stock":4},{"id":"blue-m","stock":2}]'::jsonb);
 IF updated->>'stock'<>'6' THEN
  RAISE EXCEPTION 'Stage62 fixture stock replenishment failed'; END IF;
 reactivated := public.admin_reactivate_cancelled_order('STG61-VARIANTS-001');
 IF reactivated->>'status' IS DISTINCT FROM 'ახალი'
    OR reactivated->>'stock_deducted' IS DISTINCT FROM 'true'
    OR reactivated->>'reauthorized' IS DISTINCT FROM 'true'
 THEN RAISE EXCEPTION 'Stage62 true owner reactivation returned wrong state'; END IF;
END $test$;
RESET ROLE;
DO $test$
BEGIN
 IF (SELECT (e.value->>'stock')::int FROM public.products p,
    jsonb_array_elements(p.variants) AS e(value)
    WHERE p.id='STG61-SHOE' AND e.value->>'id'='red-s')<>2
    OR (SELECT (e.value->>'stock')::int FROM public.products p,
    jsonb_array_elements(p.variants) AS e(value)
    WHERE p.id='STG61-SHOE' AND e.value->>'id'='blue-m')<>0
    OR (SELECT stock FROM public.products WHERE id='STG61-SHOE')<>0
 THEN RAISE EXCEPTION 'Stage62 owner reactivation double-deducted parent or wrong variant'; END IF;
 IF (SELECT count(*) FROM private.inventory_movements
     WHERE related_order_id='STG61-VARIANTS-001' AND reason='order_reactivation')<>2
    OR (SELECT coalesce(sum(quantity_delta),0) FROM private.inventory_movements
     WHERE related_order_id='STG61-VARIANTS-001' AND reason='order_reactivation')<>-4
 THEN RAISE EXCEPTION 'Stage62 variant reactivation movement ledger missing or duplicated'; END IF;
 IF (SELECT status FROM public.orders WHERE id='STG61-VARIANTS-001')<>'ახალი'
    OR (SELECT stock_restored_at FROM public.orders WHERE id='STG61-VARIANTS-001') IS NOT NULL
    OR (SELECT stock_deducted_at FROM public.orders WHERE id='STG61-VARIANTS-001') IS NULL
 THEN RAISE EXCEPTION 'Stage62 order audit timestamps failed to update'; END IF;
 IF (SELECT (items->0->>'purchase_cost')::numeric FROM public.orders
     WHERE id='STG61-VARIANTS-001') IS DISTINCT FROM 52
    OR (SELECT total_gel FROM public.orders WHERE id='STG61-VARIANTS-001')<>530
 THEN RAISE EXCEPTION 'Stage62 reactivation modified private purchase costs or sale totals'; END IF;
END $test$;

\echo 'Stage62: replay is forbidden; repeated cancellation is still exactly-once'
SET ROLE authenticated;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
DO $test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.admin_reactivate_cancelled_order('STG61-VARIANTS-001');
 EXCEPTION WHEN raise_exception THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Stage62 reactivation replay double-deducted stock'; END IF;
END $test$;
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000006';
SET request.jwt.claim.jwt='{}';
DO $test$
DECLARE r jsonb;
BEGIN
 r:=public.admin_update_order_status('STG61-VARIANTS-001','გაუქმებული');
 IF r->>'status'<>'გაუქმებული' THEN
  RAISE EXCEPTION 'Stage62 re-cancellation failed after successful reactivation'; END IF;
 r:=public.admin_update_order_status('STG61-VARIANTS-001','გაუქმებული');
 IF r->>'status'<>'გაუქმებული' THEN
  RAISE EXCEPTION 'Stage62 duplicate re-cancellation failed'; END IF;
END $test$;
RESET ROLE;
RESET request.jwt.claim.sub;
RESET request.jwt.claim.jwt;
DO $test$
BEGIN
 IF (SELECT (e.value->>'stock')::int FROM public.products p,
    jsonb_array_elements(p.variants) AS e(value)
    WHERE p.id='STG61-SHOE' AND e.value->>'id'='red-s')<>4
    OR (SELECT (e.value->>'stock')::int FROM public.products p,
    jsonb_array_elements(p.variants) AS e(value)
    WHERE p.id='STG61-SHOE' AND e.value->>'id'='blue-m')<>2
    OR (SELECT stock FROM public.products WHERE id='STG61-SHOE')<>0
 THEN RAISE EXCEPTION 'Stage62 second cancellation did not restore just variants once'; END IF;
 IF (SELECT count(*) FROM private.inventory_movements
     WHERE related_order_id='STG61-VARIANTS-001' AND reason='order_cancellation')<>4
    OR (SELECT coalesce(sum(quantity_delta),0) FROM private.inventory_movements
     WHERE related_order_id='STG61-VARIANTS-001')<>0
 THEN RAISE EXCEPTION 'Stage62 lifecycle inventory ledger does not reconcile to zero'; END IF;
 IF (SELECT count(*) FROM public.orders WHERE id='STG61-VARIANTS-001')<>1
    OR (SELECT total_gel FROM public.orders WHERE id='STG61-VARIANTS-001')<>530
 THEN RAISE EXCEPTION 'Stage62 repeated lifecycle duplicated order or finance amounts'; END IF;
END $test$;
\echo 'PASS Stage62 disposable PG17: real variant-aware cancelled order reactivation, auth AMR, insufficient-stock atomic rollback, exact ledger reconciliation'
