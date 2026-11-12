begin;

-- Expose only the current status and latest message timestamp to a verified
-- ticket owner (or the fixed primary admin). This does not enumerate tickets.
create or replace function public.get_support_ticket_status(
  p_ticket_id text,
  p_access_token text default null
)
returns table(status text, created_at timestamptz, last_message_at timestamptz)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_ticket public.support_tickets%rowtype;
  v_is_admin boolean;
  v_is_customer boolean;
begin
  if coalesce(btrim(p_ticket_id), '') = '' then
    raise exception 'მხარდაჭერის მოთხოვნის ნომერი სავალდებულოა.';
  end if;

  select t.* into v_ticket
  from public.support_tickets as t
  where t.id = p_ticket_id;

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
      and v_ticket.access_token_hash =
        encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex')
    );

  if v_is_admin is not true and v_is_customer is not true then
    raise exception 'მიმართვის სტატუსის ნახვის უფლება არ გაქვთ.'
      using errcode = '42501';
  end if;

  return query
  select
    v_ticket.status::text,
    v_ticket.created_at,
    coalesce(
      (select max(m.created_at)
       from public.support_ticket_messages as m
       where m.ticket_ref = p_ticket_id),
      v_ticket.created_at
    );
end;
$function$;

revoke all on function public.get_support_ticket_status(text, text) from public;
grant execute on function public.get_support_ticket_status(text, text) to anon, authenticated;

commit;
