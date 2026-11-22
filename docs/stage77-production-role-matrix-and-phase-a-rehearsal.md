# Stage 77 — read-only Production role matrix + Phase A admin API compatibility rehearsal

**NOT RELEASE-READY. Production unchanged. PR #149 stays Draft.**

## Real Production catalog inspection (read-only)

We checked `pg_proc`, `pg_policy`, `pg_class` and PostgreSQL grants
against the connected existing Supabase project **without querying user,
customer, staff, order, stock or finance records**.

- `public.orders`: RLS **enabled**, two `authenticated` staff policies
  specifically requiring `has_staff_permission('orders')` for SELECT/UPDATE;
  current `authenticated` table SELECT still granted to the old frontend.
- `public.expenses`: RLS enabled, one staff expenses policy with both
  `USING` and `WITH CHECK` permission checks. `anon` SELECT denied.
- `public.admin_staff_members`: forced RLS enabled, no direct SELECT for
  `anon` or `authenticated`. Stored staff grants are server controlled.
- `public.support_tickets`: RLS enabled; staff support read/update and
  validated visitor INSERT policies exist.
- Public checkout, customer-history, order-notification, staff permission,
  support-message and admin-order-note RPCs use `SECURITY INVOKER` wrappers
  where present, backed by protected `private` `SECURITY DEFINER` routines.
- **Both new order projection RPCs are still absent in Production**.
  This confirms Phase A remains a hard dependency for the PR frontend.

Current metadata checks do not execute any RPC with a customer identity,
and do not prove signed JWT or HTTP/Data API integration.

## New executable no-cost test of Phase A

`tests/sql/stage77_phase_a_legacy_role_compat.sql` is now executed
between the *actual* staged additive `20261121210000` SQL and the
*actual* restrictive `20261121213000` SQL via the existing PG17
Stage57 integration. It uses **real PostgreSQL** roles
`SET ROLE anon` and `SET ROLE authenticated`, together with synthetic
`request.jwt.claim.sub` settings in a disposable database:

- Guest cannot SELECT customer orders or execute admin order projection.
- Forged `app_metadata`/`user_metadata` administrator without real
  staff record sees zero legacy orders and gets denied projected RPCs.
- Products-only staff cannot see raw orders but can retrieve the narrow
  image-reference projection; cannot execute order ledger.
- Orders-only staff can still issue the existing old browser's
  `SELECT *` / raw image snapshot queries in **Phase A**, while the
  new projected ledger returns safe order data *without vendor costs*.
- Orders+expenses staff can still read cost-bearing snapshots via the
  protected projected ledger RPC.
- After this Phase A test, the existing Stage57 fixture applies
  **Phase B** and separately verifies that raw cost-bearing order
  SELECT is revoked while authorized projections remain accessible.

This specifically addresses live old-client / new-client cutover overlap.
It is stricter than only checking that the table still has a SELECT grant.

## Remaining release blockers

This role-switch test is **not a signed JWT**. In a disposable PostgreSQL
fixture, `request.jwt.claim.sub` is set directly; real Supabase Auth,
PostgREST, JWT verification, schema exposure, and the connection pool are
not present. A **full-schema Supabase** staging setup with genuine
authenticated HTTP sessions remains necessary before a live coordinated
migration/Production deploy. It cannot be replaced by SQL-only CI.

The migration audit has separately recorded 61 same-version different-SQL
historical files (50 source-token-equivalent and 11 different executable
SQL) and 11 remaining different-timestamp files. No old source is replayed.

Production must remain on its stable Vercel commit while **Phase A** is
approved and verified, followed by the new frontend, followed by **Phase B**
only when old browser tabs have a safe reload/transition plan.
**No paid staging** was created, and **Production unchanged**:
no live SQL, no order/stock mutations, no GitHub merge or deploy.
