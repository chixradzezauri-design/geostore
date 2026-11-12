begin;

-- Support ticket threads are part of the customer communication history.
-- No admin UI workflow deletes them; remove the unused direct-delete path too.
drop policy if exists "Admin can delete support tickets"
  on public.support_tickets;

revoke delete on table public.support_tickets from anon, authenticated;

commit;
