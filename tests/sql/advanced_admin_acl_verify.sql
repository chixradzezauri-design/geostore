-- Disposable catalog contract; no mutations, no customer data.
\set ON_ERROR_STOP on
DO $audit$
DECLARE f record; t text; col record; privilege text; expected boolean; actual boolean; routine_oid oid; definer boolean; settings text[];
BEGIN
 FOR f IN SELECT * FROM (VALUES
  ('private','bump_admin_supplier_revision',false,false),
  ('private','require_purchase_owner',false,false),
  ('private','reject_purchase_receipt_mutation',false,false),
  ('private','purchase_variant',false,false),
  ('private','create_admin_purchase',true,true),
  ('private','transition_admin_purchase',true,true),
  ('private','receive_admin_purchase',true,true),
  ('public','admin_create_purchase',true,false),
  ('public','admin_transition_purchase',true,false),
  ('public','admin_receive_purchase',true,false),
  ('private','reject_purchase_payment_mutation',false,false),
  ('private','purchase_payment_json',false,false),
  ('private','record_admin_purchase_payment',true,true),
  ('public','admin_record_purchase_payment',true,false),
  ('private','correct_admin_purchase_payment',true,true),
  ('public','admin_correct_purchase_payment',true,false),
  ('private','read_admin_purchase_payments',true,true),
  ('public','admin_read_purchase_payments',true,false),
  ('private','read_admin_supplier_balance',true,true),
  ('public','admin_read_supplier_balance',true,false),
  ('private','marketing_email_fingerprint',false,false),
  ('private','read_my_marketing_email_consent',false,true),
  ('public','my_marketing_email_consent',false,false),
  ('private','set_my_marketing_email_consent',false,true),
  ('public','set_my_marketing_email_consent',false,false),
  ('private','read_admin_marketing_consent_summary',true,true),
  ('public','admin_marketing_consent_summary',true,false),
  ('private','read_admin_marketing_segments',true,true),
  ('public','admin_marketing_segments',true,false),
  ('private','reject_marketing_revision_mutation',false,false),
  ('private','marketing_campaign_json',false,false),
  ('private','save_admin_marketing_campaign',true,true),
  ('public','admin_save_marketing_campaign',true,false),
  ('private','read_admin_marketing_campaigns',true,true),
  ('public','admin_read_marketing_campaigns',true,false),
  ('private','marketing_template_json',false,false),
  ('private','save_admin_marketing_template',true,true),
  ('public','admin_save_marketing_template',true,false),
  ('private','read_admin_marketing_templates',true,true),
  ('public','admin_read_marketing_templates',true,false),
  ('private','marketing_preflight_json',false,false),
  ('private','check_admin_marketing_campaign',true,true),
  ('public','admin_check_marketing_campaign',true,false),
  ('private','read_admin_marketing_preflights',true,true),
  ('public','admin_read_marketing_preflights',true,false)
 ) AS v(schema_name,routine_name,authenticated_execute,security_definer) LOOP
  SELECT p.oid,p.prosecdef,p.proconfig INTO STRICT routine_oid,definer,settings
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname=f.schema_name AND p.proname=f.routine_name;
  IF has_function_privilege('anon',routine_oid,'EXECUTE') OR
     EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=routine_oid AND a.grantee=0 AND a.privilege_type='EXECUTE') OR
     has_function_privilege('authenticated',routine_oid,'EXECUTE') IS DISTINCT FROM f.authenticated_execute OR definer IS DISTINCT FROM f.security_definer THEN
   RAISE EXCEPTION 'Candidate routine ACL or definer mismatch %.%',f.schema_name,f.routine_name;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM unnest(settings) s WHERE replace(s,'"','')='search_path=') THEN
   RAISE EXCEPTION 'Candidate routine search_path not empty %.%',f.schema_name,f.routine_name;
  END IF;
 END LOOP;
 -- Payment/correction tables are RPC-only even though they reside in public.
 FOREACH t IN ARRAY ARRAY['public.admin_suppliers','public.admin_purchase_orders','public.admin_purchase_lines','public.admin_purchase_receipts','public.admin_purchase_payments','public.admin_purchase_payment_corrections','private.marketing_email_consent_events','private.marketing_campaigns','private.marketing_campaign_revisions','private.marketing_template_versions','private.marketing_campaign_preflights'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(t) AND relrowsecurity) THEN RAISE EXCEPTION 'Missing RLS %',t; END IF;
  FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
   expected:=t IN ('public.admin_suppliers','public.admin_purchase_orders','public.admin_purchase_lines','public.admin_purchase_receipts') AND privilege='SELECT';
   IF has_table_privilege('anon',t,privilege) OR has_table_privilege('authenticated',t,privilege) IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Unexpected table ACL % %',t,privilege; END IF;
  END LOOP;
  FOR col IN SELECT attname FROM pg_attribute WHERE attrelid=to_regclass(t) AND attnum>0 AND NOT attisdropped LOOP
   FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
    expected:=(t IN ('public.admin_suppliers','public.admin_purchase_orders','public.admin_purchase_lines','public.admin_purchase_receipts') AND privilege='SELECT') OR (t='public.admin_suppliers' AND ((privilege='INSERT' AND col.attname IN ('name','commission','is_active')) OR (privilege='UPDATE' AND col.attname IN ('commission','is_active'))));
    actual:=has_column_privilege('authenticated',t,col.attname,privilege);
    IF has_column_privilege('anon',t,col.attname,privilege) OR actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Unexpected column ACL %.% %',t,col.attname,privilege; END IF;
   END LOOP;
  END LOOP;
 END LOOP;
 IF has_sequence_privilege('anon','private.marketing_email_consent_events_sequence_id_seq','USAGE,SELECT,UPDATE') OR has_sequence_privilege('authenticated','private.marketing_email_consent_events_sequence_id_seq','USAGE,SELECT,UPDATE') THEN RAISE EXCEPTION 'Consent sequence exposed'; END IF;
END $audit$;
\echo 'PASS candidate ACL matrix: 45 routines, 11 RLS tables, column permissions, MAINTAIN and consent sequence'
