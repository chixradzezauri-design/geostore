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
      RAISE SQLSTATE 'PGRST'
        USING MESSAGE = json_build_object('message','Support submission is temporarily unavailable.')::text,
              DETAIL = json_build_object('status',503,'status_text','Service Unavailable')::text;
    END;
    v_ip_hash := encode(extensions.digest(convert_to(v_ip::text, 'UTF8'), 'sha256'), 'hex');
  ELSIF auth.uid() IS NOT NULL THEN
    v_ip_hash := encode(extensions.digest(convert_to('user:' || auth.uid()::text, 'UTF8'), 'sha256'), 'hex');
  ELSE
    RAISE SQLSTATE 'PGRST'
      USING MESSAGE = json_build_object('message','Support submission is temporarily unavailable.')::text,
            DETAIL = json_build_object('status',503,'status_text','Service Unavailable')::text;
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
    RAISE SQLSTATE 'PGRST'
      USING MESSAGE = json_build_object('message','Too many support requests. Please try again later.')::text,
            DETAIL = json_build_object('status',429,'status_text','Too Many Requests')::text;
  END IF;

  IF v_email_hash IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('support-email:' || v_email_hash, 0));

    SELECT count(*)::integer INTO v_recent_email_count
    FROM private.support_intake_rate_limits
    WHERE email_hash = v_email_hash
      AND created_at > now() - interval '60 minutes';

    IF v_recent_email_count >= 3 THEN
      RAISE SQLSTATE 'PGRST'
        USING MESSAGE = json_build_object('message','Too many support requests for this email. Please try again later.')::text,
              DETAIL = json_build_object('status',429,'status_text','Too Many Requests')::text;
    END IF;
  END IF;

  DELETE FROM private.support_intake_rate_limits
  WHERE created_at < now() - interval '24 hours';

  INSERT INTO private.support_intake_rate_limits (ip_hash, email_hash)
  VALUES (v_ip_hash, v_email_hash);

  RETURN NEW;
END;
$function$;

CREATE INDEX IF NOT EXISTS support_intake_rate_limits_created_at_idx
  ON private.support_intake_rate_limits (created_at);
