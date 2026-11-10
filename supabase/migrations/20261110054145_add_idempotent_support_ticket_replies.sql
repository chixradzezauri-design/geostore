-- GEOSTORE: idempotent support replies. Existing messages remain untouched.
ALTER TABLE public.support_ticket_messages
  ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS support_ticket_messages_request_id_uidx
  ON public.support_ticket_messages(request_id)
  WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.add_support_ticket_message_idempotent(
  p_ticket_id text,
  p_message text,
  p_access_token text,
  p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
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
BEGIN
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'შეტყობინების მოთხოვნის იდენტიფიკატორი სავალდებულოა.';
  END IF;
  IF coalesce(length(v_message), 0) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'შეტყობინება უნდა შეიცავდეს 1-4000 სიმბოლოს.';
  END IF;

  SELECT t.* INTO v_ticket
  FROM public.support_tickets AS t
  WHERE t.id = p_ticket_id
  FOR UPDATE;
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
      AND v_ticket.access_token_hash = encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex')
    );

  IF NOT (v_is_admin OR v_is_customer) THEN
    RAISE EXCEPTION 'მიმოწერაში პასუხის დამატების უფლება არ გაქვთ.' USING ERRCODE = '42501';
  END IF;

  v_sender_role := CASE WHEN v_is_admin THEN 'admin' ELSE 'customer' END;
  v_sender_name := CASE WHEN v_is_admin THEN 'GEOSTORE' ELSE v_ticket.customer_name END;

  INSERT INTO public.support_ticket_messages
    (ticket_id, ticket_ref, sender_role, sender_name, message, request_id)
  VALUES
    (p_ticket_id, p_ticket_id, v_sender_role, v_sender_name, v_message, p_request_id)
  ON CONFLICT (request_id) WHERE request_id IS NOT NULL DO NOTHING
  RETURNING id, created_at INTO v_message_id, v_created_at;

  v_inserted := FOUND;

  IF NOT v_inserted THEN
    SELECT m.* INTO v_existing
    FROM public.support_ticket_messages AS m
    WHERE m.request_id = p_request_id;

    IF NOT FOUND
      OR v_existing.ticket_ref IS DISTINCT FROM p_ticket_id
      OR v_existing.sender_role IS DISTINCT FROM v_sender_role
      OR v_existing.message IS DISTINCT FROM v_message THEN
      RAISE EXCEPTION 'ეს მოთხოვნის იდენტიფიკატორი უკვე გამოყენებულია სხვა შეტყობინებისთვის.';
    END IF;

    v_message_id := v_existing.id;
    v_created_at := v_existing.created_at;
  ELSE
    IF v_is_admin THEN
      UPDATE public.support_tickets
      SET reply = v_message, status = 'მოგვარებული'
      WHERE id = p_ticket_id;
    ELSE
      UPDATE public.support_tickets
      SET status = 'ღია'
      WHERE id = p_ticket_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'message_id', v_message_id,
    'ticket_id', p_ticket_id,
    'sender_role', v_sender_role,
    'created_at', v_created_at,
    'idempotent_replay', NOT v_inserted
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.add_support_ticket_message_idempotent(text,text,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.add_support_ticket_message_idempotent(text,text,text,uuid)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.add_support_ticket_message_idempotent(
  p_ticket_id text,
  p_message text,
  p_access_token text,
  p_request_id uuid
) RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.add_support_ticket_message_idempotent(
    p_ticket_id, p_message, p_access_token, p_request_id
  );
$function$;

REVOKE ALL ON FUNCTION public.add_support_ticket_message_idempotent(text,text,text,uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_support_ticket_message_idempotent(text,text,text,uuid)
  TO anon, authenticated;
