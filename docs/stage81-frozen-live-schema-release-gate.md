# Stage81 — frozen read-only Production schema release preflight

**NOT RELEASE-READY. Production unchanged. No paid staging.** All additions remain in Draft PR #149.

## Exact live catalog, as of 2026-11-23
Read-only Supabase catalog metadata showed **17 columns in public.orders**, **32 in public.products**, **8 important public/private tables with RLS on**, **8 enabled order triggers** and **3 enabled product triggers**, including size/color stock synchronization. Ten critical RPC signatures were inspected with return type, SECURITY DEFINER/INVOKER mode, function-definition MD5 and effective anon/authenticated EXECUTE privileges. No application data rows or SQL bodies, user IDs, emails, orders, stock balances, secrets or financial records were retrieved or committed.

The current Production frontend still relies on direct authenticated SELECT for orders/items/checkout snapshots. The new admin ledger and image reference RPCs are absent, as expected before Phase A. The private checkout function exists and is SECURITY DEFINER; the public checkout is SECURITY INVOKER. The catalog is a frozen evidence record, **not proof that staged historical SQL matches current live function definitions**.

Files:
- release/stage81-production-schema-baseline.json: source-pinned metadata snapshot;
- release/stage81-read-only-schema-query.sql: the SELECT-only catalog query used to export fresh metadata;
- scripts/stage81LiveSchemaGate.mjs: offline fail-closed metadata checker;
- tests/stage81LiveSchemaGate.test.js: negative drift, RLS, ACL and trigger checks;
- this document and the existing free PostgreSQL17 CI gate.

The checker validates the frozen catalog, 135-version migration metadata fingerprint, required exact order/product column types, anonymous/customer/employee RPC and table privileges, staff Force RLS, active triggers and the before-Phase-A compatibility contract. It can compare **fresh** catalog JSON and fresh applied-migration metadata exported read-only immediately before the release. Fresh comparison intentionally fails on **any** critical catalog drift or migration version/name change.

Run the offline frozen check with:
  node scripts/stage81LiveSchemaGate.mjs --verify-pinned

For a fresh release gate, run release/stage81-read-only-schema-query.sql on the connected live project using SELECT only, save its JSON snapshot as a file, export current migration version/name metadata separately, then run:
  node scripts/stage81LiveSchemaGate.mjs --fresh-catalog-json /path/to/catalog.json --fresh-migrations-json /path/to/migrations.json

**Important:** The pinned check is NOT fresh Production verification. The fresh mode also does not apply changes or approve a deployment. The catalog is explicitly **pre-Phase-A**; after Phase A has been applied, the expected RPC/ACL fingerprints must be updated through a new reviewed baseline, rather than trying to run this unchanged pre-release guard after cutover.

## Remaining historical risks and release ordering
Production still has **135 already-applied migrations**, while the PR contains **123 local SQL files** with four pending reviewed release migrations. There are **61 same-version SQL-content mismatches** (11 with executable-token differences), 11 timestamp-misaligned historical files, and seven older blocked or unproven migrations. We must never run blind db push, auto-repair remote history, or replay old SQL without bespoke review.

Stage80 already tests a genuine source checkout transaction under signed Auth/PostgREST with synthetic tables, but its local schema lacks several Production-specific order/product triggers; it is NOT a full-schema reproduction. Critical remaining release gates include complete compatible-schema staging/rehearsal, actual remote-effective code parity, JWT user role edge cases, inventory triggers, and stale mobile/desktop browser transition validation.

**Release sequence:** (1) checked additive **Phase A** SQL, (2) tested and READY new frontend deployment, (3) restrictive **Phase B** ACL revocation only when old clients are accounted for. Old clients may require reload. There is no zero-risk guarantee.

**Production unchanged**: no live DDL/DML, customer/order/product/staff data modification, PR merge or Vercel Production publish; **no paid staging** created.
