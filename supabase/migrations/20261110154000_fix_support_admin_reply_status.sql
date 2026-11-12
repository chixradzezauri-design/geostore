begin;

-- An admin reply means the support request is being handled, not resolved.
-- Keep the existing auth checks, idempotency behavior and guest-token access.
create or replace function private.add_support_ticket_message_idempotent(
  p_ticket_id text,
  p_message text,
  p_access_token text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
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

  select t.* into v_ticket
  from public.support_tickets as t
  where t.id = p_ticket_id
  for update;

  if not found then
    raise exception 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.';
  end if;

  v_is_admin :=
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    and auth.uid() = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid;

  v_is_customer :=
    (v_ticket.customer_user_id is not null and auth.uid() = v_ticket.customer_user_id)
    or (
      auth.uid() is not null
      and v_ticket.email is not null
      and lower(v_ticket.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    or (
      coalesce(p_access_token, '') ~ '^[A-Fa-f0-9]{64}$'
      and v_ticket.access_token_hash is not null
      and v_ticket.access_token_hash = encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex')
    );

  if v_is_admin is not true and v_is_customer is not true then
    raise exception 'მიმოწერაში პასუხის დამატების უფლება არ გაქვთ.'
      using errcode = '42501';
  end if;

  v_sender_role := case when v_is_admin then 'admin' else 'customer' end;
  v_sender_name := case when v_is_admin then 'GEOSTORE' else v_ticket.customer_name end;

  insert into public.support_ticket_messages
    (ticket_id, ticket_ref, sender_role, sender_name, message, request_id)
  values
    (p_ticket_id, p_ticket_id, v_sender_role, v_sender_name, v_message, p_request_id)
  on conflict (request_id) where request_id is not null do nothing
  returning id, created_at into v_message_id, v_created_at;

  v_inserted := found;

  if not v_inserted then
    select m.* into v_existing
    from public.support_ticket_messages as m
    where m.request_id = p_request_id;

    if not found
      or v_existing.ticket_ref is distinct from p_ticket_id
      or v_existing.sender_role is distinct from v_sender_role
      or v_existing.message is distinct from v_message then
      raise exception 'ეს მოთხოვნის იდენტიფიკატორი უკვე გამოყენებულია სხვა შეტყობინებისთვის.';
    end if;

    v_message_id := v_existing.id;
    v_created_at := v_existing.created_at;
  else
    if v_is_admin then
      update public.support_tickets
      set reply = v_message, status = 'მუშავდება'
      where id = p_ticket_id;
    else
      update public.support_tickets
      set status = 'ღია'
      where id = p_ticket_id;
    end if;
  end if;

  return jsonb_build_object(
    'message_id', v_message_id,
    'ticket_id', p_ticket_id,
    'sender_role', v_sender_role,
    'created_at', v_created_at,
    'idempotent_replay', not v_inserted
  );
end;
$function$;


-- Harden legacy ticket RPCs too: older clients still call these wrappers.
-- IS NOT TRUE denies NULL authorization results from SQL three-valued logic.
CREATE OR REPLACE FUNCTION private.get_support_ticket_messages(
  p_ticket_id text,
  p_access_token text DEFAULT NULL::text
)
RETURNS TABLE(id bigint, sender_role text, sender_name text, message text, created_at timestamptz)
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

  v_is_admin :=
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    AND auth.uid() = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid;
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

  RETURN QUERY
  SELECT m.id, m.sender_role, m.sender_name, m.message, m.created_at
  FROM public.support_ticket_messages AS m
  WHERE m.ticket_ref = p_ticket_id
  ORDER BY m.created_at, m.id;
END;
$function$;

CREATE OR REPLACE FUNCTION private.add_support_ticket_message(
  p_ticket_id text,
  p_message text,
  p_access_token text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_ticket public.support_tickets%rowtype;
  v_is_admin boolean;
  v_is_customer boolean;
  v_message text := btrim(coalesce(p_message, ''));
  v_sender_role text;
  v_sender_name text;
  v_message_id bigint;
  v_created_at timestamptz;
BEGIN
  IF coalesce(length(v_message), 0) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'შეტყობინება უნდა შეიცავდეს 1-4000 სიმბოლოს.';
  END IF;

  SELECT t.* INTO v_ticket
  FROM public.support_tickets AS t
  WHERE t.id = p_ticket_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.'; END IF;

  v_is_admin :=
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    AND auth.uid() = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid;
  v_is_customer :=
    (v_ticket.customer_user_id IS NOT NULL AND auth.uid() = v_ticket.customer_user_id)
    OR (auth.uid() IS NOT NULL AND v_ticket.email IS NOT NULL
      AND lower(v_ticket.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    OR (coalesce(p_access_token, '') ~ '^[A-Fa-f0-9]{64}$'
      AND v_ticket.access_token_hash IS NOT NULL
      AND v_ticket.access_token_hash = encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex'));

  IF v_is_admin IS NOT TRUE AND v_is_customer IS NOT TRUE THEN
    RAISE EXCEPTION 'მიმოწერაში პასუხის დამატების უფლება არ გაქვთ.' USING ERRCODE = '42501';
  END IF;

  v_sender_role := CASE WHEN v_is_admin IS TRUE THEN 'admin' ELSE 'customer' END;
  v_sender_name := CASE WHEN v_is_admin IS TRUE THEN 'GEOSTORE' ELSE v_ticket.customer_name END;

  INSERT INTO public.support_ticket_messages(ticket_id, ticket_ref, sender_role, sender_name, message)
  VALUES (p_ticket_id, p_ticket_id, v_sender_role, v_sender_name, v_message)
  RETURNING id, created_at INTO v_message_id, v_created_at;

  IF v_is_admin IS TRUE THEN
    UPDATE public.support_tickets SET reply = v_message, status = 'მუშავდება' WHERE id = p_ticket_id;
  ELSE
    UPDATE public.support_tickets SET status = 'ღია' WHERE id = p_ticket_id;
  END IF;

  RETURN jsonb_build_object(
    'message_id', v_message_id,
    'ticket_id', p_ticket_id,
    'sender_role', v_sender_role,
    'created_at', v_created_at
  );
END;
$function$;

create or replace function public.add_support_ticket_message_idempotent(
  p_ticket_id text,
  p_message text,
  p_access_token text,
  p_request_id uuid
)
returns jsonb
language sql
set search_path to ''
as $function$
  select private.add_support_ticket_message_idempotent(
    p_ticket_id, p_message, p_access_token, p_request_id
  );
$function$;

revoke all on function private.add_support_ticket_message_idempotent(text, text, text, uuid) from public;
grant execute on function private.add_support_ticket_message_idempotent(text, text, text, uuid) to anon, authenticated;
revoke all on function public.add_support_ticket_message_idempotent(text, text, text, uuid) from public;
grant execute on function public.add_support_ticket_message_idempotent(text, text, text, uuid) to anon, authenticated;

commit;
