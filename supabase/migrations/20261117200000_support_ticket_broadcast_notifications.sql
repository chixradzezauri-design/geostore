begin;

-- Realtime Broadcast is a notification-only transport. Message bodies remain
-- private and are always fetched through the existing authorization-checked RPCs.
alter table realtime.messages enable row level security;

drop policy if exists "GEOSTORE admins receive support notifications" on realtime.messages;
create policy "GEOSTORE admins receive support notifications"
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and (select realtime.topic()) = 'geostore-support-admin'
  and coalesce((select auth.jwt())->'app_metadata'->>'role', '') = 'admin'
  and (select auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
);

drop policy if exists "GEOSTORE customers receive own support notifications" on realtime.messages;
create policy "GEOSTORE customers receive own support notifications"
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and (select realtime.topic()) = 'geostore-support-user:' || (select auth.uid())::text
);

-- Guest notifications use a public topic derived from the existing 256-bit
-- access-token digest. The topic is unguessable; the broadcast contains only
-- a ticket reference, never message text, email, sender name, or access token.
-- The ticket's actual conversation remains protected by get_support_ticket_messages.
create or replace function private.broadcast_support_ticket_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_access_token_hash text;
  v_customer_user_id uuid;
begin
  select t.access_token_hash, t.customer_user_id
    into v_access_token_hash, v_customer_user_id
  from public.support_tickets as t
  where t.id = new.ticket_ref;

  if not found then
    return new;
  end if;

  if coalesce(v_access_token_hash, '') ~ '^[a-f0-9]{64}$' then
    perform realtime.send(
      jsonb_build_object('ticket_id', new.ticket_ref),
      'support_message_changed',
      'geostore-support-ticket-' || v_access_token_hash,
      false
    );
  end if;

  if v_customer_user_id is not null then
    perform realtime.send(
      jsonb_build_object('ticket_id', new.ticket_ref),
      'support_message_changed',
      'geostore-support-user:' || v_customer_user_id::text,
      true
    );
  end if;

  perform realtime.send(
    jsonb_build_object('ticket_id', new.ticket_ref),
    'support_message_changed',
    'geostore-support-admin',
    true
  );

  return new;
end;
$function$;

revoke all on function private.broadcast_support_ticket_message()
  from public, anon, authenticated;

drop trigger if exists support_ticket_messages_broadcast_notify
  on public.support_ticket_messages;

create trigger support_ticket_messages_broadcast_notify
after insert on public.support_ticket_messages
for each row
execute function private.broadcast_support_ticket_message();

commit;
