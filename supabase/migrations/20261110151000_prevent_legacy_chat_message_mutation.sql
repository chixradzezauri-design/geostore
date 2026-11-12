begin;

-- Legacy customer chat messages are retained as historical records.
-- The current admin panel only reads this table; it has no edit/delete workflow.
drop policy if exists "Admin can delete chat messages" on public.messages;
drop policy if exists "Admin can update chat messages" on public.messages;

revoke update, delete on table public.messages from anon, authenticated;

commit;
