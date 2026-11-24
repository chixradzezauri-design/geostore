-- Disposable PostgreSQL 17: verify the exact ordered, atomic bundle.
\set ON_ERROR_STOP on
CREATE SCHEMA private;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA private,auth,public TO authenticated,anon;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.jwt',true),''),'{}')::jsonb; $$;
CREATE TABLE public.products(id text PRIMARY KEY,name text NOT NULL,price_gel numeric NOT NULL,category text,vendor text,stock integer CHECK(stock BETWEEN 0 AND 1000000),variants jsonb DEFAULT '[]',purchase_cost numeric);
REVOKE ALL ON public.products FROM PUBLIC,anon,authenticated;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,created_at timestamptz DEFAULT now(),banned_until timestamptz,raw_app_meta_data jsonb DEFAULT '{}',is_anonymous boolean DEFAULT false,deleted_at timestamptz);
REVOKE ALL ON auth.users FROM PUBLIC,anon,authenticated;
CREATE TABLE private.admin_customer_crm_profiles(user_id uuid PRIMARY KEY,is_vip boolean,is_blocked boolean);
CREATE TABLE public.admin_staff_members(user_id uuid PRIMARY KEY,email text NOT NULL,display_name text NOT NULL,role text NOT NULL);
CREATE TABLE public.orders(id text PRIMARY KEY,user_id uuid,status text,created_at timestamptz,customer_name text NOT NULL,phone text NOT NULL,address text NOT NULL,total_gel numeric NOT NULL);
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('1060de3d-d28a-45f8-9a64-5e0368cffc4b','owner@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000001','customer@example.invalid',now());
\i /tmp/stage60_original_inventory_trigger_prefix.sql
\i /tmp/geostore-advanced-admin-candidate.sql
DO $test$
DECLARE relation text;
BEGIN
 FOREACH relation IN ARRAY ARRAY['public.admin_suppliers','public.admin_purchase_orders','public.admin_purchase_lines','public.admin_purchase_receipts','public.admin_purchase_payments','public.admin_purchase_payment_corrections','private.marketing_email_consent_events','private.marketing_campaigns','private.marketing_campaign_revisions','private.marketing_template_versions','private.marketing_campaign_preflights'] LOOP
  IF to_regclass(relation) IS NULL OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass(relation)) THEN RAISE EXCEPTION 'Missing RLS relation %',relation; END IF;
  IF has_table_privilege('anon',relation,'SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Anonymous table privilege %',relation; END IF;
 END LOOP;
END $test$;
SET ROLE authenticated;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
SET request.jwt.claim.jwt='{}';
DO $test$ BEGIN
 IF public.my_marketing_email_consent()->>'status'<>'not_set' THEN RAISE EXCEPTION 'Unexpected consent'; END IF;
 IF public.set_my_marketing_email_consent(gen_random_uuid(),true,'email-marketing-v1',NULL)->>'status'<>'opted_in' THEN RAISE EXCEPTION 'Consent integration failed'; END IF;
 BEGIN PERFORM public.admin_marketing_segments(); RAISE EXCEPTION 'Customer crossed owner boundary'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$
DECLARE c uuid:=gen_random_uuid(); r jsonb;
BEGIN
 IF public.admin_read_supplier_balance(NULL)->>'purchase_count'<>'0' THEN RAISE EXCEPTION 'Supplier balance mismatch'; END IF;
 IF public.admin_marketing_segments()->'segments'->'all'->>'consent_candidates'<>'1' THEN RAISE EXCEPTION 'Consent/segment integration failed'; END IF;
 PERFORM public.admin_save_marketing_campaign(c,gen_random_uuid(),0,'create','Fixture','all','Offer','Text',NULL);
 r:=public.admin_check_marketing_campaign(c,1,gen_random_uuid());
 IF r->>'delivery_enabled'<>'false' OR r->>'is_send_authorization'<>'false' OR r->>'consent_candidates'<>'1' THEN RAISE EXCEPTION 'Unsafe integrated campaign preflight'; END IF;
 PERFORM public.admin_save_marketing_template(gen_random_uuid(),gen_random_uuid(),0,'create','{"name":"Fixture","category":"promotion","segment":"all","subject":"Offer","body":"Text"}');
 IF public.admin_read_marketing_templates(NULL)->>'total'<>'1' THEN RAISE EXCEPTION 'Template integration failed'; END IF;
END $test$;
RESET ROLE;
\echo 'PASS exact eight-source atomic candidate in one disposable PostgreSQL database'
