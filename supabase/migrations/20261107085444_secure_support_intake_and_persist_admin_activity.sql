-- Server-side support intake rate limiting and durable primary-admin audit trail.
-- Private tables are never exposed through the Supabase Data API.

CREATE TABLE IF NOT EXISTS private.support_intake_rate_limits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash text NOT NULL,
  email_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_intake_rate_limits_ip_created_idx
  ON private.support_intake_rate_limits (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS support_intake_rate_limits_email_created_idx
  ON private.support_intake_rate_limits (email_hash, created_at DESC)
  WHERE email_hash IS NOT NULL;

ALTER TABLE private.support_intake_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.support_intake_rate_limits FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.enforce_support_ticket_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_headers jsonb;
  v_ip_text text;
  v_ip inet;
  v_ip_hash text;
  v_email_hash text;
  v_recent_ip_count integer;
  v_recent_email_count integer;
BEGIN
  IF auth.uid() = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     AND auth.jwt()->'app_metadata'->>'role' = 'admin' THEN
    RETURN NEW;
  END IF;

  v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_ip_text := nullif(btrim(split_part(
    coalesce(v_headers->>'x-forwarded-for', v_headers->>'x-real-ip', v_headers->>'cf-connecting-ip', ''),
    ',', 1
  )), '');

  IF v_ip_text IS NOT NULL THEN
    BEGIN
      v_ip := v_ip_text::inet;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'მხარდაჭერის მოთხოვნა დროებით მიუწვდომელია. სცადეთ მოგვიანებით.';
    END;
    v_ip_hash := encode(extensions.digest(convert_to(v_ip::text, 'UTF8'), 'sha256'), 'hex');
  ELSIF auth.uid() IS NOT NULL THEN
    v_ip_hash := encode(extensions.digest(convert_to('user:' || auth.uid()::text, 'UTF8'), 'sha256'), 'hex');
  ELSE
    RAISE EXCEPTION 'მხარდაჭერის მოთხოვნა დროებით მიუწვდომელია. სცადეთ მოგვიანებით.';
  END IF;

  v_email_hash := CASE
    WHEN nullif(lower(btrim(coalesce(NEW.email, ''))), '') IS NULL THEN NULL
    ELSE encode(extensions.digest(convert_to(lower(btrim(NEW.email)), 'UTF8'), 'sha256'), 'hex')
  END;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('support-ip:' || v_ip_hash, 0));

  SELECT count(*)::integer INTO v_recent_ip_count
  FROM private.support_intake_rate_limits
  WHERE ip_hash = v_ip_hash
    AND created_at > now() - interval '15 minutes';

  IF v_recent_ip_count >= 5 THEN
    RAISE EXCEPTION 'ძალიან ბევრი მოთხოვნა გაიგზავნა. სცადეთ ხელახლა 15 წუთის შემდეგ.';
  END IF;

  IF v_email_hash IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('support-email:' || v_email_hash, 0));

    SELECT count(*)::integer INTO v_recent_email_count
    FROM private.support_intake_rate_limits
    WHERE email_hash = v_email_hash
      AND created_at > now() - interval '60 minutes';

    IF v_recent_email_count >= 3 THEN
      RAISE EXCEPTION 'ამ ელფოსტიდან მოთხოვნების ლიმიტი ამოიწურა. სცადეთ მოგვიანებით.';
    END IF;
  END IF;

  DELETE FROM private.support_intake_rate_limits
  WHERE created_at < now() - interval '24 hours';

  INSERT INTO private.support_intake_rate_limits (ip_hash, email_hash)
  VALUES (v_ip_hash, v_email_hash);

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_support_ticket_rate_limit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS support_tickets_rate_limit_before_insert ON public.support_tickets;
CREATE TRIGGER support_tickets_rate_limit_before_insert
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION private.enforce_support_ticket_rate_limit();

CREATE TABLE IF NOT EXISTS private.admin_activity_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK (char_length(btrim(action)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_activity_log_created_at_idx
  ON private.admin_activity_log (created_at DESC, id DESC);

ALTER TABLE private.admin_activity_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.admin_activity_log FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.write_admin_activity_log(p_action text)
RETURNS TABLE(id bigint, action text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_action text := btrim(coalesce(p_action, ''));
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR auth.jwt()->'app_metadata'->>'role' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_action) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'აქტივობის ჩანაწერი უნდა იყოს 1-500 სიმბოლო.';
  END IF;

  RETURN QUERY
  INSERT INTO private.admin_activity_log (actor_id, action)
  VALUES (auth.uid(), v_action)
  RETURNING private.admin_activity_log.id, private.admin_activity_log.action, private.admin_activity_log.created_at;
END;
$function$;

CREATE OR REPLACE FUNCTION private.list_admin_activity_logs(p_limit integer DEFAULT 100)
RETURNS TABLE(id bigint, action text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR auth.jwt()->'app_metadata'->>'role' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT l.id, l.action, l.created_at
  FROM private.admin_activity_log AS l
  ORDER BY l.created_at DESC, l.id DESC
  LIMIT greatest(1, least(coalesce(p_limit, 100), 200));
END;
$function$;

REVOKE ALL ON FUNCTION private.write_admin_activity_log(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.list_admin_activity_logs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.write_admin_activity_log(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.list_admin_activity_logs(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.write_admin_activity_log(p_action text)
RETURNS TABLE(id bigint, action text, created_at timestamptz)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT * FROM private.write_admin_activity_log(p_action);
$function$;

CREATE OR REPLACE FUNCTION public.list_admin_activity_logs(p_limit integer DEFAULT 100)
RETURNS TABLE(id bigint, action text, created_at timestamptz)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT * FROM private.list_admin_activity_logs(p_limit);
$function$;

REVOKE ALL ON FUNCTION public.write_admin_activity_log(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_admin_activity_logs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_admin_activity_log(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_activity_logs(integer) TO authenticated;
