begin;

-- Additive read receipts. Existing messages are preserved; historical read state
-- remains unknown (NULL) rather than being incorrectly marked as read.
alter table public.support_ticket_messages
  add column if not exists admin_read_at timestamptz,
  add column if not exists customer_read_at timestamptz;

create index if not exists support_ticket_messages_admin_unread_idx
  on public.support_ticket_messages (ticket_ref, created_at, id)
  where sender_role = 'customer' and admin_read_at is null;

create index if not exists support_ticket_messages_customer_unread_idx
  on public.support_ticket_messages (ticket_ref, created_at, id)
  where sender_role = 'admin' and customer_read_at is null;

create or replace function public.mark_support_ticket_messages_read(
  p_ticket_id text,
  p_access_token text default null
)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_ticket public.support_tickets%rowtype;
  v_is_admin boolean;
  v_is_customer boolean;
  v_updated integer := 0;
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
    raise exception 'მიმოწერის წაკითხვის უფლება არ გაქვთ.'
      using errcode = '42501';
  end if;

  if v_is_admin then
    update public.support_ticket_messages
    set admin_read_at = now()
    where ticket_ref = p_ticket_id
      and sender_role = 'customer'
      and admin_read_at is null;
  else
    update public.support_ticket_messages
    set customer_read_at = now()
    where ticket_ref = p_ticket_id
      and sender_role = 'admin'
      and customer_read_at is null;
  end if;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$function$;

revoke all on function public.mark_support_ticket_messages_read(text, text) from public;
grant execute on function public.mark_support_ticket_messages_read(text, text) to anon, authenticated;


-- Admin-only unread totals for the support inbox; no customer or guest can
-- enumerate other tickets or their unread activity.
create or replace function public.get_support_ticket_unread_counts()
returns table(ticket_id text, unread_count bigint)
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'მხარდაჭერის სტატისტიკის ნახვის უფლება არ გაქვთ.'
      using errcode = '42501';
  end if;

  return query
  select m.ticket_ref, count(*)::bigint
  from public.support_ticket_messages as m
  where m.sender_role = 'customer'
    and m.admin_read_at is null
  group by m.ticket_ref;
end;
$function$;

revoke all on function public.get_support_ticket_unread_counts() from public, anon;
grant execute on function public.get_support_ticket_unread_counts() to authenticated;

commit;
