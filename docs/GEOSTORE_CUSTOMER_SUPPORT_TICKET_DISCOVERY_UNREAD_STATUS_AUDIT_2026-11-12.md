# GEOSTORE customer support ticket discovery, status and unread audit — 2026-11-12

## Scope
Reviewed customer ticket creation and recovery UX, customer/admin status visibility, unread indicators/read receipts, the support thread client, relevant SQL migrations, and authorization regression tests.

Repository: `chixradzezauri-design/geostore`
Branch: `fix/admin-panel-audit-2026-11-10`

## Findings

### Ticket creation and recovery
- Customer ticket creation uses a cryptographically generated ticket ID, 256-bit private access token, and idempotency request ID.
- The database stores the SHA-256 hash of the access token rather than the raw token. The successful creation screen shows the ticket number and private code with copy controls; the code is explicitly presented as one-time display.
- The customer must retain the ticket number and private code to reopen a guest conversation. The UI does not persist the private code in browser storage, which avoids silently retaining a reusable credential.
- Signed-in tickets are associated with the authenticated UUID by the idempotent creation RPC.
- The customer interface still has no account-linked “my support requests” list. The user must manually enter the ticket number. This is a discoverability limitation, not an authorization defect; an account ticket-list feature should use a narrowly scoped, server-authorized RPC rather than broad table access.
- Legacy guest tickets without an access-token hash cannot safely be reopened by guest credentials that were never issued. A signed-in customer can still be verified through the existing matching-email ownership rule. No security bypass was added.

### Status visibility — fixed in audit branch
- Before this stage, the customer conversation showed messages but did not show the current ticket status or the timestamp of the latest message.
- Added `public.get_support_ticket_status(text,text)` in an additive migration. It returns only the selected ticket's status, creation time and latest message time; it does not enumerate tickets.
- The RPC checks the fixed primary-admin identity or the ticket owner through authenticated UUID, matching authenticated email, or the SHA-256-verified guest access token. It uses explicit `IS NOT TRUE` denial checks to avoid SQL NULL fail-open behavior.
- Added a frontend helper and customer UI status label, localized for Georgian, English and Russian. The customer view refreshes the status with the existing 15-second recovery poll and after replies.
- If the new RPC is not installed on a deployment, the existing conversation remains usable and the new status label is simply omitted.

### Read receipts and unread indicators
- The existing additive read-receipt migration adds `admin_read_at` and `customer_read_at` without deleting or rewriting message rows.
- Opening a customer conversation marks admin messages read; opening an admin thread marks customer messages read.
- The admin inbox uses a protected RPC for unread totals and displays per-ticket unread counts. Customer-side unread counts are not currently displayed.
- If the read-receipt migration/RPC is absent, the client intentionally falls back to no unread badge rather than blocking ticket access.
- Historical read state remains unknown (`NULL`). When the migration is first applied, old customer messages with NULL admin read timestamps may appear unread until an administrator opens the relevant thread; this is preferable to fabricating historical read timestamps.

## Changes made
- `supabase/migrations/20261112160000_add_owner_checked_support_ticket_status.sql` — additive owner-checked status RPC.
- `src/utils/supportThreadApi.js` — status RPC client with graceful missing-migration fallback.
- `src/App.jsx` — customer-visible status and latest-update timestamp, refreshed alongside the existing conversation polling.
- `tests/supportTicketAuthorization.test.js` — extended static authorization regression coverage for the new RPC.

## Preservation and safety
- No existing support ticket, message, attachment, order, product, user or other business data was changed or deleted.
- No Production database migration, Storage operation, email send, test ticket, merge, deployment or Production promotion was performed.
- The new migration is staged on the audit branch only. The customer status label will become available only after the migration is separately reviewed and deployed with the corresponding code.
- No ticket-list RPC was added; no broad access to customer support records was introduced.

## Verification limits
- Source files and branch changes were re-fetched from GitHub after the updates.
- Static regression tests were extended but were not executed in this session.
- No `npm test`, `npm run build`, browser E2E, live customer/admin flow, or Production migration was run.
- No current-head CI workflow run was returned. Therefore build and test success are **not claimed**.

## Next recommended stage
Implement and audit a secure account-linked “my support requests” list limited to tickets owned by the authenticated UUID, while retaining manual ticket-number/private-code recovery for guests and legacy records. Do not expose tickets merely because a customer knows another ticket number.
