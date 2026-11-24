-- STAGED ONLY. Requires consent ledger, existing CRM, staff and order tables.
-- Counts only. No recipient addresses, exports, dispatch, tracking or automatic enrollment.
BEGIN;
CREATE FUNCTION private.read_admin_marketing_segments() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $segment$
DECLARE v_result jsonb; v_today date:=(statement_timestamp() AT TIME ZONE 'Asia/Tbilisi')::date;
BEGIN
 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 WITH accounts AS (
  SELECT u.id,u.created_at,coalesce(c.is_vip,false) AS vip,
   coalesce(c.is_blocked,false) OR coalesce(u.banned_until>statement_timestamp(),false) AS blocked,
   coalesce(lower(btrim(u.email)),'') AS normalized_email,
   coalesce(e.opted_in AND u.email_confirmed_at IS NOT NULL AND coalesce(btrim(u.email),'')<>'' AND e.email_fingerprint=private.marketing_email_fingerprint(u.email),false) AS consent
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
 ), dedup AS (
  SELECT a.*,count(*) OVER(PARTITION BY normalized_email) AS address_accounts
  FROM activity a
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
$segment$;
REVOKE ALL ON FUNCTION private.read_admin_marketing_segments() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_admin_marketing_segments() TO authenticated;
CREATE FUNCTION public.admin_marketing_segments() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $segment$
 SELECT private.read_admin_marketing_segments();
$segment$;
REVOKE ALL ON FUNCTION public.admin_marketing_segments() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketing_segments() TO authenticated;
COMMIT;
