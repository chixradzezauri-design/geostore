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
 r:=public.set_my_marketing_email_consent(e,true,'email-marketing-v1');
 IF r->>'status'<>'opted_in' OR r->>'acknowledged_event_id'<>e::text THEN RAISE EXCEPTION 'Opt-in missing: %',r; END IF;
 r:=public.set_my_marketing_email_consent(w,false,'email-marketing-v1');
 IF r->>'status'<>'withdrawn' THEN RAISE EXCEPTION 'Withdrawal missing'; END IF;
 r:=public.set_my_marketing_email_consent(e,true,'email-marketing-v1');
 IF r->>'status'<>'withdrawn' OR r->>'idempotent_replay'<>'true' THEN RAISE EXCEPTION 'Old retry re-enabled consent'; END IF;
 BEGIN PERFORM public.set_my_marketing_email_consent(e,false,'email-marketing-v1'); RAISE EXCEPTION 'Altered replay accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.set_my_marketing_email_consent(gen_random_uuid(),true,'unknown'); RAISE EXCEPTION 'Unknown version accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.admin_marketing_consent_summary(); RAISE EXCEPTION 'Customer aggregate access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM private.marketing_email_consent_events; RAISE EXCEPTION 'Raw ledger read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM public.set_my_marketing_email_consent(gen_random_uuid(),true,'email-marketing-v1');
END $test$;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000002';
DO $test$ BEGIN
 IF public.my_marketing_email_consent()->>'status'<>'not_set' THEN RAISE EXCEPTION 'Cross-user state'; END IF;
 BEGIN PERFORM public.set_my_marketing_email_consent('20000000-0000-4000-8000-000000000001',true,'email-marketing-v1'); RAISE EXCEPTION 'Cross-user replay allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.set_my_marketing_email_consent(gen_random_uuid(),true,'email-marketing-v1'); RAISE EXCEPTION 'Unverified opt-in allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF public.set_my_marketing_email_consent(gen_random_uuid(),false,'email-marketing-v1')->>'status'<>'withdrawn' THEN RAISE EXCEPTION 'Unverified withdrawal denied'; END IF;
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
DELETE FROM auth.users WHERE id='10000000-0000-4000-8000-000000000001';
DO $test$ BEGIN
 IF EXISTS(SELECT 1 FROM private.marketing_email_consent_events WHERE user_id='10000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Account deletion cleanup failed'; END IF;
 IF has_table_privilege('authenticated','private.marketing_email_consent_events','SELECT') OR has_function_privilege('anon','public.set_my_marketing_email_consent(uuid,boolean,text)','EXECUTE') OR has_function_privilege('anon','public.admin_marketing_consent_summary()','EXECUTE') THEN RAISE EXCEPTION 'Consent privilege leak'; END IF;
END $test$;
\echo 'PASS marketing consent contract (isolated)'
