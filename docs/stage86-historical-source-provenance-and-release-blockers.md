# Stage86 — remote-only published-product migration provenance, SQL history risk triage

**NOT RELEASE-READY. Production unchanged. No paid staging.** Draft PR #149 only; current date 2026-11-23.

## Recovered the previously unknown deployed origin

Read-only SQL against Production's already-applied \`supabase_migrations.schema_migrations\` history identifies **version \`20261110100653\`, name \`hide_test_products_from_storefront\`**, containing the existing \`private.reject_unpublished_products_in_new_orders()\` function, corresponding order trigger, and published-product column setup. One applied SQL statement (1,761 characters) has MD5 \`63bf0c1562a9e5f31009bc50e655d642\`. The current live function MD5 is \`83728cba6f42d3c645d7da353a508d0e\`; its installed trigger MD5 is \`36d0286796dc2a750e913c4107028d07\`.

The version and name already occur once in the **135** pinned Production applied migrations, and the original local file \`supabase/migrations/20261110100653_hide_test_products_from_storefront.sql\` does **not** exist in GitHub's 123 migration files. This closes the **origin-identification gap** from Stage85 but **NOT** the broader source-reconstruction and local-history-parity gap. The Stage85 isolated \`tests/stage78-supabase/stage85-live-published-guard.sql\` remains a verified fixture-only copy, NOT a new Production migration. Do not add an already-applied historical migration to the pending release set without separate reconciliation. No remote migrations or customer data were modified.

\`release/stage86-production-only-migration-origin.json\` freezes the version/name, migration source MD5 and length, current function/trigger digests, product published column metadata, applied count, missing Git migration path, and exact Stage85 fixture Git blob SHA. It intentionally stores neither applied SQL body nor customer/product/staff/order records. Its source Git SHA is independently pinned in \`scripts/stage86MissingHistoryProvenanceGate.mjs\` and compared to Stage72/82 history/SQL catalog and fixture code.

Run \`node scripts/stage86MissingHistoryProvenanceGate.mjs --verify-pinned\` offline, with no network keys. A fresh review can run \`release/stage86-read-only-origin-query.sql\` in Supabase's SQL Editor and export its single snapshot plus separately exported 135 migration version/name pairs, then run \`node scripts/stage86MissingHistoryProvenanceGate.mjs --fresh-origin-json /path/origin.json --fresh-migrations-json /path/migrations.json\`. Any drift blocks the release.

## 11 historical executable-SQL divergences — operator risk matrix

All 11 Stage76 discrepancies are pinned unchanged in \`release/stage86-historical-sql-risk-disposition.json\`, classified **9 HIGH**, **1 MEDIUM** (historical order-note statement termination), **1 LOW** (localized variant-stock error text). Every record retains its applied SQL MD5, matching Git blob SHA, bounded current evidence and the explicit status **HISTORICAL_SOURCE_UNRECONCILED_DO_NOT_REPLAY**. Severity is **triage priority, not permission to execute**.

The HIGH cases cover checkout inventory/add-on/snapshot semantics, historical primary-admin AMR login identity, a PUBLIC SECURITY DEFINER/INVOKER order-notification difference, three support-ticket authorization source differences, and inventory replenishment transaction scope. Stage80–85 signed JWT/SQL tests and Stage81–82 metadata help verify **current** behavior. They do not prove all earlier migration SQL semantically equivalent. No historical source can be auto-replayed. The MEDIUM and LOW original files also remain unreconciled, regardless of current runtime behavior.

## Next release gates

The root risk is not solely one missing migration: the actual Production history and local migration files remain divergent (61 same-version content mismatches, 11 executable-token differences, 7 older unregistered files). There is still no complete **full-schema** Production-equivalent local rehearsal; some grants/RLS, inventory/order/customer/support interaction, concurrent clients, and applied function SQL-body parity beyond the pinned tested functions remain unproven.

The only intended release mutations are separately reviewed new pending files in the frozen **Phase A** (3 additive checkout/history redaction and staff ledger RPC SQL files), followed by verified frontend READY, and **Phase B** (1 legacy finance-bearing order snapshot SELECT revocation after old browser tabs have been addressed). Blind \`supabase db push\` or migration history REPAIR is forbidden without a separate controlled reconciliation.

**Production unchanged:** no remote SQL DDL/DML, no customer/order/stock data accessed or mutated, no GitHub merge, no Production Vercel publish, and **no paid staging**.
