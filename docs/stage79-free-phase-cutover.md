# Stage79 free signed Auth checkout/history and phased cutover

**NOT RELEASE-READY. Production unchanged. No paid staging.** All code remains in Draft PR #149.

Read-only live catalog confirms 23 public/private application tables are under RLS; the existing production checkout and customer-history public RPCs use SECURITY INVOKER wrappers and the private schema has anon/authenticated USAGE. The live project still records 135 applied migrations while this PR contains 123 SQL files, including four pending release migrations. The unreconciled source history must NEVER be blindly replayed with db push.

The existing free local Supabase v2.84.2 Docker CI first runs Stage78 with 60 genuine Auth/PostgREST/RLS checks. Then Stage79 installs BOTH real customer-facing Phase A release migrations, for checkout receipt redaction and customer order-history redaction, alongside the already loaded exact admin-order Phase A projection SQL. With real GoTrue-issued signed JWTs, it validates guest and signed checkout receipts, invalid input rejection, historical idempotent replay redaction, two customers' exclusive history, legacy admin compatibility, and employee order permissions.

After successful Phase A assertions, Stage79 applies the exact reviewed Phase B migration ONLY inside disposable localhost Postgres. A still-valid signed staff JWT must lose finance-bearing raw SELECT *, while safe order status, cost-redacted admin RPC, authorized finance view, product image references, customer history and guest checkout must survive.

**Important limitations:** the local private checkout writer is deliberately synthetic and does not implement the real stock/coupon/variant/idempotent database transaction. This does NOT prove full-schema production parity. Full-schema migration reconciliation, actual inventory/checkout status transactions, old browser-tab transitions, backend functions, and device-to-device production-equivalent tests remain strict release gates. Independent Stage52-77 PG17 tests cover parts of this SQL with synthetic JWT settings but are not a substitute for full-schema end-to-end verification.

Release order remains Phase A, verified frontend production cutover, Phase B only after old browser tabs have a reload path. Never run Phase B before the new UI is live.

**Production unchanged.** No remote DDL/DML, live account creation, order or inventory change, PR merge, or Production deployment. **No paid staging** project or branch created.

The guest HTTP client is NEVER signed in during tests; each synthetic identity signs in through its own isolated temporary client. There is no paid staging environment.
