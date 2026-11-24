# Stage 65 — staff finance/order permission compatibility

**NOT RELEASE-READY. Draft PR #149 only. No Production, Supabase DDL, real orders, staff accounts, expense rows or deployment were touched.**

## Read-only Supabase verification, November 22, 2026

Connected Supabase has no development branch. Its current full production catalog shows the following metadata (no user, order, or expense records were queried):

- public.orders: SELECT and UPDATE policies are scoped to has_staff_permission('orders'), with matching USING/WITH CHECK on UPDATE.
- public.expenses: the ALL policy is scoped to has_staff_permission('expenses') in both USING and WITH CHECK.
- Both public.admin_staff_members and public.admin_staff_pending_invites have RLS enabled but no anon/authenticated table grants. This is intentional "private by default" data access through server-managed pathways, not evidence by itself of a missing policy.
- Neither anon nor authenticated has direct INSERT on public.orders; anon cannot read expenses/orders/staff tables. The authenticated role has broad table access to expenses, but its rows are restricted by the expenses RLS policy. This distinction matters: table grants alone do not confer record-level permission.
- The private staff-authority function verifies confirmed email, active membership, and trusted app_metadata for primary-owner authorization; raw user_metadata is not consulted.
- Prior Stage63 metadata inspection showed authenticated can still SELECT raw orders.items, checkout_result and checkout_request if granted the orders permission. The **unapplied Stage57** draft migration must remove this exposure on staging and in a future coordinated release. Do not mistake orders RLS for a finance-field projection.
- Supabase Security Advisor lists informational no-policy notices on intentionally private tables and a separate leaked-password protection warning. Review the latter at [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No Auth settings were changed.

## New Stage65 executable contract — no staging required for this limited test

The existing GitHub Actions workflow now runs tests/sql/stage65_expenses_order_role_matrix.sql as the LAST suite on the **same disposable isolated PostgreSQL 17** database used for Stages52–62. It sources the unmodified real migration 20261117143000_staff_expenses_permission.sql, after existing synthetic Auth, order, finance-redaction, status, variant and inventory-ledger fixtures.

It verifies:

- Prior legacy "Admin can manage expenses" policy is removed and replaced with staff expenses permission.
- Orders-only employee sees operational order rows and safe ledger data but cannot read or alter expenses or fetch raw finance-bearing order columns.
- Expenses-only employee can read expenses but cannot read orders, invoke order ledger or view order image references.
- Staff with orders **and** expenses permissions can read both expense rows and the protected finance snapshot via the projected order RPC; no direct raw order column read is granted.
- Products-only, unverified, inactive and forged-admin-claims identities cannot read expense rows. Exact primary-owner UUID plus server-controlled app_metadata retains privileges.
- Unauthorized UPDATE cannot change even a synthetic fixture row. No production data enters this suite.

The isolated PostgreSQL tests are valuable regression coverage but **do not represent a full-schema Supabase staging run**: no real Supabase Auth sessions, real JWT issuance, PostgREST, Storage, every existing trigger, or cross-device persistence is exercised.

## Required full-schema Supabase staging before release

1. Reconcile all 42 migration-version mismatches identified in Stage63/64. Do not auto-apply legacy migrations; especially do not install the obsolete variant trigger without showing compatibility with current custom variants and stock state. Avoid manual production migration-history repair.
2. On an approved full-schema Supabase staging environment using synthetic accounts and **staging JWT**, verify owner, orders-only, expenses-only, products-only, anonymous, expired/unconfirmed and inactive staff cases. Test stale/refreshed JWT after permission revocation.
3. Apply the three pending order redaction and finance-projection migrations to staging in reviewed chronological order, then run the read-only Stage63 full-schema SQL gate.
4. Exercise real staging checkout (guest/auth), coupon, finance snapshots, order cancellation/reactivation and variant stock/ledger exactly once; assert receipts and order history contain no internal purchasing cost fields while authorized finance reports retain them.
5. Run an authenticated browser QA on mobile and desktop; confirm persistence on a second session/device and physical Safari QA. Address the Supabase Auth password warning separately.
6. Only after staging passes, obtain fresh explicit Production approval. No merge, Production migration, or release is authorized by an isolated test passing.

**Stage65 scope:** one new role-matrix integration suite plus source tests and this technical release gate. Previous Stage51–64 fixes were not duplicated. Any new CI failures must be investigated on the exact final PR head.
