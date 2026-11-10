-- GEOSTORE: make support ticket creation safe to retry after network timeouts.
-- Existing tickets and their messages are preserved.
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_request_id_uidx
  ON public.support_tickets(request_id)
  WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.create_support_ticket_idempotent(
  p_id text,
  p_customer_name text,
  p_email text,
  p_subject text,
  p_message text,
  p_access_token text,
  p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_existing public.support_tickets%rowtype;
  v_created_at timestamptz;
  v_name text := btrim(coalesce(p_customer_name, ''));
  v_message text := btrim(coalesce(p_message, ''));
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_subject text := nullif(btrim(coalesce(p_subject, '')), '');
  v_access_token_hash text;
BEGIN
  IF p_request_id IS NULL
     OR coalesce(length(btrim(p_id)), 0) NOT BETWEEN 6 AND 64
     OR p_id !~ '^[A-Za-z0-9_-]{6,64}$'
     OR coalesce(length(v_name), 0) NOT BETWEEN 2 AND 100
     OR coalesce(length(v_message), 0) NOT BETWEEN 1 AND 4000
     OR coalesce(length(v_email), 0) > 254
     OR coalesce(length(v_subject), 0) > 150
     OR coalesce(p_access_token, '') !~ '^[A-Fa-f0-9]{64}$' THEN
    RAISE EXCEPTION 'მხარდაჭერის მოთხოვნის მონაცემები არასწორია.';
  END IF;

  v_access_token_hash := encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex');

  -- Serialize retries that carry the same request key. This also ensures
  -- the rate-limit trigger runs only for the first actual ticket insertion.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('support-ticket-create:' || p_request_id::text, 0)
  );

  SELECT t.* INTO v_existing
  FROM public.support_tickets AS t
  WHERE t.request_id = p_request_id;

  IF FOUND THEN
    IF v_existing.id IS DISTINCT FROM p_id
       OR v_existing.customer_name IS DISTINCT FROM v_name
       OR v_existing.email IS DISTINCT FROM v_email
       OR v_existing.subject IS DISTINCT FROM v_subject
       OR v_existing.message IS DISTINCT FROM v_message
       OR v_existing.access_token_hash IS DISTINCT FROM v_access_token_hash
       OR v_existing.customer_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'ეს მოთხოვნის იდენტიფიკატორი უკვე გამოყენებულია სხვა მიმართვისთვის.';
    END IF;

    RETURN jsonb_build_object(
      'ticket_id', v_existing.id,
      'status', v_existing.status,
      'created_at', v_existing.created_at,
      'idempotent_replay', true
    );
  END IF;

  INSERT INTO public.support_tickets
    (id, customer_name, email, subject, message, status, reply, created_at,
     customer_user_id, access_token_hash, request_id)
  VALUES
    (p_id, v_name, v_email, v_subject, v_message, 'ღია', NULL, now(),
     auth.uid(), v_access_token_hash, p_request_id)
  RETURNING created_at INTO v_created_at;

  INSERT INTO public.support_ticket_messages
    (ticket_id, ticket_ref, sender_role, sender_name, message, created_at)
  VALUES
    (p_id, p_id, 'customer', v_name, v_message, v_created_at);

  RETURN jsonb_build_object(
    'ticket_id', p_id,
    'status', 'ღია',
    'created_at', v_created_at,
    'idempotent_replay', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.create_support_ticket_idempotent(text,text,text,text,text,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.create_support_ticket_idempotent(text,text,text,text,text,text,uuid)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_support_ticket_idempotent(
  p_id text,
  p_customer_name text,
  p_email text,
  p_subject text,
  p_message text,
  p_access_token text,
  p_request_id uuid
) RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.create_support_ticket_idempotent(
    p_id, p_customer_name, p_email, p_subject, p_message, p_access_token, p_request_id
  );
$function$;

REVOKE ALL ON FUNCTION public.create_support_ticket_idempotent(text,text,text,text,text,text,uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_support_ticket_idempotent(text,text,text,text,text,text,uuid)
  TO anon, authenticated;