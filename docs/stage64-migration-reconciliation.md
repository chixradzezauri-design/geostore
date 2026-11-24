# Stage 64 — migration reconciliation and legacy checkout compatibility

**Draft PR #149; NOT RELEASE-READY.** This is a read-only comparison, not a migration. Do not create staff accounts, place live orders, alter Supabase schemas/history or merge/deploy as part of this audit.

## 1. The live status, confirmed 2026-11-22

- The connected production Supabase PostgreSQL 17 project has **135 applied migration history rows**; the Draft PR branch has **122 migration SQL files**. **80** local version numbers were present in the live history; **42** were not. **32** of the 42 unmatched files correspond by normalized name to a live record with a different timestamp; **7** older entries have no matching name; the last **3** are the pending Stage51/54/57 redaction and order-ledger migrations. Four logical migration names repeat locally, under different versions.
- Never infer that same-name migrations have equal SQL. Do not blindly run supabase db push, migration repair, or all 122 SQL files. Timestamped migration history and live SQL definitions require reconciliation against an isolated full-schema database first.
- Read-only permission checks: neither anon nor authenticated currently has table INSERT privileges on public.orders; the public create_order_with_stock RPC calls a server-side private checkout function. The private implementation recognizes custom_variant_id, selected_size, available_sizes, gift_wrap and purchase_cost. The public response still needs the staged financial redaction release gate.
- The original orders_validate_item_variants and validate_order_checkout_input_before_insert triggers, and their source functions, are absent from the live catalog. Do not assert that the original migration SQL was deployed simply because another checkout validation exists.
- The legacy variant trigger in 20261106120000_validate_order_item_variants.sql checks selected sizes/colors only against products.available_sizes and available_colors, with no custom_variant_id exception. The existing real checkout supports **custom variants with separate stock and selected size/color fields**. Therefore the legacy variant trigger is a **potentially incompatible** migration, not automatically a missing security fix. **DO NOT apply** this old trigger without an isolated custom-variant checkout/cancel/reactivate regression, or without a separately reviewed replacement. Also do not drop any existing live triggers as a "cleanup."
- The old 20261106210000_validate_checkout_input_on_order_insert.sql creates another insert trigger. Before replay, prove it doesn't conflict with current private checkout snapshots, guest email rules, live order/notification triggers or historical orders. Do not infer safety from syntax alone.
- Five other older unmatched effects are substantially present in the live catalog: support INSERT columns are scoped, private order tracking rate-limit table has RLS, the support-tickets table is in the Realtime publication, private.admin_list_products exists, and custom-variant checkout RPC exists. Presence is not proof of identical function bodies or migration-history equivalence. No real order, customer, expense or Auth row was inspected.

## 2. New safe classification tool

A new independent, **read-only** CLI prints the exact version/name differences. It only reads locally exported migration metadata and filenames, never Supabase credentials or data rows:

~~~shell
node scripts/stage64MigrationHistoryAudit.mjs /path/to/supabase-migration-metadata.json
~~~

Input format (manually exported via approved read-only project access):

~~~json
{
  "migrations": [
    {"version": "20261120124250", "name": "storefront_publish_concurrency_safe_compat"}
  ]
}
~~~

- Exit **2** = unresolved version/name drift; release remains blocked.
- Exit **1** = invalid or missing input.
- Exit **0** = version/name lists match. This is still **not staging approval**, proof of identical SQL content, or permission to deploy.
- The tool separates same-name/different-version, same-version/different-name, duplicate local/remote versions, duplicate logical names, old unmatched files, explicitly pending migrations and remote-only history. It deliberately neither repairs history nor executes SQL.

Do not put service keys, DB credentials, customer details, or complete SQL function bodies into this metadata file.

## 3. Staging-only release gates

1. Use a fully isolated **full-schema staging** Supabase project, after explicit approval of any new compute cost. Populate only generated fixtures and authorized staging accounts.
2. Review every remote-only and locally unmatched migration, compare actual SQL/function definitions, trigger ordering, grants and resulting live catalog. Resolve logical duplicates without changing production migration-history records. A matching name alone is insufficient.
3. For the obsolete legacy variant trigger, submit a staging custom-variant product with independent combinations (such as S/Red and M/Blue) and nonzero stock. Verify checkout, idempotent replay, cancellation, reactivation, status transitions, no double deduction and exact inventory ledger movements. Repeat with invalid size/color and insufficient stock, ensuring atomic failure.
4. Confirm direct table order INSERT remains denied to anon/authenticated and legitimate public checkout continues through the validated RPC; test malformed guest input and invalid product options. Exercise staff orders-only, expenses-only, products-only, owner and normal customer JWTs; verify no cost/finance fields leak and insufficient permissions fail closed.
5. Only after version/SQL reconciliation should the three separate Stage51/54/57 migrations be applied in a controlled staging sequence. Run tests/sql/stage63_full_schema_release_gate.sql read-only against that full staging database after the migrations. Authenticated staff and owner end-to-end checks are also mandatory.
6. Once all gates pass, request **new explicit approval** for a coordinated Production release. No automated script in Stage64 performs a migration or deployment.

## 4. CI incident addressed in Stage64

- Prior Stage63 final HEAD 0608f810fedcfcb6a3c218806d7121e3fa38fbc9 had 5 successful GitHub Actions checks, but Responsive Browser smoke failed at realStorefrontSmoke.mjs line 84 after a 5-second wait on a mobile category selection.
- The assertion previously keyed the selected card by aria-label, which includes an **asynchronous product count**. The product count can change when the category is chosen even though its stable visible title remains the same.
- Stage64 changed only that test's identity matcher to the stable title (still requiring the exact card's aria-pressed=true after Enter, and checking keyboard focus). No application category code, business logic, or layout changed.
- All new commits must be validated on the exact final PR HEAD; do not claim the CI failure is resolved until the responsive workflow succeeds.

**Status:** PR remains Draft, Production and live Supabase untouched, full-schema staging outstanding, migration reconciliation blocking release.
