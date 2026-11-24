-- STAGED ONLY: immutable preflight observations, never permission to send.
-- Requires staged-marketing-segments.sql and staged-marketing-campaigns.sql.
BEGIN;
CREATE TABLE private.marketing_campaign_preflights (
 request_id uuid PRIMARY KEY,
 campaign_id uuid NOT NULL REFERENCES private.marketing_campaigns(id) ON DELETE RESTRICT,
 campaign_revision bigint NOT NULL CHECK(campaign_revision>0),
 segment text NOT NULL CHECK(segment IN ('all','vip','new','no_purchase','one_purchase','repeat','inactive')),
 accounts bigint NOT NULL CHECK(accounts>=0),
 consent_candidates bigint NOT NULL CHECK(consent_candidates>=0 AND consent_candidates<=accounts),
 blockers text[] NOT NULL CHECK(cardinality(blockers)>0),
 audience_as_of timestamptz NOT NULL,
 checked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 actor_id uuid NOT NULL,
 FOREIGN KEY(campaign_id,campaign_revision) REFERENCES private.marketing_campaign_revisions(campaign_id,revision) ON DELETE RESTRICT
);
CREATE INDEX marketing_preflight_campaign_idx ON private.marketing_campaign_preflights(campaign_id,checked_at DESC,request_id);
ALTER TABLE private.marketing_campaign_preflights ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.marketing_campaign_preflights FROM PUBLIC,anon,authenticated;
CREATE TRIGGER marketing_preflight_immutable BEFORE UPDATE OR DELETE ON private.marketing_campaign_preflights FOR EACH ROW EXECUTE FUNCTION private.reject_marketing_revision_mutation();

CREATE FUNCTION private.marketing_preflight_json(v private.marketing_campaign_preflights) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $preflight$
 SELECT jsonb_build_object('request_id',v.request_id,'campaign_id',v.campaign_id,'campaign_revision',v.campaign_revision::text,
 'segment',v.segment,'accounts',v.accounts::text,'consent_candidates',v.consent_candidates::text,'blockers',to_jsonb(v.blockers),
 'audience_as_of',v.audience_as_of,'checked_at',v.checked_at,'status','blocked','delivery_enabled',false,'is_send_authorization',false);
$preflight$;
REVOKE ALL ON FUNCTION private.marketing_preflight_json(private.marketing_campaign_preflights) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.check_admin_marketing_campaign(p_id uuid,p_revision bigint,p_request uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $preflight$
DECLARE v_actor uuid:=auth.uid(); v_campaign private.marketing_campaigns%ROWTYPE;
 v_record private.marketing_campaign_preflights%ROWTYPE; v_segments jsonb; v_counts jsonb; v_accounts bigint; v_candidates bigint;
 v_blockers text[]:=ARRAY['delivery_disabled','provider_not_configured','sender_not_verified','unsubscribe_not_verified','suppression_not_verified','privacy_review_pending','delivery_recheck_not_implemented'];
BEGIN
 IF v_actor IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_request IS NULL OR p_revision IS NULL OR p_revision<1 THEN RAISE EXCEPTION 'Invalid preflight request' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(20001,hashtext(p_request::text));
 SELECT * INTO v_record FROM private.marketing_campaign_preflights WHERE request_id=p_request;
 IF FOUND THEN
  IF v_record.campaign_id<>p_id OR v_record.campaign_revision<>p_revision OR v_record.actor_id<>v_actor THEN RAISE EXCEPTION 'Preflight request identity conflict' USING ERRCODE='22023'; END IF;
  RETURN private.marketing_preflight_json(v_record)||jsonb_build_object('idempotent_replay',true);
 END IF;
 SELECT * INTO v_campaign FROM private.marketing_campaigns WHERE id=p_id FOR SHARE;
 IF NOT FOUND OR v_campaign.revision<>p_revision THEN RAISE EXCEPTION 'Campaign revision conflict' USING ERRCODE='PT409'; END IF;
 v_segments:=private.read_admin_marketing_segments();
 v_counts:=v_segments->'segments'->v_campaign.segment;
 IF v_counts IS NULL OR coalesce(v_counts->>'accounts','') !~ '^[0-9]+$' OR coalesce(v_counts->>'consent_candidates','') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Audience data unavailable' USING ERRCODE='22023'; END IF;
 v_accounts:=(v_counts->>'accounts')::bigint; v_candidates:=(v_counts->>'consent_candidates')::bigint;
 IF v_candidates=0 THEN v_blockers:=array_append(v_blockers,'no_consent_candidates'); END IF;
 IF v_campaign.archived THEN v_blockers:=array_append(v_blockers,'campaign_archived'); END IF;
 IF v_campaign.planned_at IS NOT NULL AND v_campaign.planned_at<=statement_timestamp() THEN v_blockers:=array_append(v_blockers,'planned_time_elapsed'); END IF;
 INSERT INTO private.marketing_campaign_preflights(request_id,campaign_id,campaign_revision,segment,accounts,consent_candidates,blockers,audience_as_of,actor_id)
 VALUES(p_request,p_id,p_revision,v_campaign.segment,v_accounts,v_candidates,v_blockers,(v_segments->>'as_of')::timestamptz,v_actor)
 RETURNING * INTO v_record;
 RETURN private.marketing_preflight_json(v_record)||jsonb_build_object('idempotent_replay',false);
END;
$preflight$;
REVOKE ALL ON FUNCTION private.check_admin_marketing_campaign(uuid,bigint,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.check_admin_marketing_campaign(uuid,bigint,uuid) TO authenticated;
CREATE FUNCTION public.admin_check_marketing_campaign(p_id uuid,p_revision bigint,p_request uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $preflight$
 SELECT private.check_admin_marketing_campaign(p_id,p_revision,p_request);
$preflight$;
REVOKE ALL ON FUNCTION public.admin_check_marketing_campaign(uuid,bigint,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_check_marketing_campaign(uuid,bigint,uuid) TO authenticated;

-- The current revision is returned with each history read, so callers cannot mistake
-- a historical observation for current readiness. Exact request lookup supports retries.
CREATE FUNCTION private.read_admin_marketing_preflights(p_id uuid,p_request uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $preflight$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('campaign_id',c.id,'current_revision',c.revision::text,'delivery_enabled',false,
 'total',(SELECT count(*)::text FROM private.marketing_campaign_preflights p WHERE p.campaign_id=c.id AND (p_request IS NULL OR p.request_id=p_request)),
 'checks',coalesce((SELECT jsonb_agg(private.marketing_preflight_json(p) ORDER BY p.checked_at DESC,p.request_id)
 FROM (SELECT * FROM private.marketing_campaign_preflights x WHERE x.campaign_id=c.id AND (p_request IS NULL OR x.request_id=p_request) ORDER BY x.checked_at DESC,x.request_id LIMIT 100) p),'[]'::jsonb))
 INTO v_result FROM private.marketing_campaigns c WHERE c.id=p_id;
 IF v_result IS NULL THEN RAISE EXCEPTION 'Campaign unavailable' USING ERRCODE='22023'; END IF;
 RETURN v_result;
END;
$preflight$;
REVOKE ALL ON FUNCTION private.read_admin_marketing_preflights(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_admin_marketing_preflights(uuid,uuid) TO authenticated;
CREATE FUNCTION public.admin_read_marketing_preflights(p_id uuid,p_request uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $preflight$
 SELECT private.read_admin_marketing_preflights(p_id,p_request);
$preflight$;
REVOKE ALL ON FUNCTION public.admin_read_marketing_preflights(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_read_marketing_preflights(uuid,uuid) TO authenticated;
COMMIT;
