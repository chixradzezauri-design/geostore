-- Unapplied 4AP draft. Requires 4AN. Run in one transaction in staging only.
-- The exact reviewed function definitions must match before any replacement.
do $preflight$
declare entry record; target regprocedure;
begin
 for entry in select * from (values
  ('private.admin_apply_flash_sale(numeric,text,integer)','8add71afd3e25653f0b579861d395389'),
  ('private.admin_create_flash_sale(numeric,text,integer)','be82d1fca123efc340eb390337cda57b'),
  ('private.check_admin_marketing_campaign(uuid,bigint,uuid)','9e6a971cffd3ec44580fa0079ee67ff7'),
  ('private.read_admin_marketing_campaigns(uuid)','fed9bebc5fb1c99cd88906a7af22391c'),
  ('private.read_admin_marketing_preflights(uuid,uuid)','bb0ddde14c5655bee91e9f562bff95a7'),
  ('private.read_admin_marketing_segments()','1a00d288cdd83edf2c5bfc1a64abc1d3'),
  ('private.read_admin_marketing_templates(uuid)','2ffec0213cac1c5bcc299e95ca063587'),
  ('private.save_admin_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamp with time zone)','6990433c5975087d593822d490cd0c75'),
  ('private.save_admin_marketing_template(uuid,uuid,bigint,text,jsonb)','93f80831159a54c583523fcb9030fe00')
 ) as expected(signature,fingerprint) loop
  target:=to_regprocedure(entry.signature);
  if target is null then raise exception 'Missing admin function: %',entry.signature;end if;
  if md5(pg_get_functiondef(target)) is distinct from entry.fingerprint then
   raise exception 'Admin function changed; review required: %',entry.signature;
  end if;
 end loop;
end $preflight$;
CREATE OR REPLACE FUNCTION private.admin_apply_flash_sale(p_discount_percent numeric, p_category text, p_duration_hours integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_updated integer;
  v_started_at timestamptz := now();
  v_ends_at timestamptz;
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to apply flash sale' USING ERRCODE = '42501';
  END IF;

  IF p_discount_percent IS NULL
     OR p_discount_percent <= 0
     OR p_discount_percent >= 100
     OR p_discount_percent <> round(p_discount_percent, 2) THEN
    RAISE EXCEPTION 'Discount percent must be greater than 0, less than 100, and have at most 2 decimal places'
      USING ERRCODE = '22023';
  END IF;

  IF COALESCE(trim(p_category), '') = '' THEN
    RAISE EXCEPTION 'Category is required' USING ERRCODE = '22023';
  END IF;

  IF p_duration_hours IS NULL OR p_duration_hours NOT IN (1, 3, 6, 12, 24, 48) THEN
    RAISE EXCEPTION 'Flash sale duration must be one of 1, 3, 6, 12, 24, or 48 hours'
      USING ERRCODE = '22023';
  END IF;

  v_ends_at := v_started_at + make_interval(hours => p_duration_hours);

  UPDATE public.products
     SET old_price_gel = CASE
           WHEN old_price_gel > price_gel THEN old_price_gel
           ELSE price_gel
         END,
         price_gel = ROUND(
           (CASE WHEN old_price_gel > price_gel THEN old_price_gel ELSE price_gel END)
           * (1 - p_discount_percent / 100),
           2
         ),
         flash_sale_started_at = v_started_at,
         flash_sale_ends_at = v_ends_at,
         flash_sale_percent = p_discount_percent
   WHERE (p_category = 'ყველა' OR category = p_category)
     AND COALESCE(variants, '[]'::jsonb) = '[]'::jsonb
     AND ROUND(
           (CASE WHEN old_price_gel > price_gel THEN old_price_gel ELSE price_gel END)
           * (1 - p_discount_percent / 100),
           2
         ) < (CASE WHEN old_price_gel > price_gel THEN old_price_gel ELSE price_gel END);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$;

CREATE OR REPLACE FUNCTION private.admin_create_flash_sale(p_discount_percent numeric, p_category text, p_duration_minutes integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_campaign_id uuid := gen_random_uuid();
  v_updated integer := 0;
  v_snapshot_count integer := 0;
  v_previous_campaign_id uuid;
  v_starts_at timestamptz := now();
  v_ends_at timestamptz;
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to create flash sale' USING ERRCODE = '42501';
  END IF;

  IF p_discount_percent IS NULL
     OR p_discount_percent <= 0
     OR p_discount_percent >= 100
     OR p_discount_percent <> round(p_discount_percent, 2) THEN
    RAISE EXCEPTION 'Discount percent must be greater than 0, less than 100, and have at most 2 decimal places'
      USING ERRCODE = '22023';
  END IF;

  IF COALESCE(trim(p_category), '') = '' THEN
    RAISE EXCEPTION 'Category is required' USING ERRCODE = '22023';
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes NOT IN (15, 30, 60, 180, 360, 720, 1440) THEN
    RAISE EXCEPTION 'Flash-sale duration must be one of the supported minute values'
      USING ERRCODE = '22023';
  END IF;

  PERFORM p.id
    FROM public.products AS p
   WHERE (p_category = 'ყველა' OR p.category = p_category)
     AND COALESCE(p.variants, '[]'::jsonb) = '[]'::jsonb
   FOR UPDATE;

  -- First expire due campaigns, then restore any currently active campaign.
  PERFORM private.expire_flash_sales();

  FOR v_previous_campaign_id IN
    SELECT id
      FROM public.flash_sale_campaigns
     WHERE status = 'active'
     ORDER BY created_at, id
     FOR UPDATE
  LOOP
    PERFORM private.restore_flash_sale_campaign(v_previous_campaign_id, 'replaced');
  END LOOP;

  -- Legacy campaigns created before persistent campaign records are restored
  -- once before the new snapshot. The cron expiry function handles their deadline.
  UPDATE public.products AS p
     SET price_gel = CASE
           WHEN p.old_price_gel IS NOT NULL AND p.old_price_gel > p.price_gel
             THEN p.old_price_gel
           ELSE p.price_gel
         END,
         old_price_gel = NULL,
         flash_sale_started_at = NULL,
         flash_sale_ends_at = NULL,
         flash_sale_percent = NULL
   WHERE p.flash_sale_ends_at IS NOT NULL
     AND p.flash_sale_ends_at > now()
     AND NOT EXISTS (
       SELECT 1
         FROM public.flash_sale_items AS i
        WHERE i.product_id = p.id
     );

  -- Apply a discount to the current selling price, never to a higher old-price
  -- label. This prevents a new promotion from accidentally increasing a price.
  IF NOT EXISTS (
    SELECT 1
      FROM public.products AS p
     WHERE (p_category = 'ყველა' OR p.category = p_category)
       AND COALESCE(p.variants, '[]'::jsonb) = '[]'::jsonb
       AND ROUND(p.price_gel * (1 - p_discount_percent / 100), 2) < p.price_gel
  ) THEN
    RETURN jsonb_build_object('updated_count', 0, 'campaign', NULL);
  END IF;

  v_ends_at := v_starts_at + make_interval(mins => p_duration_minutes);

  INSERT INTO public.flash_sale_campaigns (
    id, category, discount_percent, starts_at, ends_at, status
  ) VALUES (
    v_campaign_id, trim(p_category), p_discount_percent, v_starts_at, v_ends_at, 'active'
  );

  INSERT INTO public.flash_sale_items (
    campaign_id, product_id, original_price_gel, original_old_price_gel,
    sale_price_gel, sale_old_price_gel
  )
  SELECT
    v_campaign_id,
    p.id,
    p.price_gel,
    p.old_price_gel,
    ROUND(p.price_gel * (1 - p_discount_percent / 100), 2),
    CASE WHEN p.old_price_gel > p.price_gel THEN p.old_price_gel ELSE p.price_gel END
  FROM public.products AS p
  WHERE (p_category = 'ყველა' OR p.category = p_category)
    AND COALESCE(p.variants, '[]'::jsonb) = '[]'::jsonb
    AND ROUND(p.price_gel * (1 - p_discount_percent / 100), 2) < p.price_gel;

  GET DIAGNOSTICS v_snapshot_count = ROW_COUNT;

  UPDATE public.products AS p
     SET price_gel = i.sale_price_gel,
         old_price_gel = i.sale_old_price_gel,
         flash_sale_started_at = v_starts_at,
         flash_sale_ends_at = v_ends_at,
         flash_sale_percent = p_discount_percent
    FROM public.flash_sale_items AS i
   WHERE i.campaign_id = v_campaign_id
     AND p.id = i.product_id
     AND p.price_gel = i.original_price_gel
     AND p.old_price_gel IS NOT DISTINCT FROM i.original_old_price_gel;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated <> v_snapshot_count OR v_updated = 0 THEN
    RAISE EXCEPTION 'Flash-sale price snapshot did not match the applied product count'
      USING ERRCODE = '40001';
  END IF;

  RETURN jsonb_build_object(
    'updated_count', v_updated,
    'campaign', jsonb_build_object(
      'id', v_campaign_id,
      'category', trim(p_category),
      'discount_percent', p_discount_percent,
      'starts_at', v_starts_at,
      'ends_at', v_ends_at,
      'product_ids', COALESCE(
        (SELECT jsonb_agg(i.product_id ORDER BY i.product_id)
           FROM public.flash_sale_items AS i
          WHERE i.campaign_id = v_campaign_id),
        '[]'::jsonb
      )
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.check_admin_marketing_campaign(p_id uuid, p_revision bigint, p_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_actor uuid:=auth.uid(); v_campaign private.marketing_campaigns%ROWTYPE;
 v_record private.marketing_campaign_preflights%ROWTYPE; v_segments jsonb; v_counts jsonb; v_accounts bigint; v_candidates bigint;
 v_blockers text[]:=ARRAY['delivery_disabled','provider_not_configured','sender_not_verified','unsubscribe_not_verified','suppression_not_verified','privacy_review_pending','delivery_recheck_not_implemented'];
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION private.read_admin_marketing_campaigns(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('campaigns',coalesce(jsonb_agg(private.marketing_campaign_json(c) ORDER BY c.updated_at DESC,c.id),'[]'::jsonb),
 'total',(SELECT count(*)::text FROM private.marketing_campaigns WHERE p_id IS NULL OR id=p_id),'delivery_enabled',false)
 INTO v_result FROM (SELECT * FROM private.marketing_campaigns WHERE p_id IS NULL OR id=p_id ORDER BY updated_at DESC,id LIMIT 100) c;
 RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION private.read_admin_marketing_preflights(p_id uuid, p_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('campaign_id',c.id,'current_revision',c.revision::text,'delivery_enabled',false,
 'total',(SELECT count(*)::text FROM private.marketing_campaign_preflights p WHERE p.campaign_id=c.id AND (p_request IS NULL OR p.request_id=p_request)),
 'checks',coalesce((SELECT jsonb_agg(private.marketing_preflight_json(p) ORDER BY p.checked_at DESC,p.request_id)
 FROM (SELECT * FROM private.marketing_campaign_preflights x WHERE x.campaign_id=c.id AND (p_request IS NULL OR x.request_id=p_request) ORDER BY x.checked_at DESC,x.request_id LIMIT 100) p),'[]'::jsonb))
 INTO v_result FROM private.marketing_campaigns c WHERE c.id=p_id;
 IF v_result IS NULL THEN RAISE EXCEPTION 'Campaign unavailable' USING ERRCODE='22023'; END IF;
 RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION private.read_admin_marketing_segments()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_result jsonb; v_today date:=(statement_timestamp() AT TIME ZONE 'Asia/Tbilisi')::date;
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 WITH accounts AS (
  SELECT u.id,u.created_at,coalesce(c.is_vip,false) AS vip,
   coalesce(c.is_blocked,false) OR coalesce(u.banned_until>statement_timestamp(),false) AS blocked,
   coalesce(lower(btrim(u.email)),'') AS normalized_email,
   coalesce(e.opted_in AND u.email_confirmed_at IS NOT NULL AND coalesce(btrim(u.email),'')<>'' AND e.email_fingerprint=private.marketing_email_fingerprint(u.email) AND e.verified_email_confirmed_at=u.email_confirmed_at,false) AS consent
  FROM auth.users u
  LEFT JOIN private.admin_customer_crm_profiles c ON c.user_id=u.id
  LEFT JOIN LATERAL (SELECT * FROM private.marketing_email_consent_events WHERE user_id=u.id ORDER BY sequence_id DESC LIMIT 1) e ON true
  WHERE u.id<>'1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
   AND coalesce(u.raw_app_meta_data->>'role','') NOT IN ('admin','staff')
   AND NOT EXISTS(SELECT 1 FROM public.admin_staff_members m WHERE m.user_id=u.id)
   AND coalesce(u.is_anonymous,false)=false
   AND u.deleted_at IS NULL
 ), activity AS (
  SELECT a.*,
   coalesce(o.completed,0) AS completed,o.last_day
  FROM accounts a
  LEFT JOIN LATERAL (
   SELECT count(*) AS completed,max((ord.created_at AT TIME ZONE 'Asia/Tbilisi')::date) AS last_day
   FROM public.orders ord
   WHERE ord.user_id=a.id AND lower(btrim(ord.status)) IN ('დასრულებული','ჩაბარებულია','completed','delivered','доставлен','завершён','завершен')
   AND ord.created_at IS NOT NULL AND ord.created_at<=statement_timestamp()
  ) o ON true
 ), address_counts AS (
  -- Count the full Auth address universe, including owner, staff and excluded
  -- accounts. An ambiguous address must never be a candidate.
  SELECT lower(btrim(email)) AS normalized_email,count(*) AS address_accounts
  FROM auth.users WHERE coalesce(btrim(email),'')<>''
  GROUP BY lower(btrim(email))
 ), dedup AS (
  SELECT a.*,coalesce(d.address_accounts,0) AS address_accounts
  FROM activity a LEFT JOIN address_counts d USING(normalized_email)
 ), classified AS (
 SELECT d.*,
  (NOT blocked AND consent AND address_accounts=1) AS consent_candidate,
  (created_at IS NOT NULL AND (created_at AT TIME ZONE 'Asia/Tbilisi')::date BETWEEN v_today-29 AND v_today AND created_at<=statement_timestamp()) AS recent_account,
  (completed>0 AND last_day<v_today-89) AS inactive
 FROM dedup d
 )
 SELECT jsonb_build_object('as_of',statement_timestamp(),'timezone','Asia/Tbilisi','new_days',30,'inactive_days',90,
 'segments',jsonb_object_agg(segment,jsonb_build_object('accounts',accounts::text,'consent_candidates',candidates::text)))
 INTO v_result FROM (SELECT g.segment,count(c.id) AS accounts,count(c.id) FILTER(WHERE c.consent_candidate) AS candidates
 FROM (VALUES ('all'),('vip'),('new'),('no_purchase'),('one_purchase'),('repeat'),('inactive')) g(segment)
 LEFT JOIN classified c ON CASE g.segment
  WHEN 'all' THEN true WHEN 'vip' THEN c.vip WHEN 'new' THEN c.recent_account WHEN 'no_purchase' THEN c.completed=0 WHEN 'one_purchase' THEN c.completed=1 WHEN 'repeat' THEN c.completed>=2 WHEN 'inactive' THEN c.inactive ELSE false END
 GROUP BY g.segment) results;
 RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION private.read_admin_marketing_templates(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 WITH latest AS (SELECT DISTINCT ON(template_id) * FROM private.marketing_template_versions WHERE p_id IS NULL OR template_id=p_id ORDER BY template_id,revision DESC)
 SELECT jsonb_build_object('total',(SELECT count(*)::text FROM latest),'templates',coalesce(jsonb_agg(private.marketing_template_json(v) ORDER BY v.recorded_at DESC,v.template_id),'[]'::jsonb)) INTO result
 FROM (SELECT * FROM latest ORDER BY recorded_at DESC,template_id LIMIT 100) v;
 RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION private.save_admin_marketing_campaign(p_id uuid, p_request uuid, p_revision bigint, p_operation text, p_name text, p_segment text, p_subject text, p_body text, p_planned_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_actor uuid:=auth.uid(); v_row private.marketing_campaigns%ROWTYPE; v_old private.marketing_campaign_revisions%ROWTYPE; v_payload jsonb; v_snapshot jsonb;
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

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
  IF NOT FOUND OR v_row.revision<>p_revision THEN RAISE EXCEPTION 'Campaign revision conflict' USING ERRCODE='PT409'; END IF;
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
$function$;

CREATE OR REPLACE FUNCTION private.save_admin_marketing_template(p_id uuid, p_request uuid, p_revision bigint, p_operation text, p_fields jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_actor uuid:=auth.uid(); v_old private.marketing_template_versions%ROWTYPE; v_new private.marketing_template_versions%ROWTYPE; v_fields jsonb;
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

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
$function$;
