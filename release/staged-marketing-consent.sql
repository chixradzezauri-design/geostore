-- STAGED ONLY. Requires auth.users and existing private schema.
-- No customer is automatically opted in. No dispatch, tracking or provider integration.
-- Policy version is a candidate; approve actual consent copy and privacy retention before release.
BEGIN;
CREATE TABLE private.marketing_email_consent_events (
 sequence_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_id uuid NOT NULL UNIQUE,
 expected_event_id uuid,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 opted_in boolean NOT NULL,
 policy_version text NOT NULL CHECK(policy_version='email-marketing-v1'),
 email_fingerprint bytea,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK ((opted_in AND email_fingerprint IS NOT NULL AND octet_length(email_fingerprint)=32) OR (NOT opted_in AND email_fingerprint IS NULL))
);
CREATE INDEX marketing_email_consent_user_idx ON private.marketing_email_consent_events(user_id,sequence_id DESC);
ALTER TABLE private.marketing_email_consent_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.marketing_email_consent_events FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE private.marketing_email_consent_events_sequence_id_seq FROM PUBLIC,anon,authenticated;

-- Bind consent to a verified account address. Never expose or copy the raw address in this ledger.
CREATE FUNCTION private.marketing_email_fingerprint(p_email text) RETURNS bytea
LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER SET search_path='' AS $consent$
 SELECT sha256(convert_to(lower(btrim(p_email)),'UTF8'));
$consent$;
REVOKE ALL ON FUNCTION private.marketing_email_fingerprint(text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.read_my_marketing_email_consent() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $consent$
DECLARE v_user uuid:=auth.uid(); v_email text; v_confirmed timestamptz; v_event private.marketing_email_consent_events%ROWTYPE; v_status text;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT email,email_confirmed_at INTO v_email,v_confirmed FROM auth.users WHERE id=v_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_event FROM private.marketing_email_consent_events WHERE user_id=v_user ORDER BY sequence_id DESC LIMIT 1;
 IF NOT FOUND THEN v_status:='not_set';
 ELSIF NOT v_event.opted_in THEN v_status:='withdrawn';
 ELSIF v_confirmed IS NULL OR coalesce(btrim(v_email),'')='' OR v_event.email_fingerprint IS DISTINCT FROM private.marketing_email_fingerprint(v_email) THEN v_status:='reconfirmation_required';
 ELSE v_status:='opted_in';
 END IF;
 RETURN jsonb_build_object('status',v_status,'policy_version','email-marketing-v1','event_id',v_event.event_id,'recorded_at',v_event.recorded_at,
 'can_opt_in',v_confirmed IS NOT NULL AND coalesce(btrim(v_email),'')<>'');
END;
$consent$;
REVOKE ALL ON FUNCTION private.read_my_marketing_email_consent() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_my_marketing_email_consent() TO authenticated;
CREATE FUNCTION public.my_marketing_email_consent() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $consent$
 SELECT private.read_my_marketing_email_consent();
$consent$;
REVOKE ALL ON FUNCTION public.my_marketing_email_consent() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.my_marketing_email_consent() TO authenticated;

CREATE FUNCTION private.set_my_marketing_email_consent(p_event uuid,p_opted_in boolean,p_policy_version text,p_expected_event uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $consent$
DECLARE v_user uuid:=auth.uid(); v_email text; v_confirmed timestamptz; v_event private.marketing_email_consent_events%ROWTYPE; v_replay boolean:=false; v_latest uuid;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF p_event IS NULL OR p_opted_in IS NULL OR p_policy_version IS DISTINCT FROM 'email-marketing-v1' OR (NOT p_opted_in AND p_expected_event IS NOT NULL) THEN RAISE EXCEPTION 'Invalid consent request' USING ERRCODE='22023'; END IF;
 -- Serialize consent changes and account email changes. No auth row mutation.
 SELECT email,email_confirmed_at INTO v_email,v_confirmed FROM auth.users WHERE id=v_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_event FROM private.marketing_email_consent_events WHERE event_id=p_event;
 IF FOUND THEN
  IF v_event.user_id IS DISTINCT FROM v_user OR v_event.opted_in IS DISTINCT FROM p_opted_in OR v_event.policy_version IS DISTINCT FROM p_policy_version OR v_event.expected_event_id IS DISTINCT FROM p_expected_event THEN
   RAISE EXCEPTION 'Consent request conflict' USING ERRCODE='22023';
  END IF;
  v_replay:=true;
 ELSE
  SELECT event_id INTO v_latest FROM private.marketing_email_consent_events WHERE user_id=v_user ORDER BY sequence_id DESC LIMIT 1;
  IF p_opted_in AND v_latest IS DISTINCT FROM p_expected_event THEN RAISE EXCEPTION 'Consent changed; refresh before opting in' USING ERRCODE='40001'; END IF;
  IF p_opted_in AND (v_confirmed IS NULL OR coalesce(btrim(v_email),'')='') THEN RAISE EXCEPTION 'Verified email required' USING ERRCODE='22023'; END IF;
  INSERT INTO private.marketing_email_consent_events(event_id,user_id,opted_in,policy_version,email_fingerprint,expected_event_id)
  VALUES(p_event,v_user,p_opted_in,p_policy_version,CASE WHEN p_opted_in THEN private.marketing_email_fingerprint(v_email) ELSE NULL END,p_expected_event)
  RETURNING * INTO v_event;
 END IF;
 -- A retry of an old opt-in cannot override a later withdrawal or a changed email.
 RETURN private.read_my_marketing_email_consent()||jsonb_build_object('acknowledged_event_id',v_event.event_id,'idempotent_replay',v_replay);
END;
$consent$;
REVOKE ALL ON FUNCTION private.set_my_marketing_email_consent(uuid,boolean,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.set_my_marketing_email_consent(uuid,boolean,text,uuid) TO authenticated;
CREATE FUNCTION public.set_my_marketing_email_consent(p_event uuid,p_opted_in boolean,p_policy_version text,p_expected_event uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $consent$
 SELECT private.set_my_marketing_email_consent(p_event,p_opted_in,p_policy_version,p_expected_event);
$consent$;
REVOKE ALL ON FUNCTION public.set_my_marketing_email_consent(uuid,boolean,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_marketing_email_consent(uuid,boolean,text,uuid) TO authenticated;

-- Owner-only aggregate; not a deliverable audience or a list of customer addresses.
CREATE FUNCTION private.read_admin_marketing_consent_summary() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $consent$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 WITH states AS (
 SELECT CASE WHEN e.event_id IS NULL THEN 'not_set' WHEN NOT e.opted_in THEN 'withdrawn'
 WHEN u.email_confirmed_at IS NULL OR coalesce(btrim(u.email),'')='' OR e.email_fingerprint IS DISTINCT FROM private.marketing_email_fingerprint(u.email) THEN 'reconfirmation_required'
 ELSE 'opted_in' END AS status
 FROM auth.users u LEFT JOIN LATERAL (SELECT * FROM private.marketing_email_consent_events WHERE user_id=u.id ORDER BY sequence_id DESC LIMIT 1) e ON true
 )
 SELECT jsonb_build_object('total',count(*)::text,'not_set',(count(*) FILTER(WHERE status='not_set'))::text,
 'withdrawn',(count(*) FILTER(WHERE status='withdrawn'))::text,'reconfirmation_required',(count(*) FILTER(WHERE status='reconfirmation_required'))::text,
 'opted_in',(count(*) FILTER(WHERE status='opted_in'))::text)
 INTO v_result FROM states;
 RETURN v_result;
END;
$consent$;
REVOKE ALL ON FUNCTION private.read_admin_marketing_consent_summary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_admin_marketing_consent_summary() TO authenticated;
CREATE FUNCTION public.admin_marketing_consent_summary() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $consent$
 SELECT private.read_admin_marketing_consent_summary();
$consent$;
REVOKE ALL ON FUNCTION public.admin_marketing_consent_summary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketing_consent_summary() TO authenticated;
COMMIT;
