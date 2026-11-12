# GEOSTORE support unread receipts and synchronization audit — 2026-11-12

## Scope
Reviewed customer/admin support read receipts, unread counters, realtime refresh behavior, the staged SQL migration and the live Production schema.

Repository: `chixradzezauri-design/geostore`
Branch: `fix/admin-panel-audit-2026-11-10`

## Production verification
Read-only inspection of the live Supabase schema and migration ledger confirmed:
- `public.support_ticket_messages` exists.
- `admin_read_at` and `customer_read_at` columns do **not** exist.
- `public.mark_support_ticket_messages_read(text,text)` does **not** exist.
- `public.get_support_ticket_unread_counts()` does **not** exist.
- The previously staged customer status and account ticket-list RPCs are also not deployed.
- The Production migration ledger ends at `20261110133651`; the read-receipt migration `20261110153000` and later support enhancements are not applied.

Therefore, Production currently cannot persist read receipts or calculate support unread counts. The client is designed to degrade gracefully when those additive RPCs are missing: conversation access remains available, but unread badges and new ticket history/status functions are not active until the matching migrations are deployed.

## Code review findings

### Admin side
- The admin inbox obtains unread totals from the admin-only `get_support_ticket_unread_counts()` RPC.
- The SQL function requires both the fixed primary-admin UUID and trusted `app_metadata.role = 'admin'`.
- Opening an admin thread loads messages and then calls `mark_support_ticket_messages_read`; the RPC only marks customer-authored messages as read.
- Message Realtime events refresh the inbox counts and the currently selected thread; 15-second polling and visibility refresh provide recovery.
- If the unread RPC is not installed, the client helper returns an empty list for the recognized missing-function response rather than blocking ticket loading.

### Customer side
- Opening a customer thread calls the read-receipt RPC; the RPC only marks admin-authored messages as read.
- The RPC validates ticket ownership using the authenticated UUID, matching authenticated email, or the SHA-256-verified guest access token. It uses explicit `IS NOT TRUE` authorization guards.
- Guest callers remain permitted to mark their own ticket's admin messages read by using the private access token; no broad table grants were added.
- The account-linked ticket history previously showed status and latest update but did not indicate unread admin replies. This stage adds an unread reply count and a “ახალი პასუხი” badge.
- The list refreshes every 30 seconds and when the app becomes visible; opening the conversation triggers the read receipt, and the next list refresh clears the badge after the database confirms it.

### Data integrity
- Read timestamps are additive nullable columns. Existing messages are not rewritten or deleted; historical read state remains unknown (`NULL`) until a user/admin opens the relevant conversation.
- Admin unread totals count only `sender_role = 'customer'` rows with `admin_read_at IS NULL`.
- Customer unread totals count only `sender_role = 'admin'` rows with `customer_read_at IS NULL`.
- The customer list RPC returns only ticket metadata and unread counts for `customer_user_id = auth.uid()`. It does not enumerate guest tickets or use email matching for list membership.

## Changes made on the audit branch
- Updated `supabase/migrations/20261112170000_add_authenticated_customer_support_ticket_list.sql` to return a per-ticket `unread_count` for unread admin replies.
- Updated `src/App.jsx` to show a localized unread-reply badge in the account-linked customer support list.
- Extended `tests/supportTicketAuthorization.test.js` with assertions for strict read-receipt authorization, sender-role isolation, customer unread counts and UUID-only list ownership.
- Existing staged read-receipt migration `20261110153000_support_ticket_read_receipts.sql` was reviewed and retained; no Production schema changes were made.

## Preservation and safety
- No ticket, message, attachment, order, product, user or other business data was modified or deleted.
- No Production migration, Storage operation, test ticket/message, email, merge, deployment or Production promotion was performed.
- No service-role key or broad customer data access was introduced.

## Verification limits
- Re-fetched the modified migration, frontend and test source from GitHub after updates.
- Production schema checks were read-only.
- Static regression tests were updated but not executed. Build, automated test suite and browser E2E were not run.
- GitHub returned no workflow runs for the current audit branch HEAD. The attempted local clone was blocked by unavailable network DNS. No build/test success is claimed.

## Release requirement
The unread/read-receipt functionality requires the read-receipt migration and the associated customer history/status migrations to be reviewed and applied in the correct order before deployment of the corresponding frontend code. Do not apply these migrations to Production without the normal backup, staged validation and explicit Production release approval.
