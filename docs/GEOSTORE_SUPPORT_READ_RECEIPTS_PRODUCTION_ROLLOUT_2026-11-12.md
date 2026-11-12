# GEOSTORE — Production rollout plan for support read receipts

Date: 2026-11-12
Repository: `chixradzezauri-design/geostore`
Audit branch: `fix/admin-panel-audit-2026-11-10`

## Verified Production state
Read-only checks against Supabase project `xmtnszxtnfxnrojionoa` confirmed:
- Project status: ACTIVE_HEALTHY, PostgreSQL 17.11, region us-west-2.
- `public.support_ticket_messages` exists.
- `admin_read_at` and `customer_read_at` are absent.
- `public.mark_support_ticket_messages_read(text,text)` and `public.get_support_ticket_unread_counts()` are absent.
- `public.get_support_ticket_status(text,text)` and `public.get_my_support_tickets(integer)` are absent.
- The Production migration ledger ends at `20261110133651`.

## Minimal migration set for the currently staged unread feature
Apply in this order, after a verified restorable backup and a successful isolated validation:
1. `20261110153000_support_ticket_read_receipts.sql` — adds nullable read timestamps and owner-checked read RPCs, plus admin-only unread totals.
2. `20261112160000_add_owner_checked_support_ticket_status.sql` — supports customer status/last-update display.
3. `20261112170000_add_authenticated_customer_support_ticket_list.sql` — lists account-linked tickets and computes unread admin reply counts. It depends on `customer_read_at` from step 1.

The following migrations are **not required solely for unread badges/read receipts** and should not be bundled into this change without a separate review:
- `20261110154000_fix_support_admin_reply_status.sql`
- `20261110155000_support_ticket_attachments.sql` (also changes private Storage bucket/policies).

Do not use blanket `supabase db push`; Production has other migration-ledger divergence and branch-only migrations.

## Pre-deployment gate
- Obtain and verify a current restorable backup/export of Production data and schema.
- Apply the three SQL migrations above to an isolated Supabase development branch first; validate schema, RPC grants, authorization and existing ticket counts there.
- Confirm the frontend release includes the matching admin/customer support code.
- Obtain explicit Production release approval before applying any SQL to the live project.

## Post-deployment read-only verification
Run a read-only schema check for:
- Both read timestamp columns.
- Both read-receipt/unread-count RPCs.
- Both customer status/account-list RPCs.
- The three migration versions in the ledger.

Then verify function execute grants and run owner/admin authorization checks in the isolated environment using synthetic tickets only. Do not create test tickets/messages in Production. Existing historical NULL read timestamps must remain NULL until the relevant conversation is actually opened.

## Current status
No Production DDL or data changes have been made. No verified restorable backup is currently available in the connected tool context, and no isolated Supabase branch has been created. Therefore the live fix is prepared but **not yet applied**. This is intentional safety gating, not a successful Production deployment.
