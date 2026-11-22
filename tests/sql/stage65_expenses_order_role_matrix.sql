-- Stage65: genuine staff-expenses migration + Stage57 projected order access
-- on the SAME disposable PostgreSQL17 fixture as Stage52–62.
-- NEVER execute against Supabase Production or any real customer database.
\set ON_ERROR_STOP on
\echo 'Stage65: create disposable expense fixtures and distinct expense-only role'
BEGIN;
CREATE TABLE public.expenses (
  id text PRIMARY KEY,
  category text NOT NULL,
  amount numeric NOT NULL,
  date text,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.expenses TO authenticated;
REVOKE ALL ON public.expenses FROM PUBLIC,anon;
-- Simulate exactly the legacy policy removed by the actual source migration.
CREATE POLICY "Admin can manage expenses" ON public.expenses
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
INSERT INTO public.expenses(id,category,amount,date,description) VALUES
 ('STG65-EXP-1','operations',120,'2026-11-22','synthetic fixture only');
INSERT INTO auth.users(id,email_confirmed_at)
 VALUES ('56000000-0000-4000-8000-000000000007',now());
INSERT INTO public.admin_staff_members(user_id,email,display_name,role,permissions,is_active)
 VALUES ('56000000-0000-4000-8000-000000000007',
         'expenses-only@stage65.test','Expenses Only','finance',
         '{"orders":false,"expenses":true,"products":false}'::jsonb,true);
COMMIT;

-- Use the actual migration from the repository, not a copied approximation.
\ir ../../supabase/migrations/20261117143000_staff_expenses_permission.sql

\echo 'Stage65: ensure only server permission policy survives and grants stay scoped'
DO $check$
DECLARE
  policies integer;
BEGIN
  SELECT count(*) INTO policies FROM pg_policies
   WHERE schemaname='public' AND tablename='expenses'
     AND policyname='Staff with expenses permission can manage expenses'
     AND cmd='ALL'
     AND 'authenticated'=ANY(roles)
     AND qual ~ 'has_staff_permission'
     AND with_check ~ 'has_staff_permission';
  IF policies <> 1 OR EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='expenses'
      AND policyname='Admin can manage expenses'
  ) THEN RAISE EXCEPTION 'Stage65 expenses RLS migration did not replace legacy policy'; END IF;

  IF has_table_privilege('anon','public.expenses','SELECT')
     OR has_table_privilege('anon','public.expenses','INSERT')
     OR has_table_privilege('authenticated','public.admin_staff_members','SELECT')
     OR has_table_privilege('authenticated','public.admin_staff_members','UPDATE')
     OR has_column_privilege('authenticated','public.orders','items','SELECT')
     OR has_column_privilege('authenticated','public.orders','checkout_result','SELECT')
     OR has_column_privilege('authenticated','public.orders','checkout_request','SELECT')
  THEN RAISE EXCEPTION 'Stage65 staff/expense/order snapshot permissions regressed'; END IF;
END
$check$;

SET ROLE authenticated;
SET request.jwt.claim.jwt='{}';

\echo 'Stage65: order-only staff may read orders, never private expenses'
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000006';
DO $test$
DECLARE count_expenses integer; count_orders integer; changed integer;
BEGIN
  IF NOT public.has_staff_permission('orders') OR public.has_staff_permission('expenses')
  THEN RAISE EXCEPTION 'Stage65 order-only permission matrix is wrong'; END IF;
  SELECT count(*) INTO count_expenses FROM public.expenses;
  IF count_expenses <> 0 THEN RAISE EXCEPTION 'Stage65 orders-only staff read expenses'; END IF;
  UPDATE public.expenses SET amount=999 WHERE id='STG65-EXP-1';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN RAISE EXCEPTION 'Stage65 orders-only staff modified expenses'; END IF;
  SELECT count(*) INTO count_orders FROM public.orders;
  IF count_orders < 1 THEN RAISE EXCEPTION 'Stage65 orders-only staff lost operational order visibility'; END IF;
  IF jsonb_array_length(public.admin_order_ledger_page(0,100)) < 1
  THEN RAISE EXCEPTION 'Stage65 orders-only ledger unavailable'; END IF;
END $test$;

\echo 'Stage65: expenses-only staff may see expenses but cannot read orders'
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000007';
DO $test$
DECLARE count_expenses integer; count_orders integer; blocked boolean := false;
BEGIN
  IF public.has_staff_permission('orders') OR NOT public.has_staff_permission('expenses')
  THEN RAISE EXCEPTION 'Stage65 expense-only permission matrix is wrong'; END IF;
  SELECT count(*) INTO count_expenses FROM public.expenses;
  IF count_expenses <> 1 THEN RAISE EXCEPTION 'Stage65 expense-only staff lost allowed expenses'; END IF;
  SELECT count(*) INTO count_orders FROM public.orders;
  IF count_orders <> 0 THEN RAISE EXCEPTION 'Stage65 expenses-only staff read order records'; END IF;
  BEGIN
    PERFORM public.admin_order_ledger_page(0,100);
    RAISE EXCEPTION 'Stage65 expenses-only staff used order ledger';
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Stage65 ledger deny did not run'; END IF;
  BEGIN
    PERFORM public.admin_order_image_refs_page(0,100);
    RAISE EXCEPTION 'Stage65 expenses-only staff used product image references';
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
END $test$;

\echo 'Stage65: verified finance+orders staff retains expense and cost access'
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000005';
DO $test$
DECLARE count_expenses integer; page jsonb;
BEGIN
  IF NOT public.has_staff_permission('orders') OR NOT public.has_staff_permission('expenses')
  THEN RAISE EXCEPTION 'Stage65 finance/order staff lost privileges'; END IF;
  SELECT count(*) INTO count_expenses FROM public.expenses;
  IF count_expenses <> 1 THEN RAISE EXCEPTION 'Stage65 finance staff cannot read expenses'; END IF;
  page := public.admin_order_ledger_page(0,100);
  IF jsonb_array_length(page) < 1 OR NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(page) AS orders(value)
    WHERE jsonb_typeof(orders.value->'items') = 'array'
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(orders.value->'items') AS items(value)
                  WHERE items.value ? 'purchase_cost')
  ) THEN RAISE EXCEPTION 'Stage65 authorized finance order snapshot missing'; END IF;
  IF has_column_privilege('authenticated','public.orders','items','SELECT')
  THEN RAISE EXCEPTION 'Stage65 finance staff raw order grant returned'; END IF;
END $test$;

\echo 'Stage65: product-only, unconfirmed, inactive, and spoofed owner are denied'
DO $test$
DECLARE candidate text; visible_count integer;
BEGIN
  FOREACH candidate IN ARRAY ARRAY[
    '56000000-0000-4000-8000-000000000003',
    '56000000-0000-4000-8000-000000000002',
    '56000000-0000-4000-8000-000000000004',
    '56000000-0000-4000-8000-000000000001'
  ] LOOP
    PERFORM set_config('request.jwt.claim.sub',candidate,false);
    PERFORM set_config('request.jwt.claim.jwt',
      CASE WHEN candidate='56000000-0000-4000-8000-000000000001'
           THEN '{"app_metadata":{"role":"admin"},"user_metadata":{"role":"admin"}}'
           ELSE '{"user_metadata":{"role":"admin"}}' END,false);
    IF public.has_staff_permission('expenses') THEN
      RAISE EXCEPTION 'Stage65 forbidden expense permission for %',candidate;
    END IF;
    SELECT count(*) INTO visible_count FROM public.expenses;
    IF visible_count <> 0 THEN
      RAISE EXCEPTION 'Stage65 forbidden expenses visible for %',candidate; END IF;
  END LOOP;
END $test$;

\echo 'Stage65: exact owner ID AND app_metadata admin retain access'
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$
DECLARE total integer;
BEGIN
 IF NOT public.has_staff_permission('orders') OR NOT public.has_staff_permission('expenses')
 THEN RAISE EXCEPTION 'Stage65 primary owner lost permissions'; END IF;
 SELECT count(*) INTO total FROM public.expenses;
 IF total <> 1 THEN RAISE EXCEPTION 'Stage65 primary owner expense read denied'; END IF;
END $test$;

RESET ROLE;
RESET request.jwt.claim.sub;
RESET request.jwt.claim.jwt;

\echo 'Stage65: verify disposable fixture was not altered by unauthorized paths'
DO $check$
BEGIN
 IF (SELECT amount FROM public.expenses WHERE id='STG65-EXP-1') <> 120
 THEN RAISE EXCEPTION 'Stage65 unauthorized expense write altered fixture'; END IF;
END $check$;
\echo 'PASS Stage65 disposable PostgreSQL17: owner/staff permission matrix, expenses RLS, orders-only redaction, spoof denial and unchanged fixture'
