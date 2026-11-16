begin;

-- Cursor-based pages avoid silently hiding account-linked requests after the
-- first 50. The cursor is ordered by latest message time and ticket ID, so ties
-- have a deterministic boundary. Ownership remains bound to auth.uid().
create or replace function public.get_my_support_tickets_page(
  p_limit integer default 50,
  p_before_last_message_at timestamptz default null,
  p_before_ticket_id text default null
)
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
    raise exception 'ავტორიზაცია აუცილებელია.' using errcode = '42501';
  end if;

  if (p_before_last_message_at is null) <> (p_before_ticket_id is null) then
    raise exception 'მხარდაჭერის ისტორიის გვერდის კურსორი არასწორია.';
  end if;

  if p_before_ticket_id is not null
     and p_before_ticket_id !~ '^t-[a-f0-9]{32}$' then
    raise exception 'მხარდაჭერის ისტორიის გვერდის კურსორი არასწორია.';
  end if;

  return query
  with ticket_activity as (
    select
      t.id as ticket_id,
      coalesce(t.subject, '') as subject,
      t.status::text as status,
      t.created_at,
      coalesce(max(m.created_at), t.created_at) as last_message_at,
      count(m.id) filter (
        where m.sender_role = 'admin' and m.customer_read_at is null
      )::bigint as unread_count
    from public.support_tickets as t
    left join public.support_ticket_messages as m on m.ticket_ref = t.id
    where t.customer_user_id = v_user_id
    group by t.id, t.subject, t.status, t.created_at
  )
  select
    activity.ticket_id,
    activity.subject,
    activity.status,
    activity.created_at,
    activity.last_message_at,
    activity.unread_count
  from ticket_activity as activity
  where p_before_last_message_at is null
     or (activity.last_message_at, activity.ticket_id)
        < (p_before_last_message_at, p_before_ticket_id)
  order by activity.last_message_at desc, activity.ticket_id desc
  limit v_limit;
end;
$function$;

revoke all on function public.get_my_support_tickets_page(integer, timestamptz, text)
  from public, anon;
grant execute on function public.get_my_support_tickets_page(integer, timestamptz, text)
  to authenticated;

commit;
