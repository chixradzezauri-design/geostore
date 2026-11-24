-- STAGED ONLY: campaign planning, never a dispatch queue.
-- Plain-text content only; no recipient identities or delivery integration.
BEGIN;
CREATE TABLE private.marketing_campaigns (
 id uuid PRIMARY KEY,
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120 AND name=btrim(name)),
 segment text NOT NULL CHECK(segment IN ('all','vip','new','no_purchase','one_purchase','repeat','inactive')),
 subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 160 AND subject=btrim(subject)),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 10000 AND body=btrim(body)),
 planned_at timestamptz,
 archived boolean NOT NULL DEFAULT false,
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX marketing_campaign_recent_idx ON private.marketing_campaigns(updated_at DESC,id);
ALTER TABLE private.marketing_campaigns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.marketing_campaigns FROM PUBLIC,anon,authenticated;
CREATE TABLE private.marketing_campaign_revisions (
 request_id uuid PRIMARY KEY,
 campaign_id uuid NOT NULL REFERENCES private.marketing_campaigns(id) ON DELETE RESTRICT,
 revision bigint NOT NULL,
 operation text NOT NULL CHECK(operation IN ('create','edit','archive')),
 payload jsonb NOT NULL,
 snapshot jsonb NOT NULL,
 actor_id uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(campaign_id,revision)
);
ALTER TABLE private.marketing_campaign_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.marketing_campaign_revisions FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.reject_marketing_revision_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $campaign$
BEGIN RAISE EXCEPTION 'Campaign revisions are append-only' USING ERRCODE='55000'; END;
$campaign$;
REVOKE ALL ON FUNCTION private.reject_marketing_revision_mutation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER marketing_revision_immutable BEFORE UPDATE OR DELETE ON private.marketing_campaign_revisions FOR EACH ROW EXECUTE FUNCTION private.reject_marketing_revision_mutation();

CREATE FUNCTION private.marketing_campaign_json(p private.marketing_campaigns) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $campaign$
 SELECT jsonb_build_object('id',p.id,'name',p.name,'segment',p.segment,'subject',p.subject,'body',p.body,
 'planned_at',p.planned_at,'archived',p.archived,'revision',p.revision::text,'created_at',p.created_at,'updated_at',p.updated_at,'delivery_enabled',false);
$campaign$;
REVOKE ALL ON FUNCTION private.marketing_campaign_json(private.marketing_campaigns) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.save_admin_marketing_campaign(p_id uuid,p_request uuid,p_revision bigint,p_operation text,p_name text,p_segment text,p_subject text,p_body text,p_planned_at timestamptz) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $campaign$
DECLARE v_actor uuid:=auth.uid(); v_row private.marketing_campaigns%ROWTYPE; v_old private.marketing_campaign_revisions%ROWTYPE; v_payload jsonb; v_snapshot jsonb;
BEGIN
 IF v_actor IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_request IS NULL OR p_revision IS NULL OR p_operation IS NULL OR p_operation NOT IN ('create','edit','archive') OR (p_operation='create' AND p_revision<>0) OR (p_operation<>'create' AND p_revision<1) THEN RAISE EXCEPTION 'Invalid campaign request' USING ERRCODE='22023'; END IF;
 IF p_operation='archive' THEN
  IF p_name IS NOT NULL OR p_segment IS NOT NULL OR p_subject IS NOT NULL OR p_body IS NOT NULL OR p_planned_at IS NOT NULL THEN RAISE EXCEPTION 'Archive payload must be empty' USING ERRCODE='22023'; END IF;
 ELSE
  IF p_name IS NULL OR length(p_name) NOT BETWEEN 1 AND 120 OR p_name<>btrim(p_name) OR p_name ~ '[[:cntrl:]]'
   OR p_segment IS NULL OR p_segment NOT IN ('all','vip','new','no_purchase','one_purchase','repeat','inactive')
   OR p_subject IS NULL OR length(p_subject) NOT BETWEEN 1 AND 160 OR p_subject<>btrim(p_subject) OR p_subject ~ '[[:cntrl:]]'
   OR p_body IS NULL OR length(p_body) NOT BETWEEN 1 AND 10000 OR btrim(p_body)='' OR p_body<>btrim(p_body)
   OR p_body ~ '[[:cntrl:]]' AND regexp_replace(p_body,E'[\n\r\t]','','g') ~ '[[:cntrl:]]'
   OR (p_planned_at IS NOT NULL AND NOT isfinite(p_planned_at)) THEN RAISE EXCEPTION 'Invalid campaign fields' USING ERRCODE='22023'; END IF;
 END IF;
 v_payload:=jsonb_build_object('id',p_id,'revision',p_revision::text,'operation',p_operation,'name',p_name,'segment',p_segment,'subject',p_subject,'body',p_body,'planned_at',p_planned_at);
 -- Serialize identical request IDs, including concurrent retries.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,1809));
 SELECT * INTO v_old FROM private.marketing_campaign_revisions WHERE request_id=p_request;
 IF FOUND THEN
  IF v_old.payload IS DISTINCT FROM v_payload OR v_old.actor_id IS DISTINCT FROM v_actor THEN RAISE EXCEPTION 'Campaign request identity conflict' USING ERRCODE='22023'; END IF;
  RETURN v_old.snapshot||jsonb_build_object('request_id',p_request,'idempotent_replay',true);
 END IF;
 IF p_operation<>'archive' AND p_planned_at IS NOT NULL AND (p_planned_at<=statement_timestamp() OR p_planned_at>statement_timestamp()+interval '365 days') THEN RAISE EXCEPTION 'Planning date outside next 365 days' USING ERRCODE='22023'; END IF;
 IF p_operation='create' THEN
  INSERT INTO private.marketing_campaigns(id,name,segment,subject,body,planned_at,created_by)
  VALUES(p_id,p_name,p_segment,p_subject,p_body,p_planned_at,v_actor) RETURNING * INTO v_row;
 ELSE
  SELECT * INTO v_row FROM private.marketing_campaigns WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR v_row.revision<>p_revision THEN RAISE EXCEPTION 'Campaign revision conflict' USING ERRCODE='40001'; END IF;
  IF v_row.archived THEN RAISE EXCEPTION 'Archived campaign is read-only' USING ERRCODE='22023'; END IF;
  IF p_operation='archive' THEN
   UPDATE private.marketing_campaigns SET archived=true,planned_at=NULL,revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO v_row;
  ELSE
   UPDATE private.marketing_campaigns SET name=p_name,segment=p_segment,subject=p_subject,body=p_body,planned_at=p_planned_at,revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO v_row;
  END IF;
 END IF;
 v_snapshot:=private.marketing_campaign_json(v_row);
 INSERT INTO private.marketing_campaign_revisions(request_id,campaign_id,revision,operation,payload,snapshot,actor_id) VALUES(p_request,p_id,v_row.revision,p_operation,v_payload,v_snapshot,v_actor);
 RETURN v_snapshot||jsonb_build_object('request_id',p_request,'idempotent_replay',false);
END;
$campaign$;
REVOKE ALL ON FUNCTION private.save_admin_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.save_admin_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamptz) TO authenticated;
CREATE FUNCTION public.admin_save_marketing_campaign(p_id uuid,p_request uuid,p_revision bigint,p_operation text,p_name text,p_segment text,p_subject text,p_body text,p_planned_at timestamptz) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $campaign$
 SELECT private.save_admin_marketing_campaign(p_id,p_request,p_revision,p_operation,p_name,p_segment,p_subject,p_body,p_planned_at);
$campaign$;
REVOKE ALL ON FUNCTION public.admin_save_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamptz) TO authenticated;

CREATE FUNCTION private.read_admin_marketing_campaigns(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $campaign$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('campaigns',coalesce(jsonb_agg(private.marketing_campaign_json(c) ORDER BY c.updated_at DESC,c.id),'[]'::jsonb),
 'total',(SELECT count(*)::text FROM private.marketing_campaigns WHERE p_id IS NULL OR id=p_id),'delivery_enabled',false)
 INTO v_result FROM (SELECT * FROM private.marketing_campaigns WHERE p_id IS NULL OR id=p_id ORDER BY updated_at DESC,id LIMIT 100) c;
 RETURN v_result;
END;
$campaign$;
REVOKE ALL ON FUNCTION private.read_admin_marketing_campaigns(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_admin_marketing_campaigns(uuid) TO authenticated;
CREATE FUNCTION public.admin_read_marketing_campaigns(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $campaign$
 SELECT private.read_admin_marketing_campaigns(p_id);
$campaign$;
REVOKE ALL ON FUNCTION public.admin_read_marketing_campaigns(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_read_marketing_campaigns(uuid) TO authenticated;
COMMIT;
