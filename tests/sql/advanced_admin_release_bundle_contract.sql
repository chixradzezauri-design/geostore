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
CREATE TABLE public.orders(id text PRIMARY KEY,user_id uuid,status text,created_at timestamptz,customer_name text NOT NULL,phone text NOT NULL,address text NOT NULL,total_gel numeric NOT NULL,items jsonb DEFAULT '[]');
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('1060de3d-d28a-45f8-9a64-5e0368cffc4b','owner@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000001','customer@example.invalid',now());
-- Read-only catalog capture of the two existing product triggers; fixture only.
CREATE OR REPLACE FUNCTION private.preserve_product_variant_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_variant jsonb;
  v_existing jsonb;
  v_removed jsonb;
  v_result jsonb := '[]'::jsonb;
BEGIN
  IF coalesce(current_setting('geostore.variant_stock_adjustment', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF jsonb_typeof(coalesce(NEW.variants, '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტების მონაცემები არასწორია.';
  END IF;
  FOR v_removed IN
    SELECT old_variant FROM jsonb_array_elements(coalesce(OLD.variants, '[]'::jsonb)) old_variant
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(coalesce(NEW.variants, '[]'::jsonb)) new_variant
      WHERE new_variant->>'id' = old_variant->>'id'
    )
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.orders o
      CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) item
      WHERE item->>'id' = OLD.id AND item->>'customVariantId' = v_removed->>'id'
    ) THEN
      RAISE EXCEPTION 'ვარიანტი შეკვეთების ისტორიაში გამოიყენება და მისი წაშლა დაუშვებელია.';
    END IF;
  END LOOP;
  FOR v_variant IN SELECT value FROM jsonb_array_elements(coalesce(NEW.variants, '[]'::jsonb))
  LOOP
    IF jsonb_typeof(v_variant) IS DISTINCT FROM 'object'
       OR coalesce(trim(v_variant->>'id'), '') = ''
       OR coalesce(trim(v_variant->>'name'), '') = ''
       OR coalesce(v_variant->>'priceGEL', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
       OR coalesce(v_variant->>'stock', '') !~ '^[0-9]{1,7}$' THEN
      RAISE EXCEPTION 'პროდუქტის ვარიანტის სახელი, ფასი ან მარაგი არასწორია.';
    END IF;
    SELECT value INTO v_existing
      FROM jsonb_array_elements(coalesce(OLD.variants, '[]'::jsonb))
     WHERE value->>'id' = v_variant->>'id'
     LIMIT 1;
    IF v_existing IS NOT NULL THEN
      IF coalesce(v_existing->>'stock', '') !~ '^[0-9]{1,7}$' THEN
        RAISE EXCEPTION 'არსებული ვარიანტის მარაგის ჩანაწერი არასწორია.';
      END IF;
      v_variant := jsonb_set(v_variant, '{stock}', to_jsonb((v_existing->>'stock')::integer), true);
    ELSE
      IF EXISTS (
        SELECT 1 FROM public.orders o
        CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) item
        WHERE item->>'id' = NEW.id AND item->>'customVariantId' = v_variant->>'id'
      ) THEN
        RAISE EXCEPTION 'ამ ვარიანტის ID შეკვეთების ისტორიაში უკვე გამოიყენება.';
      END IF;
    END IF;
    v_result := v_result || jsonb_build_array(v_variant);
    v_existing := NULL;
  END LOOP;
  NEW.variants := v_result;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER preserve_product_variant_stock BEFORE UPDATE OF variants ON public.products FOR EACH ROW EXECUTE FUNCTION private.preserve_product_variant_stock();

CREATE OR REPLACE FUNCTION private.sync_size_color_aggregate_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF jsonb_typeof(coalesce(NEW.variants, '[]'::jsonb)) = 'array'
     AND jsonb_array_length(coalesce(NEW.variants, '[]'::jsonb)) > 0 THEN
    SELECT coalesce(sum((variant.item->>'stock')::integer), 0)::integer
      INTO NEW.stock
      FROM jsonb_array_elements(coalesce(NEW.variants, '[]'::jsonb)) AS variant(item);
  END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER zz_sync_size_color_aggregate_stock BEFORE INSERT OR UPDATE OF variants, stock ON public.products FOR EACH ROW EXECUTE FUNCTION private.sync_size_color_aggregate_stock();
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
