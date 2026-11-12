# GEOSTORE customer/admin messaging audit — 2026-11-12

## Scope and method

Read-only inspection of the connected Production Supabase project and the staged audit branch `fix/admin-panel-audit-2026-11-10`. No Production rows, policies, grants, functions, migrations, Storage objects, or deployments were changed. No test messages were submitted.

## Production facts verified

- Existing data remains present: `public.messages` has 14 rows, `public.support_tickets` has 3 rows, and `public.support_ticket_messages` has 5 rows. Counts only; message contents and customer details were not exported.
- RLS is enabled on all three tables.
- The three tables are included in `supabase_realtime`.
- Customer ticket creation is routed through the idempotent RPC; direct anon/authenticated INSERT is not granted on the support tables.
- Legacy `messages` is read by the admin panel; no legacy update/delete UI workflow was found.
- Production still grants `authenticated` UPDATE and DELETE on `public.messages`, with admin update/delete policies. This is broader than the current read-only admin UI needs.
- Production still grants `authenticated` DELETE on `public.support_tickets` and has an admin delete policy. The UI has no ticket-delete workflow; status updates remain needed.
- Production's deployed `private.get_support_ticket_messages`, `private.add_support_ticket_message`, and `private.add_support_ticket_message_idempotent` use the NULL-permissive condition `IF NOT (v_is_admin OR v_is_customer)`. In SQL three-valued logic this can fail open when customer authorization evaluates to NULL. The deployed idempotent admin-reply path also sets the ticket status to `მოგვარებული` instead of keeping it `მუშავდება`.

## Staged corrections already present in this branch

- `20261110151000_prevent_legacy_chat_message_mutation.sql`: drops unused legacy message UPDATE/DELETE policies and revokes direct UPDATE/DELETE from anon/authenticated.
- `20261110152001_prevent_support_ticket_deletion.sql`: removes the unused support-ticket DELETE policy and revokes DELETE while preserving ticket status updates.
- `20261110153000_support_ticket_read_receipts.sql`: additive read receipts; historical NULL read state is retained.
- `20261110154000_fix_support_admin_reply_status.sql`: hardens current and legacy support RPC authorization with explicit `IS NOT TRUE` checks and keeps admin replies in `მუშავდება`.
- `20261110155000_support_ticket_attachments.sql`: attachment-aware support messaging, private bucket and scoped RPCs; deployment remains separate and must be coordinated.
- `tests/supportTicketAuthorization.test.js` checks the NULL-authorization guards, read-only legacy history, and ticket-delete revocation.

## Critical release note

The migration-ledger query returned no records for the above staged versions. Therefore these fixes are **not applied to Production**. The NULL-authorization issue is a live authorization risk and should be treated as a priority before public launch. Do not apply only one piece of the support release: review the complete staged migration/function set, Edge Function compatibility, grants and RLS together, then deploy only after explicit release approval and a backup/rollback plan.

## Frontend review

- Customer support thread loads via the attachment-aware RPC with a narrowly-scoped fallback only when that RPC is absent.
- Message sends use request IDs/idempotent RPCs; customer thread refresh follows successful sends.
- Customer and admin clients use Realtime subscriptions plus a 15-second recovery refresh.
- Read-receipt failures do not hide message history.
- Admin legacy message history is read-only in the UI.
- No evidence of a missing Realtime publication for the three messaging tables was found.

## Preservation

No existing messages, support tickets, attachments, users, orders, products, or other customer records were deleted or modified during this audit.
