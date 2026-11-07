# GEOSTORE audit log

Branch: `maintenance/storefront-draft-save-2026-11-06`
Repository: `chixradzezauri-design/geostore`

This file is the durable handoff log for staged audit work. Add new findings and fixes here rather than repeating completed checks. Reopen a completed item only when a new finding requires it.

## Completed / already reviewed

- Password hardening: 10-character minimum, mixed character classes, common-password checks and browser-side HIBP k-anonymity check are staged in the branch. Supabase's built-in leaked-password protection remains unavailable on the current Free plan.
- Public order tracking: privacy-limited response and staged rate limiting (10 attempts per phone/order key per 15 minutes); migration is staged, not applied to production.
- Guest checkout: staged request bounds and validation; migration is staged, not applied to production.
- Stock safety: staged non-negative stock constraint; production currently has no negative stock values.
- Order state transitions: staged migration adds DB-level transition guard and protects the order ledger from deletion. Migration is not applied to production.
- Financial reporting: staged UI changes distinguish historical cost-backed profit from estimated/unknown cost; no build or test run claimed.

## Admin security audit — 2026-11-07

### Verified in live Supabase

- All 10 public tables inspected have RLS enabled.
- Admin policies for finance, orders, products, coupons, storefront configuration/media/versions, support tickets and messages bind access to the primary admin Auth UID `1060de3d-d28a-45f8-9a64-5e0368cffc4b` and trusted `app_metadata.role = 'admin'`.
- Sensitive private admin RPCs use `SECURITY DEFINER`, empty `search_path`, and deny anon execution; the inspected RPCs require the primary admin identity/role in their function body.
- Frontend admin access is derived from server-verified Supabase Auth user and trusted `app_metadata`, not localStorage or URL flags.
- Staff/roles screen is explicitly a local planning list only. It does not create Auth users or grant server-side permissions. It must not be described as functional multi-user staff access.
- Live database check: anon has no DELETE grant on `public.orders`; authenticated has DELETE grant. The live RLS policy currently allows the primary admin to delete orders.
- Live database check: authenticated has no direct UPDATE grant on `public.orders`; status changes go through admin RPC.
- The staged migration `20261106200000_prevent_completed_order_status_rollback.sql` is not recorded in live `supabase_migrations.schema_migrations`; the status-guard trigger is absent in production. It includes the order DELETE grant/policy revocation, but is not yet applied.
- Security advisor's only current warning is Supabase leaked-password protection disabled (known Free-plan limitation).

### Required next actions

1. Keep the order-ledger DELETE restriction and order status trigger staged. Before applying any migrations, reconcile the full staged migration sequence with live migration history and review dependencies; do not apply a partial/out-of-order migration.
2. Continue inspecting every privileged admin function and its public wrapper, including EXECUTE grants, identity checks, input validation, and transaction boundaries.
3. Inspect storefront publish/draft and support-ticket mutation flows for authorization and auditability.
4. Decide separately whether to implement real server-backed staff accounts/permissions. Current UI is only local notes; do not enable it as an authorization mechanism.
5. Run automated tests and build only after the staged work is ready; avoid repeated Vercel builds.

## Safety boundaries

- No production schema/data changes were made during this audit step.
- No Vercel build or deployment was triggered.
- Do not claim tests passed unless they are actually executed.


## Admin security audit — continuation 2026-11-07

### Additional checks

- No `SECURITY DEFINER` functions exist in the exposed `public` schema; privileged implementations are in `private` and exposed only through SQL wrappers.
- No ordinary views were found in `public`; therefore no public view bypass of RLS was identified.
- `public.products` has column-level SELECT grants for anon/authenticated even though the table-level SELECT privilege check is false. This is intentional/functional for the public catalogue; do not interpret the table-level result alone as a storefront outage.
- Sensitive mutation grants checked: anon has no UPDATE/DELETE on support tickets or storefront configuration/media; authenticated has grants, but RLS policies bind writes to the primary administrator UID and trusted app_metadata role.
- Support-ticket public INSERT is intentionally allowed with field-length/status/reply constraints. No server-side rate limiter was identified for this public submission path; abuse protection remains a follow-up item.
- Admin activity log in AdminDashboardPro is component state only (initial sample entries + local state updates); it is not a durable server audit trail. Do not present it as a tamper-resistant audit log.
- Staff permissions remain a local-only planning list; they do not grant or restrict actual access. Do not rely on these checkboxes for authorization.

### Follow-up items (not yet implemented)

1. Design abuse controls for public support-ticket submission (prefer server-side throttling; avoid trusting client-only limits).
2. If durable admin auditing is required, implement a server-written append-only event log with actor UID, action, target, timestamp, and restricted read access. Never allow the browser to author arbitrary actor identity.
3. Implement staff accounts only with real Supabase Auth identities and server-side permission checks; otherwise keep the current local-only warning explicit.
4. Continue storefront publish/draft and media lifecycle review. No production changes made in this continuation.

### Verification boundary

- Read-only live Supabase queries only.
- No migration applied, no production data changed, no build/deploy run, and no automated tests executed.
