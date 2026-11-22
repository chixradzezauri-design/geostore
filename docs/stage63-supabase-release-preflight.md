# Stage 63 — Supabase full-schema release preflight (Draft PR #149)

**Status: partially verified, NOT RELEASE-READY.** This document is a read-only 2026-11-22 comparison of the connected live project's catalog and migration history against the three unapplied draft migrations. No production DDL/DML, staging project, staff accounts, orders, inventory or Auth settings were changed.

## Already verified — do not repeat earlier stages

- Stage61–62 disposable PostgreSQL contracts and all six exact-HEAD workflows passed at Stage62 commit 924219131e8d2ffb5579bb348f342d7ad0f66db0. Those runs exercised partial schema fixtures, not the entire Supabase database.
- Connected Supabase: PostgreSQL 17; **135 applied migrations**, latest migration 20261120124250_storefront_publish_concurrency_safe_compat; **no Supabase development branches** listed at this review.
- Real order schema uses public.orders (id text, items jsonb, checkout_result jsonb, checkout_request jsonb, total_gel numeric, user_id uuid) with RLS enabled. Real expenses amount is numeric; staff membership uses user_id uuid, permissions jsonb; inventory movement includes variant_id text and quantity_delta integer.
- Real public.create_order_with_stock(jsonb) and public.get_my_orders() are invoker wrappers; private implementations are definer functions. Order status/reactivation wrappers, staff-permission wrappers and the relevant order/product triggers exist. No account-specific, customer or financial row contents were fetched.
- **Important current-release gap:** as of this read-only check, authenticated still has column SELECT privileges on public.orders.items, checkout_result and checkout_request. Orders RLS restricts reads to accounts with the orders staff permission, but it does not itself redact finance fields from those authorized users. The staged Stage57 migration is designed to revoke direct snapshot reads and route them through projected RPCs with separate expenses permission. This is a release-blocking verification obligation, *not* evidence that anonymous users currently see these fields.

## Pending migrations already staged in PR #149 — apply in this order only on staging

1. 20261121170000_strip_private_costs_from_checkout_rpc.sql — public checkout receipt only; private stored finance/idempotency snapshot unchanged.
2. 20261121190000_redact_alternate_costs_from_order_history.sql — authenticated own-history rows remain owner-scoped; cost aliases stripped.
3. 20261121210000_scope_admin_order_ledger_permissions.sql — orders access requires orders; raw cost fields require expenses; image-reference cleanup gets a narrowly projected RPC; direct order snapshot column SELECT revoked.

The baseline is time-sensitive. At release, **re-list remote applied migrations** and diff the full repository migration history; stop on missing prerequisites, duplicate versions, out-of-order application, drift or an unexpected new migration. The file-order check in tests/stage63ReleaseGate.test.js is not a substitute for this remote comparison.

## Mandatory full-schema isolated Supabase staging procedure

1. Create or select an isolated full Supabase staging environment with matching Auth, RLS, PostgREST/Data API schema exposure, Storage, triggers and entire migration history. Never assume the Stage52 disposable partial PostgreSQL fixture proves this. Supabase paid branching may incur cost: obtain explicit approval for any charge before creating a branch. Do not copy real customer data or production secrets.
2. Confirm private is excluded from the PostgREST exposed schemas. Apply pending repository migrations only to staging in chronological order. Inspect migration status and errors before testing.
3. With staging-only PostgreSQL credentials, run from repository root: psql -v ON_ERROR_STOP=1 -f tests/sql/stage63_full_schema_release_gate.sql . This explicitly opens a READ ONLY transaction and rolls it back. It checks required tables/column types, RLS, public/private RPC presence and SECURITY DEFINER/INVOKER boundaries, anonymous/authenticated EXECUTE grants, direct order snapshot SELECT revocation, customer-history redaction, staff finance separation, and critical stock/order triggers.
4. Perform **authenticated owner/staff E2E** on staging with real staging JWTs (a SQL catalog test cannot establish JWT freshness or actual staff permissions): (a) owner can view finance and authorized orders; (b) orders-only staff can view/update allowed statuses but cannot read purchase costs or expenses; (c) expenses-only staff cannot browse orders; (d) products-only staff can check order image references but cannot access customer/order or finance details; (e) anonymous and ordinary customer accounts cannot call admin RPCs and only see their own safe order history.
5. On staging, submit realistic cart and distinct size/color/custom variant orders with coupon, delivery, gift wrap and idempotent replay. Verify exact stock decrements, no double deductions, cancellation/re-activation atomicity, stock/movement ledger consistency, permission denials and **no confidential cost fields** in public receipts or customer history.
6. Compare original finance snapshots, expense visibility and aggregate totals before/after the staged migrations using staging test fixtures, not production rows. Check status-change notifications, variants, CRM, admin/visual editor persistence across sessions/devices. Review Supabase Auth leaked-password protection setting and physical iPhone Safari separately.

## Exit criteria

- Automated Stage63 Node guards and prior Stage52–62 tests green on **exact final PR HEAD**.
- Stage63 read-only SQL gate green on **full isolated Supabase staging after migrations**.
- Staging owner/staff/JWT and commerce + finance E2E green, including negative authorization tests.
- No unexpected remote migration drift, unsafe exposed private schema or sensitive order-field grants.
- No merge, Supabase production migration, Vercel Production deploy, or live data changes without **new explicit production-release approval**.

**Scope of this stage:** safety preflight, an executable future staging-only read-only gate and release documentation. It does not claim a full staging run occurred and does not duplicate the Stage51–62 application fixes.
