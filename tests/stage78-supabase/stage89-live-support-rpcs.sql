-- Stage89: read-only effective Production function definitions, 2026-11-24.
-- TEST FIXTURE ONLY. No applied-history reconstruction, no live migration.
\set ON_ERROR_STOP on
GRANT USAGE ON SCHEMA private TO anon, authenticated;
CREATE OR REPLACE FUNCTION private.add_support_ticket_message_idempotent(p_ticket_id text, p_message text, p_access_token text, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ticket public.support_tickets%rowtype;
  v_existing public.support_ticket_messages%rowtype;
  v_is_admin boolean;
  v_is_customer boolean;
  v_message text := btrim(coalesce(p_message, ''));
  v_sender_role text;
  v_sender_name text;
  v_message_id bigint;
  v_created_at timestamptz;
  v_inserted boolean := false;
begin
  if p_request_id is null then
    raise exception 'შეტყობინების მოთხოვნის იდენტიფიკატორი სავალდებულოა.';
  end if;
  if coalesce(length(v_message), 0) not between 1 and 4000 then
    raise exception 'შეტყობინება უნდა შეიცავდეს 1-4000 სიმბოლოს.';
  end if;
  select t.* into v_ticket from public.support_tickets as t where t.id = p_ticket_id for update;
  if not found then raise exception 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.'; end if;
  v_is_admin := true
    and public.has_staff_permission('support');
  v_is_customer :=
    (v_ticket.customer_user_id is not null and auth.uid() = v_ticket.customer_user_id)
    or (auth.uid() is not null and v_ticket.email is not null
      and lower(v_ticket.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    or (coalesce(p_access_token, '') ~ '^[A-Fa-f0-9]{64}$'
      and v_ticket.access_token_hash is not null
      and v_ticket.access_token_hash = encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex'));
  if v_is_admin is not true and v_is_customer is not true then
    raise exception 'მიმოწერაში პასუხის დამატების უფლება არ გაქვთ.' using errcode = '42501';
  end if;
  v_sender_role := case when v_is_admin then 'admin' else 'customer' end;
  v_sender_name := case when v_is_admin then 'GEOSTORE' else v_ticket.customer_name end;
  insert into public.support_ticket_messages
    (ticket_id, ticket_ref, sender_role, sender_name, message, request_id)
  values (p_ticket_id, p_ticket_id, v_sender_role, v_sender_name, v_message, p_request_id)
  on conflict (request_id) where request_id is not null do nothing
  returning id, created_at into v_message_id, v_created_at;
  v_inserted := found;
  if not v_inserted then
    select m.* into v_existing from public.support_ticket_messages as m where m.request_id = p_request_id;
    if not found or v_existing.ticket_ref is distinct from p_ticket_id
      or v_existing.sender_role is distinct from v_sender_role
      or v_existing.message is distinct from v_message then
      raise exception 'ეს მოთხოვნის იდენტიფიკატორი უკვე გამოყენებულია სხვა შეტყობინებისთვის.';
    end if;
    v_message_id := v_existing.id;
    v_created_at := v_existing.created_at;
  else
    if v_is_admin then
      update public.support_tickets set reply = v_message, status = 'მუშავდება' where id = p_ticket_id;
    else
      update public.support_tickets set status = 'ღია' where id = p_ticket_id;
    end if;
  end if;
  return jsonb_build_object('message_id', v_message_id, 'ticket_id', p_ticket_id,
    'sender_role', v_sender_role, 'created_at', v_created_at, 'idempotent_replay', not v_inserted);
end;
$function$;
REVOKE ALL ON FUNCTION private.add_support_ticket_message_idempotent(text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.add_support_ticket_message_idempotent(text,text,text,uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.get_my_support_tickets_page(p_limit integer DEFAULT 50, p_before_last_message_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_before_ticket_id text DEFAULT NULL::text)
 RETURNS TABLE(ticket_id text, subject text, status text, created_at timestamp with time zone, last_message_at timestamp with time zone, unread_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'ავტორიზაცია აუცილებელია.' USING ERRCODE = '42501'; END IF;
  IF (p_before_last_message_at IS NULL) <> (p_before_ticket_id IS NULL) THEN
    RAISE EXCEPTION 'მხარდაჭერის ისტორიის გვერდის კურსორი არასწორია.';
  END IF;
  IF p_before_ticket_id IS NOT NULL AND p_before_ticket_id !~ '^t-[a-f0-9]{32}$' THEN
    RAISE EXCEPTION 'მხარდაჭერის ისტორიის გვერდის კურსორი არასწორია.';
  END IF;
  RETURN QUERY
  WITH ticket_activity AS (
    SELECT t.id AS ticket_id, coalesce(t.subject, '') AS subject, t.status::text AS status,
      t.created_at, coalesce(max(m.created_at), t.created_at) AS last_message_at,
      count(m.id) FILTER (WHERE m.sender_role = 'admin' AND m.customer_read_at IS NULL)::bigint AS unread_count
    FROM public.support_tickets AS t
    LEFT JOIN public.support_ticket_messages AS m ON m.ticket_ref = t.id
    WHERE t.customer_user_id = v_user_id
    GROUP BY t.id, t.subject, t.status, t.created_at
  )
  SELECT activity.ticket_id, activity.subject, activity.status, activity.created_at,
    activity.last_message_at, activity.unread_count
  FROM ticket_activity AS activity
  WHERE p_before_last_message_at IS NULL
     OR (activity.last_message_at, activity.ticket_id) < (p_before_last_message_at, p_before_ticket_id)
  ORDER BY activity.last_message_at DESC, activity.ticket_id DESC
  LIMIT v_limit;
END;
$function$;
REVOKE ALL ON FUNCTION private.get_my_support_tickets_page(integer,timestamp with time zone,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_my_support_tickets_page(integer,timestamp with time zone,text) TO authenticated;

CREATE OR REPLACE FUNCTION private.get_support_ticket_messages(p_ticket_id text, p_access_token text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, sender_role text, sender_name text, message text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_ticket public.support_tickets%rowtype;
  v_is_admin boolean;
  v_is_customer boolean;
BEGIN
  SELECT t.* INTO v_ticket FROM public.support_tickets AS t WHERE t.id = p_ticket_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.'; END IF;
  v_is_admin := true
    AND public.has_staff_permission('support');
  v_is_customer :=
    (v_ticket.customer_user_id IS NOT NULL AND auth.uid() = v_ticket.customer_user_id)
    OR (auth.uid() IS NOT NULL AND v_ticket.email IS NOT NULL
      AND lower(v_ticket.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    OR (coalesce(p_access_token, '') ~ '^[A-Fa-f0-9]{64}$'
      AND v_ticket.access_token_hash IS NOT NULL
      AND v_ticket.access_token_hash = encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex'));
  IF v_is_admin IS NOT TRUE AND v_is_customer IS NOT TRUE THEN
    RAISE EXCEPTION 'მიმოწერის ნახვის უფლება არ გაქვთ.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT m.id, m.sender_role, m.sender_name, m.message, m.created_at
    FROM public.support_ticket_messages AS m
    WHERE m.ticket_ref = p_ticket_id ORDER BY m.created_at, m.id;
END;
$function$;
REVOKE ALL ON FUNCTION private.get_support_ticket_messages(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_support_ticket_messages(text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.get_support_ticket_status(p_ticket_id text, p_access_token text DEFAULT NULL::text)
 RETURNS TABLE(status text, created_at timestamp with time zone, last_message_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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

  v_is_admin := public.has_staff_permission('support');

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
REVOKE ALL ON FUNCTION private.get_support_ticket_status(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_support_ticket_status(text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.mark_support_ticket_messages_read(p_ticket_id text, p_access_token text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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

  v_is_admin := public.has_staff_permission('support');

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
REVOKE ALL ON FUNCTION private.mark_support_ticket_messages_read(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.mark_support_ticket_messages_read(text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.add_support_ticket_message_idempotent(p_ticket_id text, p_message text, p_access_token text, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.add_support_ticket_message_idempotent(p_ticket_id, p_message, p_access_token, p_request_id);
$function$;
REVOKE ALL ON FUNCTION public.add_support_ticket_message_idempotent(text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_support_ticket_message_idempotent(text,text,text,uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_support_tickets_page(p_limit integer DEFAULT 50, p_before_last_message_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_before_ticket_id text DEFAULT NULL::text)
 RETURNS TABLE(ticket_id text, subject text, status text, created_at timestamp with time zone, last_message_at timestamp with time zone, unread_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT * FROM private.get_my_support_tickets_page(p_limit, p_before_last_message_at, p_before_ticket_id);
$function$;
REVOKE ALL ON FUNCTION public.get_my_support_tickets_page(integer,timestamp with time zone,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_support_tickets_page(integer,timestamp with time zone,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_support_ticket_messages(p_ticket_id text, p_access_token text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, sender_role text, sender_name text, message text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT * FROM private.get_support_ticket_messages(p_ticket_id, p_access_token);
$function$;
REVOKE ALL ON FUNCTION public.get_support_ticket_messages(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_support_ticket_messages(text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_support_ticket_status(p_ticket_id text, p_access_token text DEFAULT NULL::text)
 RETURNS TABLE(status text, created_at timestamp with time zone, last_message_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT * FROM private.get_support_ticket_status(p_ticket_id, p_access_token);
$function$;
REVOKE ALL ON FUNCTION public.get_support_ticket_status(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_support_ticket_status(text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_support_ticket_messages_read(p_ticket_id text, p_access_token text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT private.mark_support_ticket_messages_read(p_ticket_id, p_access_token);
$function$;
REVOKE ALL ON FUNCTION public.mark_support_ticket_messages_read(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_support_ticket_messages_read(text,text) TO anon, authenticated;
