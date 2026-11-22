-- Stage68: current staff-expenses product-list authorization vs stale owner-only
-- migration, using only the EXISTING disposable PostgreSQL17 CI fixture.
-- Source legacy SQL is executed literally; its effect is reversed by ROLLBACK.
-- Never run this against a production/staging Supabase project.
\set ON_ERROR_STOP on
\echo 'Stage68: verify authenticated staff and unchanged product fixture'
DO $initial$
BEGIN
  IF to_regprocedure('private.admin_list_products()') IS NOT NULL
     OR (SELECT count(*) FROM public.products) < 1
     OR NOT EXISTS (SELECT 1 FROM public.admin_staff_members
                     WHERE user_id='56000000-0000-4000-8000-000000000005'
                       AND is_active)
  THEN RAISE EXCEPTION 'Stage68 original disposable fixture is not clean'; END IF;
END $initial$;

BEGIN;
  -- Earlier test fixture includes true stock, variant and cost columns, but
  -- omitted the timestamp because prior suites did not need admin sorting.
  ALTER TABLE public.products ADD COLUMN created_at timestamptz DEFAULT now();

  \echo 'Stage68: install genuine historical owner-only function in scratch transaction'
  \ir ../../supabase/migrations/20261107172000_stabilize_admin_product_order.sql
  REVOKE ALL ON FUNCTION private.admin_list_products()
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION private.admin_list_products() TO authenticated;

  \echo 'Stage68: apply exact staff-expenses authorization transformation from newer migration'
  DO $modern_guard$
  DECLARE
    v_definition text;
    v_previous text;
    v_guard_v_jwt text := E'IF COALESCE(v_jwt -> ''app_metadata'' ->> ''role'', '''') <> ''admin''\n     OR auth.uid() IS DISTINCT FROM ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid THEN';
  BEGIN
    SELECT pg_get_functiondef('private.admin_list_products()'::regprocedure)
      INTO v_definition;
    v_previous := v_definition;
    v_definition := replace(v_definition, v_guard_v_jwt,
      'IF NOT public.has_staff_permission(''expenses'') THEN');
    IF v_definition = v_previous THEN
      RAISE EXCEPTION 'Stage68 original Stage103B finance guard anchor changed';
    END IF;
    EXECUTE rtrim(v_definition, E'; \t\n\r');
  END $modern_guard$;

  \echo 'Stage68: finance-authorized staff gets private cost catalogue; products-only is denied'
  SET ROLE authenticated;
  SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000005';
  SET request.jwt.claim.jwt='{}';
  DO $finance$
  DECLARE n integer;
  BEGIN
    IF NOT public.has_staff_permission('expenses')
       OR public.has_staff_permission('products')
    THEN RAISE EXCEPTION 'Stage68 finance test principal has invalid permissions'; END IF;
    SELECT count(*) INTO n FROM private.admin_list_products();
    IF n < 1 THEN RAISE EXCEPTION 'Stage68 current finance-gated admin listing unexpectedly empty'; END IF;
    IF NOT EXISTS (SELECT 1 FROM private.admin_list_products()
                   WHERE id='STG61-SHOE' AND purchase_cost=52)
    THEN RAISE EXCEPTION 'Stage68 finance-authorized cost snapshot unavailable'; END IF;
  END $finance$;

  SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000003';
  DO $products_denied$
  DECLARE
    denied boolean:=false;
  BEGIN
    BEGIN
      PERFORM 1 FROM private.admin_list_products();
    EXCEPTION WHEN insufficient_privilege THEN denied:=true;
    END;
    IF NOT denied THEN
      RAISE EXCEPTION 'Stage68 products-only staff read finance-bearing catalog'; END IF;
  END $products_denied$;
  RESET ROLE;
  RESET request.jwt.claim.sub;
  RESET request.jwt.claim.jwt;

  SAVEPOINT stage68_before_replay;
  \echo 'Stage68: replay unchanged obsolete SQL as it would run in a blind db push'
  \ir ../../supabase/migrations/20261107172000_stabilize_admin_product_order.sql

  SET ROLE authenticated;
  SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000005';
  SET request.jwt.claim.jwt='{}';
  DO $regression$
  DECLARE
    denied boolean:=false;
    sqlstate text;
  BEGIN
    IF NOT public.has_staff_permission('expenses') THEN
      RAISE EXCEPTION 'Stage68 staff expense permission was lost independently of migration'; END IF;
    BEGIN
      PERFORM 1 FROM private.admin_list_products();
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS sqlstate=RETURNED_SQLSTATE;
      IF sqlstate <> '42501' THEN
        RAISE EXCEPTION 'Stage68 stale listing failed for an unrelated reason: %',sqlstate;
      END IF;
      denied := true;
    END;
    IF NOT denied THEN
      RAISE EXCEPTION 'Stage68 old migration did not revoke legitimate finance staff listing';
    END IF;
  END $regression$;

  \echo 'Stage68: old migration still accepts the exact verified primary owner'
  SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
  SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
  DO $owner$
  DECLARE n integer;
  BEGIN
    SELECT count(*) INTO n FROM private.admin_list_products();
    IF n<1 THEN RAISE EXCEPTION 'Stage68 old function did not keep owner-only access'; END IF;
  END $owner$;

  RESET ROLE;
  RESET request.jwt.claim.sub;
  RESET request.jwt.claim.jwt;

  \echo 'Stage68: restore newer function and assert finance access recovered'
  ROLLBACK TO SAVEPOINT stage68_before_replay;
  SET ROLE authenticated;
  SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000005';
  SET request.jwt.claim.jwt='{}';
  DO $restored$
  DECLARE n integer;
  BEGIN
    SELECT count(*) INTO n FROM private.admin_list_products();
    IF n<1 THEN RAISE EXCEPTION 'Stage68 savepoint did not restore expenses authorization'; END IF;
  END $restored$;
  RESET ROLE;
  RESET request.jwt.claim.sub;
  RESET request.jwt.claim.jwt;

ROLLBACK;

\echo 'Stage68: confirm scratch SQL and timestamp field were fully removed'
DO $after$
BEGIN
  IF to_regprocedure('private.admin_list_products()') IS NOT NULL
     OR EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='products'
          AND column_name='created_at'
     )
     OR (SELECT stock FROM public.products WHERE id='STG61-SHOE')<>0
     OR (SELECT (v.value->>'stock')::integer
          FROM public.products p, jsonb_array_elements(p.variants) v(value)
          WHERE p.id='STG61-SHOE' AND v.value->>'id'='red-s')<>4
  THEN RAISE EXCEPTION 'Stage68 rollback changed original product schema or stock'; END IF;
END $after$;
\echo 'PASS Stage68 PG17: exact old SQL revokes legitimate expenses staff product access; owner remains allowed; full rollback preserved stock/schema'
