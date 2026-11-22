# Stage 70 — two-phase Production-compatible order API cutover

**NOT RELEASE-READY. Draft PR #149 only. Production unchanged.**

## Verified live dependencies and the old-browser incompatibility

On 2026-11-22 the connected live database had **no** `public.admin_order_ledger_page(integer,integer)` and **no** `public.admin_order_image_refs_page(integer,integer)`. Authenticated currently has direct SELECT access to `public.orders.items`, `checkout_request` and `checkout_result` under the Orders RLS policy. New PR #149 frontend code requires both new RPCs and avoids raw order JSON reads.

The CURRENT deployed main-branch frontend is different: `src/utils/adminOrderLedgerSafety.js` still requests `rest/v1/orders?select=*`; `src/components/AdminDashboardPro.jsx` still requests `rest/v1/orders?select=items` for image cleanup. Therefore **the former single-transaction Stage57 migration cannot safely run before the new frontend deployment**: removing raw order grants would break the current admin order view. Deploying the new frontend before its RPCs exist would likewise break it.

## Phased bridge committed to PR #149

**Phase A (additive, BEFORE frontend deployment):**

1. Fresh read-only Supabase live catalog, migration-history and API exposure audit. Confirm existing checkout, staff permission, status triggers and historical order structures match.
2. Do NOT replay historic timestamp-mismatched SQL or auto-repair any migration history. Apply ONLY reviewed, individually tested new Stage51 customer receipt financial redaction `20261121170000_strip_private_costs_from_checkout_rpc.sql` and Stage54 customer history redaction `20261121190000_redact_alternate_costs_from_order_history.sql` to a vetted staging schema; verify guest checkout and customer order ownership with real staging-only JWTs.
3. Apply `20261121210000_scope_admin_order_ledger_permissions.sql` to the staging database, then verify finance/no-finance/customer/image-reference role boundaries. This file now adds the new public/private RPC functions **without revoking legacy direct order grants**. Existing main-branch frontend keeps working while the new PR code can begin using projected APIs.
4. Full staging security and commerce checks first. Confirm both new RPCs, anon denied, authenticated permitted only with proper staff permission, no cost exposure in projected orders-only responses.
5. Only after the bridge is verified, merge the reviewed PR head and let Vercel Production deploy. Confirm Vercel READY commit, admin orders/stock/status/image cleanup, customer checkout, personal order history, permissions, product editor and responsiveness; test on mobile and desktop. No follow-up API revocation until this passes.

**Phase B (restrictive, AFTER the new frontend is READY):**

6. Apply `20261121213000_revoke_legacy_order_snapshot_reads.sql`. Its transactional preconditions block revocation unless both RPCs already exist and authenticated grants are present while anon execution is absent. It then atomically removes direct finance-bearing order SELECT and preserves safe metadata; postcondition checks force rollback on ACL drift.
7. Repeat protected RPC, order/stock, finance, Realtime and mobile end-to-end verification. **Old browser tabs** still running the previous JavaScript can lose the obsolete direct order read; they must reload into the new version. This client-transition risk requires an explicit operational plan; Phase B must not run while old clients are expected to work indefinitely.
8. If validation fails, **stop**; use a separately reviewed, targeted rollback of the affected phase. Do not blindly restore sensitive raw SELECT grants. Preserve existing production checkout and the current stable Vercel commit as reference.

The disposable PostgreSQL17 CI integration `tests/sql/stage57_order_ledger_scope_contract.sql` verifies both original migration sources and tests the two stages sequentially: legacy raw SELECT remains available after Phase A, then is revoked after Phase B, with safe orders-only projection, finance authority and image isolation. It is deliberately NOT a production rehearsal.

## Live release blocking criteria

- Existing migration history: 135 remote applied records, and now 123 local SQL files including the new Phase B migration. **43 unmatched local versions**: 32 same normalized name with a different timestamp, seven older unsafe/unproven migrations and **four deliberately staged migrations**. No `supabase db push`, no automatic repair, no historical SQL replay.
- **full-schema Supabase staging**, real authenticated JWT + PostgREST API and roles, true variant stock/idempotent replay/cancellation/reactivation tests are still missing. The no-cost subset PostgreSQL17 fixture does not replace those.
- The user refused a paid Supabase branch: **no paid staging** created; do not incur any billable resource charge.
- Strictly distinguish the all-green GitHub Actions + Vercel Preview status from real Supabase release readiness. No guarantee of zero Production risk is possible without the complete security and commerce checks.
- **Production unchanged** pending a safe, approved cutover; PR #149 remains Draft. Check current PR SHA, Vercel production SHA and all migration timestamps immediately before each operational phase.

This document is the execution order for when the release prerequisites are actually met; it does not authorize bypassing those prerequisites or indicate the four migrations have already run on live Production.
