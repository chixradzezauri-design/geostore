-- Stage69: reproduce historic order-item incompatibility from the UNAPPLIED
-- legacy BEFORE INSERT OR UPDATE OF items trigger. Uses the genuine
-- previously completed Stage61/62 variants and the exact original SQL.
-- This is a rollback-only disposable postgres:17 test, NEVER Supabase live.
\set ON_ERROR_STOP on

\echo 'Stage69: current order historical-variant record, trigger and stock baselines'
DO $preflight$
BEGIN
 IF to_regclass('public.orders') IS NULL
    OR to_regclass('public.products') IS NULL
    OR EXISTS (
      SELECT 1 FROM pg_trigger t WHERE t.tgrelid='public.orders'::regclass
        AND t.tgname='orders_validate_item_variants' AND NOT t.tgisinternal
    )
    OR to_regprocedure('private.validate_order_item_variants()') IS NOT NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.orders
       WHERE id='STG61-VARIANTS-001'
         AND status='გაუქმებული' AND total_gel=530
         AND items->0->>'selectedSize'='S'
         AND items->0->>'selectedColor'='Red'
    )
    OR (SELECT available_sizes FROM public.products WHERE id='STG61-SHOE')
       IS DISTINCT FROM '["S","M"]'::jsonb
    OR (SELECT available_colors FROM public.products WHERE id='STG61-SHOE')
       IS DISTINCT FROM '["Red","Blue"]'::jsonb
 THEN RAISE EXCEPTION 'Stage69 fixture or source trigger baseline is not compatible'; END IF;
END $preflight$;

BEGIN;
  CREATE TEMP TABLE stage69_snapshot ON COMMIT DROP AS
   SELECT id, items, status, total_gel, stock_restored_at, stock_deducted_at
     FROM public.orders WHERE id='STG61-VARIANTS-001';

  \echo 'Stage69: new catalog options do not invalidate an EXISTING historical order'
  UPDATE public.products
     SET available_sizes='[]'::jsonb,
         available_colors='[]'::jsonb
   WHERE id='STG61-SHOE';

  -- No catalog options now, but the cancelled historical order's item
  -- snapshot must remain valid and should tolerate an idempotent rewrite
  -- without touching totals, status, variant stocks or movement ledger.
  SAVEPOINT stage69_before_order_touch;
  UPDATE public.orders SET items=items WHERE id='STG61-VARIANTS-001';

  DO $modern$
  BEGIN
    IF (SELECT count(*) FROM public.orders o
        JOIN stage69_snapshot s USING (id)
        WHERE o.items=s.items AND o.status=s.status AND o.total_gel=s.total_gel
          AND o.stock_restored_at=s.stock_restored_at
          AND o.stock_deducted_at=s.stock_deducted_at) <> 1
    THEN RAISE EXCEPTION 'Stage69 original historical no-op order update failed'; END IF;
  END $modern$;

  ROLLBACK TO SAVEPOINT stage69_before_order_touch;

  \echo 'Stage69: temporarily install EXACT legacy variant trigger from the repo'
  \ir ../../supabase/migrations/20261106120000_validate_order_item_variants.sql

  DO $installed$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t WHERE t.tgrelid='public.orders'::regclass
        AND t.tgname='orders_validate_item_variants'
        AND (t.tgtype & 2)=2 AND (t.tgtype & 1)=1
        AND NOT t.tgisinternal AND t.tgenabled<>'D'
    ) THEN RAISE EXCEPTION 'Stage69 exact legacy BEFORE trigger was not installed'; END IF;
  END $installed$;

  \echo 'Stage69: the obsolete trigger rejects a historically valid no-op order update'
  DO $legacy$
  DECLARE
    v_message text;
    v_denied boolean:=false;
  BEGIN
    BEGIN
      UPDATE public.orders SET items=items WHERE id='STG61-VARIANTS-001';
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
      IF v_message IS DISTINCT FROM 'არჩეული ზომა ამ პროდუქტისთვის ხელმისაწვდომი არ არის.' THEN
        RAISE EXCEPTION 'Stage69 unexpected error, not a legacy variant regression: %', v_message;
      END IF;
      v_denied:=true;
    END;
    IF NOT v_denied THEN
      RAISE EXCEPTION 'Stage69 obsolete variant trigger unexpectedly accepted historic no-op update';
    END IF;
  END $legacy$;

  DO $integrity$
  BEGIN
    IF (SELECT count(*) FROM public.orders o
        JOIN stage69_snapshot s USING (id)
        WHERE o.items=s.items AND o.status=s.status AND o.total_gel=s.total_gel
          AND o.stock_restored_at=s.stock_restored_at
          AND o.stock_deducted_at=s.stock_deducted_at) <> 1
       OR (SELECT (v.value->>'stock')::integer FROM public.products p,
            jsonb_array_elements(p.variants) v(value)
            WHERE p.id='STG61-SHOE' AND v.value->>'id'='red-s')<>4
       OR (SELECT (v.value->>'stock')::integer FROM public.products p,
            jsonb_array_elements(p.variants) v(value)
            WHERE p.id='STG61-SHOE' AND v.value->>'id'='blue-m')<>2
       OR (SELECT count(*) FROM private.inventory_movements
            WHERE related_order_id='STG61-VARIANTS-001' AND reason='order_reactivation')<>2
    THEN RAISE EXCEPTION 'Stage69 blocked legacy update damaged historical order or stock ledger'; END IF;
  END $integrity$;

ROLLBACK;

\echo 'Stage69: verify original catalog options and stored order fully preserved'
DO $restored$
BEGIN
  IF EXISTS (
      SELECT 1 FROM pg_trigger t WHERE t.tgrelid='public.orders'::regclass
        AND t.tgname='orders_validate_item_variants' AND NOT t.tgisinternal
     )
     OR to_regprocedure('private.validate_order_item_variants()') IS NOT NULL
     OR (SELECT available_sizes FROM public.products WHERE id='STG61-SHOE')
        IS DISTINCT FROM '["S","M"]'::jsonb
     OR (SELECT available_colors FROM public.products WHERE id='STG61-SHOE')
        IS DISTINCT FROM '["Red","Blue"]'::jsonb
     OR (SELECT total_gel FROM public.orders WHERE id='STG61-VARIANTS-001') IS DISTINCT FROM 530
     OR (SELECT status FROM public.orders WHERE id='STG61-VARIANTS-001') IS DISTINCT FROM 'გაუქმებული'
     OR (SELECT (v.value->>'stock')::integer
         FROM public.products p,jsonb_array_elements(p.variants) v(value)
          WHERE p.id='STG61-SHOE' AND v.value->>'id'='red-s')<>4
  THEN RAISE EXCEPTION 'Stage69 transaction rollback did not restore original schema/history/stock'; END IF;
END $restored$;
\echo 'PASS Stage69 PG17: obsolete variant trigger blocks historic valid order after catalog changes; modern operation succeeds; full rollback verified'
