# GEOSTORE — Support Messaging, Ticket Ownership & Account Linkage Audit
Date: 2026-11-12
Repository: chixradzezauri-design/geostore
Branch: fix/admin-panel-audit-2026-11-10

## Scope
Reviewed the current customer support form/thread UI, account and guest ownership checks, idempotent create/reply RPCs, Realtime refresh, read receipts, attachment Edge Function and Storage handling. Ran read-only aggregate/schema/function checks against the connected Production Supabase project. No ticket/message contents, email addresses, access tokens, or customer identities were read.

## Production aggregate findings
- `public.support_tickets`: 3 rows; all 3 have an email value, 0 have `customer_user_id`, 0 have `access_token_hash`, and 0 have an idempotency request ID.
- `public.support_ticket_messages`: 5 rows — 3 customer-authored and 2 admin-authored.
- Ticket statuses: 1 open and 2 resolved.
- All 3 tickets are therefore legacy/guest-owned rather than directly bound to an Auth UUID. Current RPC authorization can still allow a signed-in customer whose authenticated email matches the ticket email. The old rows have no private access-token hash, so guest access using the newer ticket-number + private-code flow is not available for those legacy tickets.
- Production migration ledger contains the ticket-threading and idempotent-creation migrations, but not the staged read-receipt, authorization-hardening, or attachment migrations.
- Production message table currently has no attachment columns. The attachment-aware RPCs and read-receipt RPCs are absent from the public schema.

## Confirmed Production security defect
The deployed private SECURITY DEFINER implementations of:
- `private.get_support_ticket_messages(text,text)`
- `private.add_support_ticket_message(text,text,text)`
- `private.add_support_ticket_message_idempotent(text,text,text,uuid)`

still use `IF NOT (v_is_admin OR v_is_customer)`. When the customer predicate evaluates to SQL NULL, the condition can also evaluate to NULL and PL/pgSQL does not enter the IF body. This is a fail-open authorization check. This is a live latent risk; no exploitation was attempted or observed.

The deployed admin reply implementations also mark a ticket `მოგვარებული` when an admin sends a reply, rather than keeping it `მუშავდება`.

## Existing staged remediation
The audit branch already contains `supabase/migrations/20261110154000_fix_support_admin_reply_status.sql`, which:
- uses explicit `IS NOT TRUE` authorization guards in the legacy and idempotent support RPC implementations;
- preserves the existing admin identity and customer authorization methods;
- changes admin replies to `მუშავდება`;
- retains the public wrapper shape and grants.

The branch also contains additive migrations for read receipts and private support attachments. These have not been applied to Production. The current frontend safely falls back to the legacy message-read RPC when the attachment-aware RPC is not installed; attachment sending and read-receipt enhancements must not be considered live until their matching migrations and Edge Function are deployed and verified together.

## Frontend and data-preservation review
- New ticket creation uses cryptographically generated ticket ID, 256-bit access token, and request UUID; the database stores only a SHA-256 token hash.
- Idempotent create/reply RPCs prevent duplicate records after retry and bind newly created tickets to `auth.uid()` when a signed-in user creates them.
- Existing ticket authorization supports immutable customer UUID, authenticated email match, or a valid private access token.
- Customer thread loads use narrowly-scoped RPCs; Realtime changes are backed by a 15-second refresh and visibility refresh.
- Message history remains visible during transient refresh failures.
- Attachment Edge Function verifies the ticket and caller, checks image MIME/signature/size, stores files in a private bucket, and issues short-lived signed URLs only for paths referenced by that ticket's messages. Failed-save cleanup verifies persistence before deleting an uploaded object.
- Existing support-ticket and thread records were not changed or deleted.

## Actions / release safety
- No Production changes, migrations, function deployments, test messages, or Storage mutations were performed.
- No additional code change was needed in this stage because the branch already contains the authorization/status remediation.
- The authorization fix is urgent and should be included in a coordinated support release. Do not apply only selected pieces: review migration order, RPC grants/RLS, read receipts, attachment schema, private bucket policies and Edge Function deployment together.
- Do not merge or deploy to Production without explicit approval and a verified backup/rollback plan.
- Unit test source was inspected; tests and build were not executed in this audit environment. No CI/build pass is claimed.
