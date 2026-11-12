begin;

-- Return only minimal metadata for tickets explicitly linked to this authenticated
-- account UUID. Do not include guest/email-matched legacy tickets or message text.
create or replace function public.get_my_support_tickets(p_limit integer default 50)
returns table(
  ticket_id text,
  subject text,
  status text,
  created_at timestamptz,
  last_message_at timestamptz,
  unread_count bigint
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
begin
  if v_user_id is null then
    raise exception 'ავტორიზაცია აუცილებელია.'
      using errcode = '42501';
  end if;

  return query
  select
    t.id,
    coalesce(t.subject, ''),
    t.status::text,
    t.created_at,
    coalesce(max(m.created_at), t.created_at),
    count(m.id) filter (
      where m.sender_role = 'admin' and m.customer_read_at is null
    )::bigint
  from public.support_tickets as t
  left join public.support_ticket_messages as m
    on m.ticket_ref = t.id
  where t.customer_user_id = v_user_id
  group by t.id, t.subject, t.status, t.created_at
  order by coalesce(max(m.created_at), t.created_at) desc, t.id desc
  limit v_limit;
end;
$function$;

revoke all on function public.get_my_support_tickets(integer) from public, anon;
grant execute on function public.get_my_support_tickets(integer) to authenticated;

commit;
