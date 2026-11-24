-- STAGED ONLY: owner-managed reusable plain-text templates. No sending.
BEGIN;
CREATE TABLE private.marketing_template_versions (
 template_id uuid NOT NULL, revision bigint NOT NULL CHECK(revision>0),
 request_id uuid NOT NULL UNIQUE,
 operation text NOT NULL CHECK(operation IN ('create','edit','archive')),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120 AND name=btrim(name)),
 category text NOT NULL CHECK(category IN ('welcome','loyalty','promotion','reactivation','other')),
 segment text NOT NULL CHECK(segment IN ('all','vip','new','no_purchase','one_purchase','repeat','inactive')),
 subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 160 AND subject=btrim(subject)),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 10000 AND body=btrim(body)),
 archived boolean NOT NULL,
 actor_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(template_id,revision)
);
ALTER TABLE private.marketing_template_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.marketing_template_versions FROM PUBLIC,anon,authenticated;
CREATE TRIGGER marketing_template_version_immutable BEFORE UPDATE OR DELETE ON private.marketing_template_versions FOR EACH ROW EXECUTE FUNCTION private.reject_marketing_revision_mutation();
CREATE FUNCTION private.marketing_template_json(v private.marketing_template_versions) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $template$
 SELECT jsonb_build_object('id',v.template_id,'revision',v.revision::text,'name',v.name,'category',v.category,'segment',v.segment,'subject',v.subject,'body',v.body,'archived',v.archived,'recorded_at',v.recorded_at);
$template$;
REVOKE ALL ON FUNCTION private.marketing_template_json(private.marketing_template_versions) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.save_admin_marketing_template(p_id uuid,p_request uuid,p_revision bigint,p_operation text,p_fields jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $template$
DECLARE v_actor uuid:=auth.uid(); v_old private.marketing_template_versions%ROWTYPE; v_new private.marketing_template_versions%ROWTYPE; v_fields jsonb;
BEGIN
 IF v_actor IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_request IS NULL OR p_revision IS NULL OR p_operation IS NULL OR p_operation NOT IN ('create','edit','archive') OR (p_operation='create' AND p_revision<>0) OR (p_operation<>'create' AND p_revision<1) THEN RAISE EXCEPTION 'Invalid template operation' USING ERRCODE='22023'; END IF;
 IF p_operation='archive' THEN
  IF p_fields IS DISTINCT FROM '{}'::jsonb THEN RAISE EXCEPTION 'Archive requires empty fields' USING ERRCODE='22023'; END IF;
 ELSE
  IF jsonb_typeof(p_fields) IS DISTINCT FROM 'object' OR NOT (p_fields ?& ARRAY['name','category','segment','subject','body']) OR (p_fields-ARRAY['name','category','segment','subject','body'])<>'{}'::jsonb THEN RAISE EXCEPTION 'Invalid template fields' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(p_fields) WHERE jsonb_typeof(value)<>'string') THEN RAISE EXCEPTION 'Invalid template field types' USING ERRCODE='22023'; END IF;
  IF length(p_fields->>'name') NOT BETWEEN 1 AND 120 OR p_fields->>'name'<>btrim(p_fields->>'name') OR p_fields->>'name'~'[[:cntrl:]]'
   OR p_fields->>'category' NOT IN ('welcome','loyalty','promotion','reactivation','other')
   OR p_fields->>'segment' NOT IN ('all','vip','new','no_purchase','one_purchase','repeat','inactive')
   OR length(p_fields->>'subject') NOT BETWEEN 1 AND 160 OR p_fields->>'subject'<>btrim(p_fields->>'subject') OR p_fields->>'subject'~'[[:cntrl:]]'
   OR length(p_fields->>'body') NOT BETWEEN 1 AND 10000 OR p_fields->>'body'<>btrim(p_fields->>'body') OR regexp_replace(p_fields->>'body',E'[\n\r\t]','','g')~'[[:cntrl:]]'
   OR btrim(regexp_replace(p_fields->>'body',E'[\n\r\t]','','g'))='' THEN RAISE EXCEPTION 'Invalid template values' USING ERRCODE='22023'; END IF;
 END IF;
 -- Lock request then template identity in separate advisory namespaces.
 PERFORM pg_advisory_xact_lock(19031,hashtext(p_request::text));
 PERFORM pg_advisory_xact_lock(19032,hashtext(p_id::text));
 SELECT * INTO v_old FROM private.marketing_template_versions WHERE request_id=p_request;
 IF FOUND THEN
  v_fields:=jsonb_build_object('name',v_old.name,'category',v_old.category,'segment',v_old.segment,'subject',v_old.subject,'body',v_old.body);
  IF v_old.template_id<>p_id OR v_old.actor_id<>v_actor OR v_old.revision<>p_revision+1 OR v_old.operation<>p_operation OR (p_operation<>'archive' AND v_fields IS DISTINCT FROM p_fields) THEN RAISE EXCEPTION 'Template request identity conflict' USING ERRCODE='22023'; END IF;
  RETURN private.marketing_template_json(v_old)||jsonb_build_object('request_id',p_request,'idempotent_replay',true);
 END IF;
 SELECT * INTO v_old FROM private.marketing_template_versions WHERE template_id=p_id ORDER BY revision DESC LIMIT 1;
 IF coalesce(v_old.revision,0)<>p_revision THEN RAISE EXCEPTION 'Template revision conflict' USING ERRCODE='PT409'; END IF;
 IF coalesce(v_old.archived,false) THEN RAISE EXCEPTION 'Archived template is read-only' USING ERRCODE='22023'; END IF;
 IF p_operation='archive' THEN v_fields:=jsonb_build_object('name',v_old.name,'category',v_old.category,'segment',v_old.segment,'subject',v_old.subject,'body',v_old.body); ELSE v_fields:=p_fields; END IF;
 INSERT INTO private.marketing_template_versions(template_id,revision,request_id,operation,name,category,segment,subject,body,archived,actor_id)
 VALUES(p_id,p_revision+1,p_request,p_operation,v_fields->>'name',v_fields->>'category',v_fields->>'segment',v_fields->>'subject',v_fields->>'body',p_operation='archive',v_actor) RETURNING * INTO v_new;
 RETURN private.marketing_template_json(v_new)||jsonb_build_object('request_id',p_request,'idempotent_replay',false);
END;
$template$;
REVOKE ALL ON FUNCTION private.save_admin_marketing_template(uuid,uuid,bigint,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.save_admin_marketing_template(uuid,uuid,bigint,text,jsonb) TO authenticated;
CREATE FUNCTION public.admin_save_marketing_template(p_id uuid,p_request uuid,p_revision bigint,p_operation text,p_fields jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $template$
 SELECT private.save_admin_marketing_template(p_id,p_request,p_revision,p_operation,p_fields);
$template$;
REVOKE ALL ON FUNCTION public.admin_save_marketing_template(uuid,uuid,bigint,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_marketing_template(uuid,uuid,bigint,text,jsonb) TO authenticated;
CREATE FUNCTION private.read_admin_marketing_templates(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $template$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 WITH latest AS (SELECT DISTINCT ON(template_id) * FROM private.marketing_template_versions WHERE p_id IS NULL OR template_id=p_id ORDER BY template_id,revision DESC)
 SELECT jsonb_build_object('total',(SELECT count(*)::text FROM latest),'templates',coalesce(jsonb_agg(private.marketing_template_json(v) ORDER BY v.recorded_at DESC,v.template_id),'[]'::jsonb)) INTO result
 FROM (SELECT * FROM latest ORDER BY recorded_at DESC,template_id LIMIT 100) v;
 RETURN result;
END;
$template$;
REVOKE ALL ON FUNCTION private.read_admin_marketing_templates(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_admin_marketing_templates(uuid) TO authenticated;
CREATE FUNCTION public.admin_read_marketing_templates(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $template$
 SELECT private.read_admin_marketing_templates(p_id);
$template$;
REVOKE ALL ON FUNCTION public.admin_read_marketing_templates(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_read_marketing_templates(uuid) TO authenticated;
COMMIT;
