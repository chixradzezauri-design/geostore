# GEOSTORE Admin Order and Support Security Audit — 2026-11-12

## Scope
Read-only Production review of order access, admin order actions, legacy chat, support-ticket RPC authorization, support attachment access, and preservation of historical order details. Source review used audit branch `fix/admin-panel-audit-2026-11-10`. No customer message bodies, names, emails, phone numbers, addresses, or order item contents were queried.

## Critical Production finding: NULL-permissive support-ticket authorization
Production currently has three callable SECURITY DEFINER support-message functions with a NULL-permissive authorization guard:
- `private.get_support_ticket_messages(text,text)`
- `private.add_support_ticket_message(text,text,text)`
- `private.add_support_ticket_message_idempotent(text,text,text,uuid)`

All three are executable by anon and authenticated roles through their public RPC wrappers. Their live authorization condition uses `IF NOT (v_is_admin OR v_is_customer)`. For a registered ticket whose `customer_user_id` is set, an anonymous caller can cause the first customer predicate to evaluate to NULL because `auth.uid()` is NULL. SQL three-valued logic then makes `NOT (false OR NULL)` evaluate to NULL; PL/pgSQL does not enter an IF branch whose condition is NULL. This can bypass the intended rejection for that ticket class, potentially exposing its thread or permitting an unauthorized message. This is a source-level vulnerability; the audit did not attempt exploitation and does not establish that it has been abused.

The staged migration `20261110154000_fix_support_admin_reply_status.sql` corrects the legacy functions with explicit `v_is_admin IS NOT TRUE AND v_is_customer IS NOT TRUE` checks, and preserves the intended behavior that an admin reply sets status to `მუშავდება` rather than incorrectly marking the ticket `მოგვარებული`. The staged authorization regression tests assert NULL-safe guards across the six support SECURITY DEFINER customer RPCs and verify the legacy functions are redefined.

**Release blocker:** This migration is not yet applied to Production. Do not treat the Preview/code branch as fixing the live database.

## Excess direct mutation privileges still present in Production
Read-only Production grants/policy inspection found:
- `public.messages`: authenticated has direct UPDATE and DELETE grants, with admin-only RLS policies.
- `public.support_tickets`: authenticated has direct DELETE and UPDATE grants, with admin-only RLS policies.
- The admin UI has no legacy chat-message edit/delete workflow and no support-ticket delete workflow.

Staged migrations already address the unused destructive paths:
- `20261110151000_prevent_legacy_chat_message_mutation.sql` drops the legacy message UPDATE/DELETE policies and revokes UPDATE/DELETE from anon and authenticated.
- `20261110152001_prevent_support_ticket_deletion.sql` drops the support-ticket DELETE policy and revokes DELETE from anon and authenticated.

These are additive privilege reductions; they do not delete historical messages or support tickets. They remain unapplied in Production and must be reconciled with the Production migration ledger before release.

## Order and customer-data controls reviewed
- Production `orders` table has authenticated SELECT only in the inspected direct table grants; no direct authenticated UPDATE grant was found. Admin status/note actions use dedicated RPCs.
- `private.admin_update_order_status`, `private.admin_save_order_note`, and `private.admin_reactivate_cancelled_order` are SECURITY DEFINER with empty search_path and enforce the fixed primary-admin Auth UID plus trusted `app_metadata.role='admin'`. Reactivation also requires recent password authentication and performs stock deduction transactionally.
- Customer order history is exposed through user-scoped `get_my_orders`; order notifications are scoped to `auth.uid()`. Guest tracking requires order ID plus normalized phone and uses hashed per-phone/per-order rate limits.
- The customer tracking response is intentionally a constrained summary. The staged variant-summary migration adds selected size, color and custom variant name without exposing purchase cost, vendor, supplier, profit or margin fields.
- Admin order mapping preserves the complete database order row for the detail modal. Item normalization preserves historical image/gallery snapshots and selected size/color/custom variant fields. Admin order details prefer the saved order image snapshot; catalogue image fallback is retained for legacy orders that did not store historical images.
- Regression tests cover preservation of optional order fields, guest email sentinel handling, historical image snapshots, variant summaries and support authorization.

## Read-only Production snapshot
Counts only; no customer content was selected:
- orders: 1
- messages: 14
- support_tickets: 3
- support_ticket_messages: 5
- order_notifications: 0

An additional aggregate-only check found 0 account-linked tickets, 0 guest-token tickets, and 3 tickets with neither account link nor access-token hash. Therefore the specific NULL case requiring a non-NULL customer_user_id is not currently represented in the three live ticket rows; the defect remains a latent authorization flaw if an account-linked ticket is created or migrated later. No ticket IDs or customer content were read.\n\nThese counts are not evidence of misuse or delivery failure. No production test messages or orders were created.

## Release and verification status
- No Production rows, schema, grants, policies, Storage objects or customer content were changed in this audit.
- No merge, Production deployment, Production migration, or promotion was performed.
- Browser end-to-end testing was not performed; the available environment did not provide an authenticated browser workflow.
- The existing PR #87 remains draft and unmerged. The branch CI checks previously observed for the current application-code head were green, but this report-only commit still requires its own CI run.
- Production release remains blocked by unresolved migration-source drift and the absence of a confirmed restorable Production backup. Do not use a blanket `supabase db push` or apply these migrations blindly.
- Vercel has reported the free-plan daily deployment limit (`api-deployments-free-per-day`); a new Preview deployment may be unavailable until the limit resets. An earlier Preview was Ready, but it is not evidence that the latest report commit was deployed.

## Required safe release sequence
1. Reconcile the exact missing Production migration sources and verify a restorable backup.
2. Review the three security migrations and their dependency order against the live schema.
3. Apply the NULL-safe support authorization fix and privilege reductions only after the migration history is reconciled; verify function definitions, grants and policies with read-only queries.
4. Run CI and a Preview/browser regression test for customer ticket access, admin replies, historical chat visibility, order detail images/variants, status changes and reactivation.
5. Only after those gates pass, obtain explicit Production-release approval before merging or deploying.

