# Stage82 live effective SQL security surface and historical mismatch audit

**NOT RELEASE-READY. Production unchanged. No paid staging.** All changes stay in Draft PR #149.

The previous Stage76 audit documented 61 same-version historical SQL digests differing between local and applied sources: 50 only comment/whitespace tokens, **11 executable-token differences**. These concern historical checkout idempotency and variant/price data, owner AMR order reactivation, private order-note SQL, order-notification SECURITY DEFINER/INVOKER mode, three support-ticket authorization and wrapper differences, error wording and inventory replenishment transaction boundaries. All 11 remain unsafe to replay blindly. Stage82 does not silently mark their SQL semantically equivalent or resolve the version-history difference.

On 2026-11-23, a read-only Supabase catalog query recorded **52 current relevant SQL functions**, security modes, effective anon/authenticated EXECUTE grants, locked search paths and current definition MD5s; **11 order/product triggers**, with their definition MD5s; and **55 validated constraints** on inventory, product, order, staff and support tables. No customer rows, user records, product counts, finance data, secrets or SQL function bodies were read or saved.

The public functions in this current sampled surface are SECURITY INVOKER and privileged implementations reside in private schema. Guest support-ticket APIs are intentionally available to anon, but this metadata does NOT validate the access-token checks inside their SQL; actual signed/guest HTTP denial tests remain a release requirement. Both four-argument legacy and five-argument versioned inventory replenishment RPCs are currently present, which matters for old device/browser compatibility. Production order/product triggers include size/color aggregate stock synchronization not fully reproduced in the existing local fixture.

The frozen manifest is stored in release/stage82-live-effective-schema-surface.json, with an immutable Git blob SHA hard-pinned inside scripts/stage82LiveEffectiveSchemaGate.mjs. The checker cross-links the 11 Stage76 risk records and Stage81 production checkout/function/trigger metadata, refuses unexpected public SECURITY DEFINER, anonymous admin privileges, changes to effective function signatures/digests, revoked replenishment overloads, disabled stock/order triggers and invalidated stock/support/staff constraints. It runs offline with no Supabase secrets.

CI: node scripts/stage82LiveEffectiveSchemaGate.mjs --verify-pinned

For fresh review: run release/stage82-read-only-surface-query.sql using a read-only SELECT, export its one JSON snapshot value plus separate applied migration version/name metadata. Then run node scripts/stage82LiveEffectiveSchemaGate.mjs --fresh-surface-json /path/to/surface.json --fresh-migrations-json /path/to/migrations.json. This proves consistency with frozen metadata, not runtime customer/stock transaction equivalence.

The Production release is still **NOT RELEASE-READY** until the truly compatible **full-schema** Supabase rehearsal, current live function parity, all relevant production trigger interactions and permissioned checkout/support JWT tests pass, and historical divergence disposition is documented. The user requested no paid staging, so **no paid staging** was created.

Release sequencing remains **Phase A** checkout/history redaction and additive admin RPCs; verified new frontend ready; then **Phase B** revokes finance-bearing old order snapshot SELECT only after old clients are accounted for. Never blind db push or auto-repair old migrations. **Production unchanged**: no live DDL/DML, orders, inventory, staff data, PR merge or Production Vercel publish.
