-- Stage77: no-cost PG17 checkout/admin transition contract.
-- Runs only INSIDE Stage57's disposable synthetic database, AFTER the
-- additive projected RPC migration but BEFORE raw-column grant revocation.
-- These request.jwt.claim.* settings are fake JWT CLAIMS, not signed
-- PostgREST/Auth tokens. Production MUST never execute this fixture.
\set ON_ERROR_STOP on
\echo 'Stage77: Phase A legacy/full order reads + new RPC, using real PostgreSQL anon/authenticated roles'

-- Guests must not see orders or execute staff-only projected APIs.
SET ROLE anon;
DO $stage77_anon$
DECLARE denied boolean := false;
BEGIN
 BEGIN
   PERFORM id FROM public.orders LIMIT 1;
   RAISE EXCEPTION 'Stage77 guest read full orders through old API';
 EXCEPTION WHEN insufficient_privilege THEN denied := true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Stage77 guest raw order SELECT not denied'; END IF;
 denied := false;
 BEGIN
   PERFORM public.admin_order_ledger_page(0,10);
   RAISE EXCEPTION 'Stage77 guest invoked protected order projection API';
 EXCEPTION WHEN insufficient_privilege THEN denied := true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Stage77 guest projected API not denied'; END IF;
END $stage77_anon$;
RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claim.jwt='{}';

-- Client role alone is NOT sufficient: RLS still enforces server permission.
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000001';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"},"user_metadata":{"role":"admin"}}';
DO $stage77_nonstaff$
DECLARE visible integer; denied boolean := false;
BEGIN
 SELECT count(*) INTO visible FROM public.orders;
 IF visible<>0 THEN RAISE EXCEPTION 'Stage77 forged admin JWT saw legacy order rows'; END IF;
 BEGIN
   PERFORM public.admin_order_ledger_page(0,10);
   RAISE EXCEPTION 'Stage77 fake admin accessed order ledger';
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Stage77 missing explicit staff authorization'; END IF;
END $stage77_nonstaff$;

-- Products-only operator may read narrow image references, but NO order rows.
SET request.jwt.claim.jwt='{}';
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000003';
DO $stage77_products$
DECLARE visible integer; image_refs jsonb; denied boolean := false;
BEGIN
 SELECT count(*) INTO visible FROM public.orders;
 IF visible<>0 THEN RAISE EXCEPTION 'Stage77 products-only can read raw customer orders'; END IF;
 image_refs:=public.admin_order_image_refs_page(0,100);
 IF jsonb_typeof(image_refs)<>'array' OR jsonb_array_length(image_refs)<1
 THEN RAISE EXCEPTION 'Stage77 products-only lost approved image reference scan'; END IF;
 BEGIN
   PERFORM public.admin_order_ledger_page(0,100);
   RAISE EXCEPTION 'Stage77 products-only used restricted order ledger';
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Stage77 products-only order RPC exposure'; END IF;
END $stage77_products$;

-- PHASE A: the main Production frontend still requests SELECT * / items.
-- Verify the actual PostgreSQL role and RLS can serve those requests.
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000006';
DO $stage77_old_and_new$
DECLARE legacy jsonb; projected jsonb; rowA jsonb; visible integer;
BEGIN
 SELECT count(*) INTO visible FROM public.orders;
 IF visible<>3 THEN RAISE EXCEPTION 'Stage77 old admin order list failed after additive API'; END IF;
 SELECT to_jsonb(o) INTO legacy FROM public.orders AS o
 WHERE o.id='STG54-ORDER-A';
 IF legacy IS NULL OR legacy->'items'->0->>'purchase_cost'<>'40'
    OR legacy->'checkout_result'->>'internal_vendor'<>'secret'
    OR legacy->'checkout_request'->>'private_note'<>'should-not-leak'
 THEN RAISE EXCEPTION 'Stage77 legacy admin SELECT * / item snapshots no longer work in Phase A'; END IF;
 projected:=public.admin_order_ledger_page(0,100);
 IF jsonb_typeof(projected)<>'array' OR jsonb_array_length(projected)<>3
 THEN RAISE EXCEPTION 'Stage77 new projected admin order page failed during Phase A'; END IF;
 SELECT record.value INTO rowA
 FROM jsonb_array_elements(projected) record(value)
 WHERE record.value->>'id'='STG54-ORDER-A';
 IF rowA IS NULL OR rowA->>'phone'<>'599123456'
    OR rowA->'items'->0 ? 'purchase_cost'
    OR rowA->'items'->0 ? 'vendor'
    OR rowA->'checkout_result' ? 'items'
    OR rowA->'checkout_result' ? 'internal_vendor'
    OR rowA->'checkout_request' ? 'private_note'
 THEN RAISE EXCEPTION 'Stage77 projected orders-only RPC finance privacy regression'; END IF;
END $stage77_old_and_new$;

-- An authorized finance+orders operator must retain scoped cost view.
SET request.jwt.claim.sub='56000000-0000-4000-8000-000000000005';
DO $stage77_finance$
DECLARE projected jsonb; item jsonb;
BEGIN
 projected:=public.admin_order_ledger_page(0,100);
 SELECT record.value->'items'->0 INTO item
 FROM jsonb_array_elements(projected) record(value)
 WHERE record.value->>'id'='STG54-ORDER-A';
 IF item->>'purchase_cost'<>'40' OR item->>'vendor'<>'internal-vendor'
 THEN RAISE EXCEPTION 'Stage77 finance staff cost access lost during Phase A'; END IF;
END $stage77_finance$;

RESET ROLE;
RESET request.jwt.claim.sub;
RESET request.jwt.claim.jwt;
\echo 'PASS Stage77: real PostgreSQL anon/authenticated RLS/GRANT + legacy/additive transition scenarios; JWT is synthetic, not signed HTTP'
