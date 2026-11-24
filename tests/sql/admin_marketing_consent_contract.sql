-- Run only in a NEW disposable database.
\set ON_ERROR_STOP on
CREATE SCHEMA private;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA private,auth,public TO authenticated,anon;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.jwt',true),''),'{}')::jsonb; $$;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
REVOKE ALL ON auth.users FROM PUBLIC,anon,authenticated;
INSERT INTO auth.users VALUES
 ('1060de3d-d28a-45f8-9a64-5e0368cffc4b','owner@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000001','one@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000002','two@example.invalid',NULL);
\ir ../../release/staged-marketing-consent.sql
SET ROLE authenticated;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
SET request.jwt.claim.jwt='{}';
DO $test$
DECLARE e uuid:='20000000-0000-4000-8000-000000000001'; w uuid:='20000000-0000-4000-8000-000000000002'; r jsonb;
BEGIN
 IF public.my_marketing_email_consent()->>'status'<>'not_set' THEN RAISE EXCEPTION 'Default consent not safe'; END IF;
 r:=public.set_my_marketing_email_consent(e,true,'email-marketing-v1',NULL);
 IF r->>'status'<>'opted_in' OR r->>'acknowledged_event_id'<>e::text THEN RAISE EXCEPTION 'Opt-in missing: %',r; END IF;
 r:=public.set_my_marketing_email_consent(w,false,'email-marketing-v1',NULL);
 IF r->>'status'<>'withdrawn' THEN RAISE EXCEPTION 'Withdrawal missing'; END IF;
 r:=public.set_my_marketing_email_consent(e,true,'email-marketing-v1',NULL);
 IF r->>'status'<>'withdrawn' OR r->>'idempotent_replay'<>'true' THEN RAISE EXCEPTION 'Old retry re-enabled consent'; END IF;
 BEGIN PERFORM public.set_my_marketing_email_consent(e,false,'email-marketing-v1',NULL); RAISE EXCEPTION 'Altered replay accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.set_my_marketing_email_consent(gen_random_uuid(),true,'unknown',NULL); RAISE EXCEPTION 'Unknown version accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_marketing_consent_summary(); RAISE EXCEPTION 'Customer aggregate access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM private.marketing_email_consent_events; RAISE EXCEPTION 'Raw ledger read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.set_my_marketing_email_consent(gen_random_uuid(),true,'email-marketing-v1',NULL); RAISE EXCEPTION 'Stale initial opt-in accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM public.set_my_marketing_email_consent(gen_random_uuid(),true,'email-marketing-v1',e); RAISE EXCEPTION 'Stale opt-in after withdrawal accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 PERFORM public.set_my_marketing_email_consent(gen_random_uuid(),true,'email-marketing-v1',w);
END $test$;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000002';
DO $test$ BEGIN
 IF public.my_marketing_email_consent()->>'status'<>'not_set' THEN RAISE EXCEPTION 'Cross-user state'; END IF;
 BEGIN PERFORM public.set_my_marketing_email_consent('20000000-0000-4000-8000-000000000001',true,'email-marketing-v1',NULL); RAISE EXCEPTION 'Cross-user replay allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.set_my_marketing_email_consent(gen_random_uuid(),true,'email-marketing-v1',NULL); RAISE EXCEPTION 'Unverified opt-in allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF public.set_my_marketing_email_consent(gen_random_uuid(),false,'email-marketing-v1',NULL)->>'status'<>'withdrawn' THEN RAISE EXCEPTION 'Unverified withdrawal denied'; END IF;
END $test$;
RESET ROLE;
UPDATE auth.users SET email='changed@example.invalid' WHERE id='10000000-0000-4000-8000-000000000001';
SET ROLE authenticated;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
DO $test$ BEGIN
 IF public.my_marketing_email_consent()->>'status'<>'reconfirmation_required' THEN RAISE EXCEPTION 'Changed address remained opted in'; END IF;
END $test$;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$
DECLARE r jsonb;
BEGIN
 r:=public.admin_marketing_consent_summary();
 IF r->>'total'<>'3' OR r->>'opted_in'<>'0' OR r->>'withdrawn'<>'1' OR r->>'reconfirmation_required'<>'1' OR r->>'not_set'<>'1' THEN RAISE EXCEPTION 'Aggregate mismatch: %',r; END IF;
END $test$;
RESET ROLE;
-- A re-verified original address must not resurrect the old opt-in.
UPDATE auth.users SET email='one@example.invalid',email_confirmed_at=email_confirmed_at+interval '1 second' WHERE id='10000000-0000-4000-8000-000000000001';
SET ROLE authenticated;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
SET request.jwt.claim.jwt='{}';
DO $test$ BEGIN
 IF public.my_marketing_email_consent()->>'status'<>'reconfirmation_required' THEN RAISE EXCEPTION 'Reverified address resurrected consent'; END IF;
END $test$;
RESET ROLE;
DELETE FROM auth.users WHERE id='10000000-0000-4000-8000-000000000001';
DO $test$ BEGIN
 IF EXISTS(SELECT 1 FROM private.marketing_email_consent_events WHERE user_id='10000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Account deletion cleanup failed'; END IF;
 IF has_table_privilege('authenticated','private.marketing_email_consent_events','SELECT') OR has_function_privilege('anon','public.set_my_marketing_email_consent(uuid,boolean,text,uuid)','EXECUTE') OR has_function_privilege('anon','public.admin_marketing_consent_summary()','EXECUTE') THEN RAISE EXCEPTION 'Consent privilege leak'; END IF;
END $test$;
-- Segment fixture uses real account/CRM/staff/order column contracts, no live rows.
ALTER TABLE auth.users ADD COLUMN created_at timestamptz DEFAULT now(), ADD COLUMN banned_until timestamptz, ADD COLUMN raw_app_meta_data jsonb DEFAULT '{}', ADD COLUMN is_anonymous boolean DEFAULT false, ADD COLUMN deleted_at timestamptz;
CREATE TABLE private.admin_customer_crm_profiles(user_id uuid PRIMARY KEY,is_vip boolean,is_blocked boolean);
CREATE TABLE public.admin_staff_members(user_id uuid PRIMARY KEY);
CREATE TABLE public.orders(id text PRIMARY KEY,user_id uuid,status text,created_at timestamptz);
INSERT INTO auth.users(id,email,email_confirmed_at,created_at) VALUES
 ('10000000-0000-4000-8000-000000000003','repeat@example.invalid',now(),now()-interval '200 days'),
 ('10000000-0000-4000-8000-000000000004','new@example.invalid',now(),now()),
 ('10000000-0000-4000-8000-000000000005','blocked@example.invalid',now(),now()),
 ('10000000-0000-4000-8000-000000000006','staff@example.invalid',now(),now()),
 ('10000000-0000-4000-8000-000000000007','repeat@example.invalid',now(),now()-interval '200 days');
INSERT INTO private.admin_customer_crm_profiles VALUES
 ('10000000-0000-4000-8000-000000000003',true,false),
 ('10000000-0000-4000-8000-000000000005',true,true);
INSERT INTO public.admin_staff_members VALUES ('10000000-0000-4000-8000-000000000006');
INSERT INTO public.orders VALUES
 ('old1','10000000-0000-4000-8000-000000000003','დასრულებული',now()-interval '120 days'),
 ('old2','10000000-0000-4000-8000-000000000003','completed',now()-interval '100 days'),
 ('cancel','10000000-0000-4000-8000-000000000004','გაუქმებული',now()),
 ('new1','10000000-0000-4000-8000-000000000005','delivered',now());
\ir ../../release/staged-marketing-segments.sql
SET ROLE authenticated;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
SET request.jwt.claim.jwt='{}';
SELECT public.set_my_marketing_email_consent(gen_random_uuid(),true,'email-marketing-v1',NULL);
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
SELECT public.set_my_marketing_email_consent(gen_random_uuid(),true,'email-marketing-v1',NULL);
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000005';
SELECT public.set_my_marketing_email_consent(gen_random_uuid(),true,'email-marketing-v1',NULL);
DO $test$ BEGIN
 BEGIN PERFORM public.admin_marketing_segments(); RAISE EXCEPTION 'Customer segment read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$
DECLARE r jsonb;
BEGIN
 r:=public.admin_marketing_segments()->'segments';
 IF r->'all'->>'accounts'<>'5' OR r->'all'->>'consent_candidates'<>'1'
 OR r->'vip'->>'accounts'<>'2' OR r->'vip'->>'consent_candidates'<>'0'
 OR r->'repeat'->>'accounts'<>'1' OR r->'inactive'->>'accounts'<>'1'
 OR r->'no_purchase'->>'accounts'<>'3' OR r->'one_purchase'->>'accounts'<>'1'
 OR r->'new'->>'consent_candidates'<>'1' THEN RAISE EXCEPTION 'Segment mismatch: %',r; END IF;
END $test$;
RESET ROLE;
DO $test$ BEGIN
 IF has_function_privilege('anon','public.admin_marketing_segments()','EXECUTE') THEN RAISE EXCEPTION 'Anonymous segment access'; END IF;
END $test$;
-- A matching staff address is excluded even though the staff account is
-- not in the customer segment universe. Restore the fixture afterwards.
UPDATE auth.users SET email=' NEW@example.invalid ' WHERE id='10000000-0000-4000-8000-000000000006';
SET ROLE authenticated;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$ BEGIN
 IF public.admin_marketing_segments()->'segments'->'all'->>'consent_candidates'<>'0' THEN RAISE EXCEPTION 'Staff address collision not excluded'; END IF;
 IF public.admin_marketing_segments()->'segments'->'all'->>'accounts'<>'5' THEN RAISE EXCEPTION 'Staff collision changed account scope'; END IF;
END $test$;
RESET ROLE;
UPDATE auth.users SET email='staff@example.invalid' WHERE id='10000000-0000-4000-8000-000000000006';
UPDATE auth.users SET email_confirmed_at=email_confirmed_at+interval '1 second' WHERE id='10000000-0000-4000-8000-000000000004';
SET ROLE authenticated;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$ BEGIN
 IF public.admin_marketing_segments()->'segments'->'all'->>'consent_candidates'<>'0' THEN RAISE EXCEPTION 'Reconfirmed address candidate not excluded'; END IF;
END $test$;
RESET ROLE;
-- Re-consent explicitly against the last observed event for later campaign tests.
SET ROLE authenticated;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
SET request.jwt.claim.jwt='{}';
SELECT public.set_my_marketing_email_consent(gen_random_uuid(),true,'email-marketing-v1',(public.my_marketing_email_consent()->>'event_id')::uuid);
RESET ROLE;
\ir ../../release/staged-marketing-campaigns.sql
SET ROLE authenticated;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$
DECLARE c uuid:='80000000-0000-4000-8000-000000000001'; q uuid:='81000000-0000-4000-8000-000000000001'; e uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); dt timestamptz:=statement_timestamp()+interval '2 days'; r jsonb;
BEGIN
 r:=public.admin_save_marketing_campaign(c,q,0,'create','Test offer','vip','Offer','Plain text',dt);
 IF r->>'revision'<>'1' OR r->>'delivery_enabled'<>'false' OR r->>'idempotent_replay'<>'false' THEN RAISE EXCEPTION 'Campaign create failed: %',r; END IF;
 r:=public.admin_save_marketing_campaign(c,q,0,'create','Test offer','vip','Offer','Plain text',dt);
 IF r->>'idempotent_replay'<>'true' THEN RAISE EXCEPTION 'Campaign retry failed'; END IF;
 BEGIN PERFORM public.admin_save_marketing_campaign(c,q,0,'create','Other','vip','Offer','Plain text',dt); RAISE EXCEPTION 'Changed replay accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_save_marketing_campaign(c,gen_random_uuid(),1,'edit','Test','unknown','Offer','Text',NULL); RAISE EXCEPTION 'Unknown segment'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_save_marketing_campaign(c,gen_random_uuid(),1,'edit','Test','all',E'Injected\nsubject','Text',NULL); RAISE EXCEPTION 'Invalid subject'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_save_marketing_campaign(c,gen_random_uuid(),1,'edit','Test','all','Offer','Text',statement_timestamp()-interval '1 day'); RAISE EXCEPTION 'Past plan'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 r:=public.admin_save_marketing_campaign(c,e,1,'edit','Updated','repeat','Offer 2',E'Line one\nLine two',NULL);
 IF r->>'revision'<>'2' OR r->>'segment'<>'repeat' THEN RAISE EXCEPTION 'Edit mismatch'; END IF;
 BEGIN PERFORM public.admin_save_marketing_campaign(c,gen_random_uuid(),1,'edit','Stale','all','Offer','Text',NULL); RAISE EXCEPTION 'Stale edit allowed'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 r:=public.admin_save_marketing_campaign(c,a,2,'archive',NULL,NULL,NULL,NULL,NULL);
 IF r->>'archived'<>'true' OR r->>'revision'<>'3' OR r->>'delivery_enabled'<>'false' THEN RAISE EXCEPTION 'Archive mismatch'; END IF;
 BEGIN PERFORM public.admin_save_marketing_campaign(c,gen_random_uuid(),3,'edit','Archived','all','Offer','Text',NULL); RAISE EXCEPTION 'Archived edit allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 r:=public.admin_read_marketing_campaigns(c);
 IF r->>'total'<>'1' OR r->'campaigns'->0->>'revision'<>'3' OR r->>'delivery_enabled'<>'false' THEN RAISE EXCEPTION 'Readback mismatch'; END IF;
 BEGIN PERFORM 1 FROM private.marketing_campaign_revisions; RAISE EXCEPTION 'Raw audit read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
DO $test$ BEGIN
 BEGIN PERFORM public.admin_read_marketing_campaigns(NULL); RAISE EXCEPTION 'Nonowner read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.admin_save_marketing_campaign(gen_random_uuid(),gen_random_uuid(),0,'create','Test','all','Offer','Text',NULL); RAISE EXCEPTION 'Nonowner write'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
RESET ROLE;
DO $test$ BEGIN
 IF (SELECT count(*) FROM private.marketing_campaign_revisions)<>3 THEN RAISE EXCEPTION 'Revision audit mismatch'; END IF;
 BEGIN DELETE FROM private.marketing_campaign_revisions; RAISE EXCEPTION 'Audit deletion allowed'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
 IF has_function_privilege('anon','public.admin_read_marketing_campaigns(uuid)','EXECUTE') OR has_function_privilege('anon','public.admin_save_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamptz)','EXECUTE') OR has_table_privilege('authenticated','private.marketing_campaigns','SELECT') THEN RAISE EXCEPTION 'Campaign privilege leak'; END IF;
END $test$;
\ir ../../release/staged-marketing-templates.sql
SET ROLE authenticated;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$
DECLARE t uuid:=gen_random_uuid(); q uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); f jsonb:='{"name":"Example","category":"welcome","segment":"new","subject":"Welcome","body":"Hello"}'; r jsonb;
BEGIN
 r:=public.admin_save_marketing_template(t,q,0,'create',f);
 IF r->>'revision'<>'1' OR r->>'idempotent_replay'<>'false' THEN RAISE EXCEPTION 'Template create mismatch'; END IF;
 IF public.admin_save_marketing_template(t,q,0,'create',f)->>'idempotent_replay'<>'true' THEN RAISE EXCEPTION 'Template retry mismatch'; END IF;
 BEGIN PERFORM public.admin_save_marketing_template(t,q,0,'create',f||'{"name":"Changed"}'); RAISE EXCEPTION 'Changed replay'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_save_marketing_template(t,gen_random_uuid(),1,'edit',f||'{"category":"invalid"}'); RAISE EXCEPTION 'Bad category'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_save_marketing_template(t,gen_random_uuid(),1,'edit',f||'{"extra":"invalid"}'); RAISE EXCEPTION 'Extra field'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 r:=public.admin_save_marketing_template(t,gen_random_uuid(),1,'edit',f||'{"subject":"Updated"}');
 IF r->>'revision'<>'2' OR r->>'subject'<>'Updated' THEN RAISE EXCEPTION 'Template edit mismatch'; END IF;
 BEGIN PERFORM public.admin_save_marketing_template(t,gen_random_uuid(),1,'edit',f); RAISE EXCEPTION 'Stale edit'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 IF public.admin_save_marketing_template(t,a,2,'archive','{}')->>'archived'<>'true' THEN RAISE EXCEPTION 'Archive failed'; END IF;
 IF public.admin_save_marketing_template(t,a,2,'archive','{}')->>'idempotent_replay'<>'true' THEN RAISE EXCEPTION 'Archive retry failed'; END IF;
 r:=public.admin_read_marketing_templates(t);
 IF r->>'total'<>'1' OR r->'templates'->0->>'revision'<>'3' THEN RAISE EXCEPTION 'Template list mismatch'; END IF;
 BEGIN PERFORM public.admin_save_marketing_template(t,gen_random_uuid(),3,'edit',f); RAISE EXCEPTION 'Archived edit allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $test$;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
DO $test$ BEGIN
 BEGIN PERFORM public.admin_read_marketing_templates(NULL); RAISE EXCEPTION 'Nonowner read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.admin_save_marketing_template(gen_random_uuid(),gen_random_uuid(),0,'create','{}'); RAISE EXCEPTION 'Nonowner write'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
RESET ROLE;
DO $test$ BEGIN
 IF (SELECT count(*) FROM private.marketing_template_versions)<>3 THEN RAISE EXCEPTION 'Template audit mismatch'; END IF;
 BEGIN DELETE FROM private.marketing_template_versions; RAISE EXCEPTION 'Template history deletion allowed'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
 IF has_function_privilege('anon','public.admin_read_marketing_templates(uuid)','EXECUTE') OR has_function_privilege('anon','public.admin_save_marketing_template(uuid,uuid,bigint,text,jsonb)','EXECUTE') OR has_table_privilege('authenticated','private.marketing_template_versions','SELECT') THEN RAISE EXCEPTION 'Template privilege leak'; END IF;
END $test$;
\ir ../../release/staged-marketing-preflight.sql
SET ROLE authenticated;
SET request.jwt.claim.sub='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
SET request.jwt.claim.jwt='{"app_metadata":{"role":"admin"}}';
DO $test$
DECLARE c uuid:=gen_random_uuid(); q uuid:=gen_random_uuid(); r jsonb;
BEGIN
 PERFORM public.admin_save_marketing_campaign(c,gen_random_uuid(),0,'create','Preflight','new','Offer','Text',NULL);
 r:=public.admin_check_marketing_campaign(c,1,q);
 IF r->>'status'<>'blocked' OR r->>'delivery_enabled'<>'false' OR r->>'is_send_authorization'<>'false' OR r->>'consent_candidates'<>'1' OR NOT (r->'blockers' ? 'delivery_disabled') THEN RAISE EXCEPTION 'Unsafe preflight: %',r; END IF;
 IF public.admin_check_marketing_campaign(c,1,q)->>'idempotent_replay'<>'true' THEN RAISE EXCEPTION 'Preflight retry mismatch'; END IF;
 BEGIN PERFORM public.admin_check_marketing_campaign(c,2,q); RAISE EXCEPTION 'Altered preflight replay'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM public.admin_save_marketing_campaign(c,gen_random_uuid(),1,'edit','Preflight','vip','Offer','Text',NULL);
 BEGIN PERFORM public.admin_check_marketing_campaign(c,1,gen_random_uuid()); RAISE EXCEPTION 'Stale preflight allowed'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 r:=public.admin_read_marketing_preflights(c,q);
 IF r->>'current_revision'<>'2' OR r->>'total'<>'1' OR r->'checks'->0->>'campaign_revision'<>'1' THEN RAISE EXCEPTION 'Historical revision lost'; END IF;
 r:=public.admin_check_marketing_campaign(c,2,gen_random_uuid());
 IF r->>'consent_candidates'<>'0' OR NOT (r->'blockers' ? 'no_consent_candidates') THEN RAISE EXCEPTION 'Empty audience not blocked'; END IF;
 PERFORM public.admin_save_marketing_campaign(c,gen_random_uuid(),2,'archive',NULL,NULL,NULL,NULL,NULL);
 r:=public.admin_check_marketing_campaign(c,3,gen_random_uuid());
 IF NOT (r->'blockers' ? 'campaign_archived') THEN RAISE EXCEPTION 'Archived campaign not blocked'; END IF;
 IF public.admin_read_marketing_preflights(c,NULL)->>'total'<>'3' THEN RAISE EXCEPTION 'Preflight history mismatch'; END IF;
END $test$;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
DO $test$ BEGIN
 BEGIN PERFORM public.admin_check_marketing_campaign(gen_random_uuid(),1,gen_random_uuid()); RAISE EXCEPTION 'Nonowner check'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.admin_read_marketing_preflights(gen_random_uuid(),NULL); RAISE EXCEPTION 'Nonowner history'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
RESET ROLE;
DO $test$ BEGIN
 IF (SELECT count(*) FROM private.marketing_campaign_preflights)<>3 THEN RAISE EXCEPTION 'Preflight audit count mismatch'; END IF;
 BEGIN DELETE FROM private.marketing_campaign_preflights; RAISE EXCEPTION 'Preflight history deletion allowed'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
 IF has_function_privilege('anon','public.admin_check_marketing_campaign(uuid,bigint,uuid)','EXECUTE') OR has_function_privilege('anon','public.admin_read_marketing_preflights(uuid,uuid)','EXECUTE') OR has_table_privilege('authenticated','private.marketing_campaign_preflights','SELECT') THEN RAISE EXCEPTION 'Preflight privilege leak'; END IF;
END $test$;
\echo 'PASS marketing consent, segments, campaigns, templates and preflight contract (isolated)'
