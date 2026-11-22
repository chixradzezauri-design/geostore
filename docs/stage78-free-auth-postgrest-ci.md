# Stage 78 — free local Supabase Auth / PostgREST CI

**NOT RELEASE-READY. Production unchanged.** All updates stay in Draft PR #149, with **no paid staging** project or Supabase remote credentials.

## What was added
A separate GitHub Actions workflow on ubuntu-24.04 uses the pinned Supabase CLI v2.84.2 and Docker to start **real local GoTrue Auth, PostgREST and Postgres 17**. No remote project link, db push, service-role secret, public staging branch, or real staff/customer data is needed. Local keys come only from "supabase status -o env" and are never printed or uploaded. The integration script fails closed unless API_URL resolves to localhost/127.0.0.1.

The SQL harness creates only a **synthetic test order** and the minimum prerequisites needed to apply the **exact existing** staged migration files:
- 20261117231455_admin_staff_auth_foundation.sql (server-controlled staff membership, permission function and RLS)
- 20261121210000_scope_admin_order_ledger_permissions.sql (additive **Phase A** projected-order and image RPCs)

The suite makes real sign-in requests and tests actual signed JWTs over PostgREST HTTP. It covers guest, nonstaff, forged user_metadata admin, products-only, orders-only, orders+finance, inactive staff, tampered JWT, private staff-record denial, unauthorized permission self-grant, and server-side deactivation with a still-valid JWT. It also checks order cost redaction and legacy Phase A read compatibility. It is complementary to the existing Stage52–77 PG17 migration safety tests, not a duplicate of those synthetic-JWT SQL role checks.

## Important limitations
This new fixture does **not** replay the entire historical GEOSTORE migration history. It creates a deliberately minimal public.orders table, a disposable private.has_staff_permission delegate, and only two exact versioned migration files. It does **not** test checkout, trigger/stock behavior, every historical schema dependency, Edge Functions, storage, live Auth configuration, client-side authenticated browser workflows, or customer data. Full authenticated migration and checkout regression in a **full-schema** isolated environment remains a mandatory release gate.

The existing Stage76 review still records 61 same-version different-SQL files (11 executable differences) and 11 different-timestamp historical files. Do not automatically replay or rename these against live Production. The release must sequence **Phase A**, verified frontend cutover, then **Phase B** revocation with a plan for old browser tabs; run a full-schema migration audit before any live DDL.

This workflow is designed for no-cost CI but requires a GitHub-hosted runner with available Docker and enough minutes/resources. The new CI workflow's run must pass on the exact PR HEAD before declaring Stage78 operational; static Node tests alone are insufficient.

**Production unchanged**: no PR merge, live Supabase mutation, employee account creation, order/stock write, or Vercel Production deployment. **No paid staging** has been provisioned.
