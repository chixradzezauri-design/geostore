-- Read-only assertion against installed candidate before synthetic-only activation.
\set ON_ERROR_STOP on
DO $paused$
DECLARE fn text; r text;
BEGIN
 FOREACH fn IN ARRAY ARRAY['private.read_my_marketing_email_consent()','public.my_marketing_email_consent()','private.set_my_marketing_email_consent(uuid,boolean,text,uuid)','public.set_my_marketing_email_consent(uuid,boolean,text,uuid)'] LOOP
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
   IF has_function_privilege(r,fn,'EXECUTE') THEN RAISE EXCEPTION 'Paused consent executable: % %',r,fn; END IF;
   IF has_table_privilege(r,'private.marketing_email_consent_events','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') OR has_sequence_privilege(r,'private.marketing_email_consent_events_sequence_id_seq','USAGE,SELECT,UPDATE') THEN RAISE EXCEPTION 'Paused ledger exposed: %',r; END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=to_regprocedure(fn) AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'Paused consent PUBLIC execute: %',fn; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM private.marketing_email_consent_events) THEN RAISE EXCEPTION 'Paused candidate ledger is not empty'; END IF;
END $paused$;
\echo 'PASS paused release consent RPC ACLs and empty ledger'
