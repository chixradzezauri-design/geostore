-- Stage56: execute the real staff foundation migration against synthetic
-- Auth users in the SAME disposable PostgreSQL 17 instance as Stage52/54.
\set ON_ERROR_STOP on
\echo 'Stage56: prepare fake Supabase identities and JWT reader'
BEGIN;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email_confirmed_at timestamptz);
REVOKE ALL ON TABLE auth.users FROM PUBLIC, anon, authenticated;
CREATE FUNCTION auth.jwt() RETURNS jsonb
  LANGUAGE sql STABLE SET search_path TO ''
  AS $jwt$ SELECT coalesce(nullif(current_setting('request.jwt.claim.jwt',true),''),'{}')::jsonb; $jwt$;
INSERT INTO auth.users(id,email_confirmed_at) VALUES
 ('56000000-0000-4000-8000-000000000001',now()),
 ('56000000-0000-4000-8000-000000000002',NULL),
 ('56000000-0000-4000-8000-000000000003',now()),
 ('56000000-0000-4000-8000-000000000004',now()),
 ('56000000-0000-4000-8000-000000000005',now());
COMMIT;

-- Test the source migration, not a reimplemented permission function.
\ir ../../supabase/migrations/20261117100000_admin_staff_auth_foundation.sql

INSERT INTO public.admin_staff_members (
 user_id,email,display_name,role,permissions,is_active
) VALUES
 ('56000000-0000-4000-8000-000000000002','unverified@stage56.test',
  'Unverified Operator','operator','{"orders":true,"expenses":true}'::jsonb,true),
 ('56000000-0000-4000-8000-000000000003','products@stage56.test',
  'Products Manager','product_manager','{"products":true,"orders":false,"expenses":false,"admin":true}'::jsonb,true),
 ('56000000-0000-4000-8000-000000000004','inactive@stage56.test',
  'Inactive Manager','manager','{"orders":true,"expenses":true}'::jsonb,false),
 ('56000000-0000-4000-8000-000000000005','finance@stage56.test',
  'Finance Manager','finance','{"orders":true,"expenses":true,"products":false}'::jsonb,true);

\echo 'Stage56: check RLS grants and prevent direct staff account enumeration'
DO $check$
BEGIN
  IF has_table_privilege('anon','public.admin_staff_members','SELECT')
    OR has_table_privilege('authenticated','public.admin_staff_members','SELECT')
    OR has_table_privilege('authenticated','public.admin_staff_members','UPDATE')
    OR has_table_privilege('anon','public.admin_staff_members','INSERT')
    OR NOT has_table_privilege('service_role','public.admin_staff_members','SELECT')
  THEN RAISE EXCEPTION 'Stage56 unsafe staff membership grants'; END IF;
  IF has_function_privilege('anon','public.has_staff_permission(text)','EXECUTE')
    OR has_function_privilege('anon','public.get_my_admin_access()','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.has_staff_permission(text)','EXECUTE')
  THEN RAISE EXCEPTION 'Stage56 unsafe public permission RPC grants'; END IF;
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity
    FROM pg_class WHERE oid='public.admin_staff_members'::regclass)
  THEN RAISE EXCEPTION 'Stage56 membership force RLS disabled'; END IF;
END $check$;

\echo 'Stage56: simulate signed JWTs, permission separation, revocation, spoofing'
SET ROLE authenticated;
DO $test$
DECLARE v_access jsonb;
BEGIN
  -- A JWT with "admin" metadata is not enough without the exact owner UUID.
  PERFORM set_config('request.jwt.claim.sub','',false);
  PERFORM set_config('request.jwt.claim.jwt','{"app_metadata":{"role":"admin"}}',false);
  IF public.has_staff_permission('orders') THEN
    RAISE EXCEPTION 'Stage56 no-session privilege escalation'; END IF;
  v_access := public.get_my_admin_access();
  IF v_access->>'is_admin' <> 'false' THEN
    RAISE EXCEPTION 'Stage56 empty session granted admin'; END IF;

  PERFORM set_config('request.jwt.claim.sub','56000000-0000-4000-8000-000000000001',false);
  IF public.has_staff_permission('expenses') OR public.has_staff_permission('orders') THEN
    RAISE EXCEPTION 'Stage56 forged owner metadata authorized'; END IF;
  v_access := public.get_my_admin_access();
  IF v_access->>'is_admin' <> 'false' THEN
    RAISE EXCEPTION 'Stage56 non-owner JWT admin spoof authorized'; END IF;

  PERFORM set_config('request.jwt.claim.jwt','{}',false);
  PERFORM set_config('request.jwt.claim.sub','56000000-0000-4000-8000-000000000002',false);
  IF public.has_staff_permission('expenses') OR public.has_staff_permission('orders') THEN
    RAISE EXCEPTION 'Stage56 unconfirmed email staff authorized'; END IF;
  v_access := public.get_my_admin_access();
  IF v_access->>'is_staff' <> 'false' THEN
    RAISE EXCEPTION 'Stage56 unconfirmed staff gained access'; END IF;

  PERFORM set_config('request.jwt.claim.sub','56000000-0000-4000-8000-000000000003',false);
  IF NOT public.has_staff_permission('products')
    OR public.has_staff_permission('orders')
    OR public.has_staff_permission('expenses')
    OR public.has_staff_permission('admin')
    OR public.has_staff_permission(NULL)
  THEN RAISE EXCEPTION 'Stage56 products-only permission isolation failed'; END IF;
  v_access := public.get_my_admin_access();
  IF v_access->>'is_staff' <> 'true'
    OR v_access->>'is_admin' <> 'false'
    OR v_access->>'role' <> 'product_manager'
  THEN RAISE EXCEPTION 'Stage56 staff access role response invalid'; END IF;

  PERFORM set_config('request.jwt.claim.sub','56000000-0000-4000-8000-000000000004',false);
  IF public.has_staff_permission('orders') OR public.has_staff_permission('expenses') THEN
    RAISE EXCEPTION 'Stage56 inactive staff permissions not revoked'; END IF;

  PERFORM set_config('request.jwt.claim.sub','56000000-0000-4000-8000-000000000005',false);
  IF NOT public.has_staff_permission('orders')
    OR NOT public.has_staff_permission('expenses')
    OR public.has_staff_permission('products')
  THEN RAISE EXCEPTION 'Stage56 finance-only permission isolation failed'; END IF;

  PERFORM set_config('request.jwt.claim.sub','1060de3d-d28a-45f8-9a64-5e0368cffc4b',false);
  IF public.has_staff_permission('orders') THEN
    RAISE EXCEPTION 'Stage56 owner without verified role authorized'; END IF;
  PERFORM set_config('request.jwt.claim.jwt','{"app_metadata":{"role":"admin"}}',false);
  IF NOT public.has_staff_permission('orders')
    OR NOT public.has_staff_permission('expenses')
    OR NOT public.has_staff_permission('products')
  THEN RAISE EXCEPTION 'Stage56 genuine owner identity failed'; END IF;
  v_access := public.get_my_admin_access();
  IF v_access->>'is_admin' <> 'true' OR v_access->>'is_staff' <> 'false' THEN
    RAISE EXCEPTION 'Stage56 owner response incorrect'; END IF;
END $test$;
RESET ROLE;
RESET request.jwt.claim.sub;
RESET request.jwt.claim.jwt;
\echo 'PASS Stage56 disposable PG17: exact owner+JWT, role spoofing denied, products/finance split, inactive/unverified denial, staff table locked'
