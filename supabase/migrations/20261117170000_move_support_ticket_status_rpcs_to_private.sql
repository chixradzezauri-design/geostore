-- Stage 56: keep privileged support-ticket implementations outside the exposed API schema.
-- Public RPC names and argument/return contracts remain unchanged; only the
-- SECURITY DEFINER implementation moves to private, behind SECURITY INVOKER wrappers.

BEGIN;

CREATE OR REPLACE FUNCTION private.get_my_support_tickets(p_limit integer DEFAULT 50)
RETURNS TABLE(
  ticket_id text,
  subject text,
  status text,
  created_at timestamptz,
  last_message_at timestamptz,
  unread_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ავტორიზაცია აუცილებელია.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    coalesce(t.subject, ''),
    t.status::text,
    t.created_at,
    coalesce(max(m.created_at), t.created_at),
    count(m.id) FILTER (
      WHERE m.sender_role = 'admin' AND m.customer_read_at IS NULL
    )::bigint
  FROM public.support_tickets AS t
  LEFT JOIN public.support_ticket_messages AS m ON m.ticket_ref = t.id
  WHERE t.customer_user_id = v_user_id
  GROUP BY t.id, t.subject, t.status, t.created_at
  ORDER BY coalesce(max(m.created_at), t.created_at) DESC, t.id DESC
  LIMIT v_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION private.get_support_ticket_status(
  p_ticket_id text,
  p_access_token text DEFAULT NULL::text
)
RETURNS TABLE(
  status text,
  created_at timestamptz,
  last_message_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_ticket public.support_tickets%rowtype;
  v_is_admin boolean;
  v_is_customer boolean;
BEGIN
  IF coalesce(btrim(p_ticket_id), '') = '' THEN
    RAISE EXCEPTION 'მხარდაჭერის მოთხოვნის ნომერი სავალდებულოა.';
  END IF;

  SELECT t.* INTO v_ticket
  FROM public.support_tickets AS t
  WHERE t.id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.';
  END IF;

  v_is_admin :=
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    AND auth.uid() = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid;

  v_is_customer :=
    (v_ticket.customer_user_id IS NOT NULL AND auth.uid() = v_ticket.customer_user_id)
    OR (
      auth.uid() IS NOT NULL
      AND v_ticket.email IS NOT NULL
      AND lower(v_ticket.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    OR (
      coalesce(p_access_token, '') ~ '^[A-Fa-f0-9]{64}$'
      AND v_ticket.access_token_hash IS NOT NULL
      AND v_ticket.access_token_hash =
        encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex')
    );

  IF v_is_admin IS NOT TRUE AND v_is_customer IS NOT TRUE THEN
    RAISE EXCEPTION 'მიმართვის სტატუსის ნახვის უფლება არ გაქვთ.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    v_ticket.status::text,
    v_ticket.created_at,
    coalesce(
      (SELECT max(m.created_at)
       FROM public.support_ticket_messages AS m
       WHERE m.ticket_ref = p_ticket_id),
      v_ticket.created_at
    );
END;
$function$;

CREATE OR REPLACE FUNCTION private.get_support_ticket_unread_counts()
RETURNS TABLE(ticket_id text, unread_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    RAISE EXCEPTION 'მხარდაჭერის სტატისტიკის ნახვის უფლება არ გაქვთ.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT m.ticket_ref, count(*)::bigint
  FROM public.support_ticket_messages AS m
  WHERE m.sender_role = 'customer'
    AND m.admin_read_at IS NULL
  GROUP BY m.ticket_ref;
END;
$function$;

CREATE OR REPLACE FUNCTION private.mark_support_ticket_messages_read(
  p_ticket_id text,
  p_access_token text DEFAULT NULL::text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_ticket public.support_tickets%rowtype;
  v_is_admin boolean;
  v_is_customer boolean;
  v_updated integer := 0;
BEGIN
  IF coalesce(btrim(p_ticket_id), '') = '' THEN
    RAISE EXCEPTION 'მხარდაჭერის მოთხოვნის ნომერი სავალდებულოა.';
  END IF;

  SELECT t.* INTO v_ticket
  FROM public.support_tickets AS t
  WHERE t.id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.';
  END IF;

  v_is_admin :=
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    AND auth.uid() = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid;

  v_is_customer :=
    (v_ticket.customer_user_id IS NOT NULL AND auth.uid() = v_ticket.customer_user_id)
    OR (
      auth.uid() IS NOT NULL
      AND v_ticket.email IS NOT NULL
      AND lower(v_ticket.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    OR (
      coalesce(p_access_token, '') ~ '^[A-Fa-f0-9]{64}$'
      AND v_ticket.access_token_hash IS NOT NULL
      AND v_ticket.access_token_hash =
        encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex')
    );

  IF v_is_admin IS NOT TRUE AND v_is_customer IS NOT TRUE THEN
    RAISE EXCEPTION 'მიმოწერის წაკითხვის უფლება არ გაქვთ.'
      USING ERRCODE = '42501';
  END IF;

  IF v_is_admin THEN
    UPDATE public.support_ticket_messages
    SET admin_read_at = now()
    WHERE ticket_ref = p_ticket_id
      AND sender_role = 'customer'
      AND admin_read_at IS NULL;
  ELSE
    UPDATE public.support_ticket_messages
    SET customer_read_at = now()
    WHERE ticket_ref = p_ticket_id
      AND sender_role = 'admin'
      AND customer_read_at IS NULL;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;

REVOKE ALL ON FUNCTION private.get_my_support_tickets(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.get_support_ticket_status(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.get_support_ticket_unread_counts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.mark_support_ticket_messages_read(text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.get_my_support_tickets(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_support_ticket_status(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_support_ticket_unread_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION private.mark_support_ticket_messages_read(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_support_tickets(p_limit integer DEFAULT 50)
RETURNS TABLE(
  ticket_id text,
  subject text,
  status text,
  created_at timestamptz,
  last_message_at timestamptz,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT * FROM private.get_my_support_tickets(p_limit);
$function$;

CREATE OR REPLACE FUNCTION public.get_support_ticket_status(
  p_ticket_id text,
  p_access_token text DEFAULT NULL::text
)
RETURNS TABLE(
  status text,
  created_at timestamptz,
  last_message_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT * FROM private.get_support_ticket_status(p_ticket_id, p_access_token);
$function$;

CREATE OR REPLACE FUNCTION public.get_support_ticket_unread_counts()
RETURNS TABLE(ticket_id text, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT * FROM private.get_support_ticket_unread_counts();
$function$;

CREATE OR REPLACE FUNCTION public.mark_support_ticket_messages_read(
  p_ticket_id text,
  p_access_token text DEFAULT NULL::text
)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.mark_support_ticket_messages_read(p_ticket_id, p_access_token);
$function$;

REVOKE ALL ON FUNCTION public.get_my_support_tickets(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_support_ticket_status(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_support_ticket_unread_counts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_support_ticket_messages_read(text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_support_tickets(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_support_ticket_status(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_support_ticket_unread_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_support_ticket_messages_read(text, text) TO anon, authenticated;

COMMIT;
