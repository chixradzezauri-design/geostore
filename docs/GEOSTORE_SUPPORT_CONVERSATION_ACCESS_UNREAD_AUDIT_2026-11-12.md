# GEOSTORE — Support Conversation Access & Unread Workflow Audit
**Date:** 2026-11-12  
**Repository:** `chixradzeuri-design/geostore`  
**Branch:** `fix/admin-panel-audit-2026-11-10`  
**Starting HEAD:** `a3cda315e42d6eec9a09f3cc09a1366b3bcb29f4`  
**Fix commit:** `190e12aa8c8e5f5a8f7b50c22c1fb2457b71afb5`

## Scope
Reviewed customer ticket lookup, customer reply flow, account/guest authorization alternatives, attachment authorization, customer Realtime refresh/read-receipt calls, admin ticket list/unread counts, and the staged read-receipt migration. No ticket/message content or customer PII was read during this stage.

## Confirmed defect and fix
The server-side support RPCs already authorize a ticket owner by matching immutable `customer_user_id` to `auth.uid()`, matching the authenticated JWT email to the ticket email, or validating the guest's 256-bit private access code against its stored SHA-256 hash.

The customer UI nevertheless required a 64-character private access code for every ticket lookup and reply, even for a signed-in account whose email matched the ticket. This blocked authenticated owners from reopening older/legacy tickets whose access-token hash is NULL, despite server-side email ownership support.

**Fixed in `src/App.jsx`:**
- A signed-in user with an Auth user ID and email may open a ticket using its ticket number without entering the guest access code. The database RPC remains authoritative and rejects mismatched ownership.
- Guests remain required to supply the full 64-character private access code.
- The access-code field is optional only for signed-in users; guest validation remains strict.
- Customer text replies and attachment uploads pass an empty token only when account authentication is available; the existing server RPC/Edge Function validates account ownership.
- The customer Realtime/read-refresh effect now re-evaluates when the authenticated account changes, so account-verified tickets can subscribe without a guest token.
- Existing ticket IDs, access-token hashes, messages, attachment records, request IDs, and stored data are not rewritten or deleted.

This is a frontend compatibility fix; it does not weaken database authorization. The account email must still match the ticket email (or the immutable user ID must match).

## Other findings / release dependencies
- Admin ticket list displays per-ticket unread counts when the additive read-receipt RPC is installed; the UI gracefully falls back to no unread badges when the RPC is missing.
- Customer/admin read-receipt and attachment enhancements are present in the audit branch but were not present in the Production migration ledger at the time of the previous live-schema check. They are staged, not confirmed live. The read-receipt and attachment migrations must be deployed in a coordinated, reviewed release with the corresponding Edge Function and Storage setup.
- Admin replies persist in the ticket thread; no email dispatch is implemented by this workflow (see `GEOSTORE_CUSTOMER_ADMIN_MESSAGING_EMAIL_REALTIME_AUDIT_2026-11-12.md`).
- No additional server-side authorization defect was established in this UI workflow.

## Validation and safety
- Reviewed the final committed source around lookup, reply validation, and Realtime effect dependencies.
- GitHub compare confirms this stage changes only `src/App.jsx` (25 additions, 13 deletions).
- Automated test suite, Vite build, browser E2E, and live account/guest message flows were not run. No test/build pass is claimed.
- No Production data, schema, Edge Function, Storage object, secret, email, or customer conversation was changed.
- No PR merge, Production deployment, or Production promotion occurred.

## Next
Continue the customer communication audit with account/guest ticket discovery and status visibility, then verify unread receipt behavior once the staged migrations are safely available in a non-Production test environment. Keep email dispatch as a separate provider-configured feature.
