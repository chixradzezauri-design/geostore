# GEOSTORE database migration reconciliation

Date: 2026-11-07
Supabase project: `xmtnszxtnfxnrojionoa`
Working branch: `maintenance/storefront-draft-save-2026-11-06`
Reviewed branch commit: `284511356901059dcaa19ece3a0e1d90d29b2eb8`

## Reconciliation baseline snapshot — 2026-11-06

- Supabase remote migration ledger at this snapshot: **58 applied versions**.
- Working branch: **44 SQL migration files**.
- Exact version-and-name matches: **38**.
- Remote applied versions with no exact matching source file in the working branch: **20**.
- Branch files not present in the remote migration ledger: **6**.
- The migrations `20261107110746_enforce_nonnegative_product_stock` and `20261107115218_persist_checkout_addons_server_pricing` are applied remotely and their exact source files are present in the branch.
- Three exact historical source files were recovered from the original Git object history/known source branches and restored without executing them again:
  - `20261103044438_add_idempotent_checkout_replay.sql`
  - `20261103044704_validate_checkout_idempotency_payload.sql`
  - `20261103044919_minimize_checkout_idempotency_snapshot.sql`
- The existing `20261103121325_persist_admin_coupons_and_delivery_fees.sql` source was checked against the original source branch and is already present in this branch.
- GitHub path-history lookup for the remaining 20 exact missing filenames returned no commits. Their original SQL has not yet been recovered.

## Remote applied versions without exact branch source

- `20261102181854_add_product_purchase_cost.sql`
- `20261103042140_server_checkout_prices_and_store_config.sql`
- `20261103083543_add_optional_customer_email_to_orders.sql`
- `20261103113219_restrict_unused_public_order_tracking_rpc.sql`
- `20261103114054_restrict_anon_products_to_public_catalog_columns.sql`
- `20261103114610_restore_secure_order_tracking_and_admin_notes.sql`
- `20261103114846_protect_product_cost_from_authenticated_customers.sql`
- `20261103114947_optimize_admin_rls_policies_without_changing_access.sql`
- `20261103114954_correct_admin_email_in_message_rls.sql`
- `20261103115012_restore_exact_admin_email_in_rls_policies.sql`
- `20261103115142_move_privileged_rpc_implementations_to_private_schema.sql`
- `20261103115237_keep_current_main_admin_catalog_compatible_until_pr18_merge.sql`
- `20261103124219_grant_admin_product_purchase_cost_write.sql`
- `20261103124349_align_product_admin_access_with_app_metadata.sql`
- `20261103124427_optimize_product_admin_role_policy_jwt_calls.sql`
- `20261103153931_correct_admin_reactivation_email_guard.sql`
- `20261103205301_snapshot_order_item_cost_vendor_category.sql`
- `20261103225225_create_storefront_studio_foundation.sql`
- `20261103225301_tighten_storefront_studio_rls_and_indexes.sql`
- `20261103230610_create_storefront_media_bucket_and_admin_policies.sql`

## Branch-only migrations; do not replay without reconciliation

- `20261106120000_validate_order_item_variants.sql`
- `20261106210000_validate_checkout_input_on_order_insert.sql`
- `20261106220000_harden_support_ticket_public_insert.sql`
- `20261107001000_add_product_data_integrity_constraints.sql`
- `20261107002000_harden_flash_sale_rounding.sql`
- `20261107020000_add_order_status_notifications.sql`

## Read-only live schema inventory

The live catalog was queried across `public` and `private` schemas before the checkout add-on migration. Counts at that snapshot:

| Catalog object | Count |
| --- | ---: |
| Tables | 13 |
| Columns | 110 |
| Constraints | 41 |
| Indexes | 25 |
| RLS policies | 30 |
| Non-internal triggers | 4 |
| Routines | 30 |
| Ordinary views | 0 |
| Table-level grants | 197 |
| Column-level grants | 1,137 |
| Extensions | 5 |
| Storage buckets | 1 |

All public tables remain RLS-enabled based on the preceding security audit. The initial reconciliation inventory was read-only. After that snapshot, the forward-only checkout add-on migration `20261107115218_persist_checkout_addons_server_pricing` was applied; its transactional verification rolled back all test orders and stock changes. Current order count remains zero.

## Confirmed support-intake permission detail

The public support form sends only these five fields: `id`, `customer_name`, `email`, `subject`, and `message`.

The live `public.support_tickets` table currently grants the `anon` role table-level INSERT, which permits attempts to supply all columns. Its RLS insert policy already forces `status = 'ღია'` and `reply IS NULL`, but a caller can still supply `created_at`. The safer target is a column-level INSERT grant for the five form fields only, with the database default controlling `created_at`. This should be a new forward-only migration after the history reconciliation; do not rewrite an already-applied migration.

## Branch-only migration conflict review

Three branch-only migration files were removed from the working branch after live catalog inspection:

- `20261107010000_add_authenticated_order_history.sql`: the live `private.get_my_orders()` already exists with a `RETURNS TABLE(...)` signature. The staged file attempts `CREATE OR REPLACE FUNCTION` with `RETURNS jsonb`, which PostgreSQL cannot apply as a return-type change. The live implementation must be reviewed and retained rather than overwritten.
- `20261107030000_preserve_stock_on_admin_product_upsert.sql`: the live `private.admin_save_product(jsonb)` is intentionally insert-only to prevent ID collisions from overwriting existing product data. The staged file would replace it with an UPSERT. Although that version preserves stock, it reintroduces the previously fixed product-ID overwrite risk.

- `20261106200000_prevent_completed_order_status_rollback.sql`: its three function bodies and the status-transition trigger are already present in the live database with equivalent behavior. Catalog output omits default `SECURITY INVOKER` and normalizes `SET search_path` syntax; the executable logic matches. Its order-delete grant/policy restrictions are also already in place. Replaying it would only drop/recreate the existing trigger and replace equivalent functions.

These deletions affect only unapplied files in the working branch; no production database objects or data were changed.

## Remaining branch-only migration review

- `20261106120000_validate_order_item_variants.sql` has no corresponding live trigger, but the only permitted order-creation path is the protected checkout RPC, which already checks selected sizes and colors against the product catalogue. Direct INSERT is not granted to `anon` or `authenticated`; keep this as optional defense-in-depth pending review.
- `20261106210000_validate_checkout_input_on_order_insert.sql` has no corresponding live trigger, but direct INSERT is not granted to `anon` or `authenticated`, and the protected checkout RPC already validates customer name, phone, address, email, item shape, quantity, and selected options. Keep staged until its additional trigger checks are compared against the RPC to avoid duplicate or conflicting validation.
- `20261106220000_harden_support_ticket_public_insert.sql` is a valid staged least-privilege improvement: it restricts anonymous INSERT to the five fields the browser sends. It is not applied because migration history remains unreconciled.
- `20261107001000_add_product_data_integrity_constraints.sql` has no matching live checks except existing nonnegative stock and purchase-cost checks. The current product rows produced zero violations for the proposed limits.
- `20261107002000_harden_flash_sale_rounding.sql` addresses a confirmed live gap: the current flash-sale function does not enforce two-decimal discount precision and updates rows even when the rounded price is unchanged.

## Recovery and safety constraints

1. Do not create placeholder/no-op migrations for missing versions.
2. Do not rename a similar migration to impersonate a missing version unless the original SQL is recovered and equivalence is independently verified.
3. Do not run `supabase migration repair`, `supabase db push`, or `supabase db reset` while the source history and live schema have not been reconciled.
4. Do not replay any already-applied migration; the live ledger has since advanced to 67 versions (latest: 20261107160152).
5. Recover exact original SQL where possible. For unrecoverable versions, use the catalogued live schema as a reviewed baseline; do not invent historical SQL.
6. Keep every remaining branch-only migration staged until its effects are individually compared with the live catalog and routines.
7. Once reconciliation is complete, add new forward-only migrations for verified security improvements; do not rewrite historical migration files.

## Next actions

1. Finish classifying the 20 unrecovered historical migrations by their live schema effects and source provenance.
2. Complete equivalence review of the overlapping order-status trigger/function migration.
3. Keep the verified support INSERT least-privilege migration staged until history reconciliation is complete.
4. Validate and prepare the flash-sale rounding fix and product data constraints for a safe forward-only migration.
5. Decide whether order-status notifications are a wanted feature before adding their table/functions; no live notification table currently exists.
6. Run CI/security checks after the latest source changes. Do not trigger a Vercel production deployment until the consolidated release is approved.

## Deployment rule

Vercel production deployment remains intentionally deferred until the complete release review. Avoid repeated builds/deployments while the free account's usage limits are a concern.

## Live migration and custom-variant follow-up — 2026-11-07

A fresh read-only Supabase migration-ledger query reports **67 applied versions**, with latest applied version 20261107160152_minimize_customer_order_history_payload. The custom-variant integration migration 20261107170000_integrate_custom_product_variants and the admin variant-restock migration 20261107230000_admin_adjust_product_variant_stock are not applied.

Read-only live catalog checks confirmed:
- private.create_order_with_stock(jsonb) already accepts custom variant IDs, snapshots the selected variant, prices variants from the database, and calculates gift-wrap (+5 GEL) and VIP-warranty (+15 GEL) fees server-side.
- The live order function still uses LIMIT 1 for variant lookup and does not perform an exact-one-match check; its variant fingerprint ordering is not deterministic when one product has multiple variants with identical size/color.
- private.preserve_product_variant_stock() already protects existing variant stock and blocks removal/reuse of IDs referenced in order history. A separate database validator for duplicate variant IDs/names is not yet present.
- The live products table currently contains one product with an empty variants array. The read-only duplicate-ID and duplicate-name check returned zero duplicates.

Staged corrections:
- 20261107170000_integrate_custom_product_variants.sql now checks that each requested custom variant ID resolves to exactly one catalogue entry, makes the variant/customization fingerprint and order-line ordering deterministic, rejects malformed custom-variant/gift-message types, and installs a final database trigger that rejects duplicate IDs/names and invalid variant stock/identity on insert or update.
- 20261107230000_admin_adjust_product_variant_stock.sql adds the RPC already called by the admin UI. It uses row locking, a signed inventory delta, exact-one-variant matching, bounds checks, an authenticated RLS-respecting implementation, and an invoker-only public wrapper.
- Apply these in timestamp order only after migration-history reconciliation. The admin stock-adjustment UI must not be deployed before its RPC migration is applied.

Both staged migrations were executed together against the live schema inside an explicit BEGIN ... ROLLBACK transaction. PostgreSQL accepted the DDL and function definitions. A post-rollback read-only query confirmed that the new RPCs and validator trigger were not persisted. No live migration, product row, order, or stock value was changed.


## Fresh live reconciliation addendum — 2026-11-07 evening

A second direct read-only inspection was completed after the earlier reconciliation notes. The current live migration ledger still reports 67 applied versions, latest `20261107160152_minimize_customer_order_history_payload`. Exact SQL counts now return 0 rows in `public.orders`, 1 in `public.products`, 1 in `public.expenses`, and 0 in `public.order_notifications`. The sole product has base stock 61 and an empty `variants` array. This exact count supersedes the older 21-order snapshot in the previous order-stock audit; no stock changes or historical backfills are justified by that stale snapshot.

### Additional live function/trigger review

- The live checkout function already contains server-side custom variant pricing and stock deduction, plus server-calculated gift-wrap and VIP-warranty fees. The live product trigger already preserves variant stock and blocks deletion/reuse of variants referenced by historical order items.
- The live trigger does not reject duplicate variant IDs or case-insensitive duplicate variant names.
- Live cancellation and reactivation functions still combine JSON array-type validation with `jsonb_array_length` in one Boolean `OR` expression. The validation has been split in the new forward-only migration to avoid relying on expression short-circuit evaluation.
- The live migration ledger does not list the custom-variant integration migration or the admin variant stock RPC migration, even though several related custom-variant functions/triggers are already present in the live catalog. Treat this as migration-history/schema drift; compare definitions and object ownership before applying any overlapping migration.
- The admin dashboard calls `public.admin_adjust_product_variant_stock`, but that RPC is not yet present in the live database. The UI must not be deployed until the reviewed RPC migration is applied.
- Security advisor output reports four RLS-enabled tables with no policies: three private rate-limit/activity tables and `public.order_notifications`. These currently fail closed under RLS; access to notifications is via restricted RPCs. The advisor also reports leaked-password protection disabled, which requires enabling in Supabase Auth settings.
- Performance advisor reports four unused indexes on low-volume storefront/notification tables. No index was removed because an unused-index warning alone is not enough evidence to remove potentially useful indexes.

### New staged forward-only work

- `20261107234500_harden_order_json_and_variant_integrity.sql` updates the live cancellation/reactivation function definitions with separate JSON array-type and array-length checks, and extends the existing stock-preservation trigger to reject duplicate variant IDs and case-insensitive duplicate names.
- `tests/databaseMigrationSafety.test.js` adds static regression checks for the new guards, variant uniqueness checks, admin stock RPC authorization/locking, and the UI's request-lock lifecycle.

The migration and test files are saved on `design/neo-editorial-2026-11-07` only. No Supabase migration was applied, no live row was changed, and no Vercel build or deployment was triggered. The SQL migration has not yet been executed in a staging database; the new Node test has been added but the complete Node suite has not been run.


### Customer order-history exposure confirmed in live catalog

A fresh read-only `pg_get_functiondef('private.get_my_orders()')` confirms the live function returns `coalesce(o.items, '[]'::jsonb)` unchanged. The order item snapshot contains internal `purchase_cost`, `vendor`, and `category` fields, so those values are sent to authenticated customers even though the profile UI does not render them. The exact current `public.orders` row count is zero, so no existing order rows were exposed in this snapshot; the function is still unsafe for future orders.

The staged `20261107200000_bind_order_ownership_to_auth_user_uuid.sql` addresses this by:
- binding orders and notifications to immutable Auth UUIDs rather than mutable email strings;
- returning only customer-facing order item fields from `private.get_my_orders()`;
- excluding internal purchase cost, vendor, and category values;
- preserving the public wrapper as SECURITY INVOKER while keeping the private implementation SECURITY DEFINER.

A regression check was added to `tests/databaseMigrationSafety.test.js`. The live migration is still pending; do not deploy customer order-history code that expects `user_id` until the reviewed database migration has been applied.


## Transaction-level validation update — 2026-11-07

The following staged migrations were loaded together against the current live schema inside one explicit transaction: 20261107170000_integrate_custom_product_variants, 20261107200000_bind_order_ownership_to_auth_user_uuid, 20261107230000_admin_adjust_product_variant_stock, and 20261107234500_harden_order_json_and_variant_integrity.

Under the authenticated role with the configured admin JWT claims, a temporary rollback-only integration test verified:
- the variant restock RPC increments only the requested variant and rejects an oversell delta;
- a stale editor payload cannot overwrite the current variant stock while changing its price;
- duplicate variant IDs and case-insensitive duplicate names are rejected;
- cancelling an order restores the custom variant stock once;
- repeating cancellation does not double-restore stock;
- protected reactivation deducts the variant stock again, and a subsequent cancellation restores it again.

The first test fixture used the same transaction-start now() timestamp for initial deduction and reactivation. The status guard correctly rejected a non-increasing stock_deducted_at value. The fixture was corrected to represent a prior transaction; the complete integration test then passed. This was a test-fixture issue, not a production reactivation defect.

The transaction was rolled back. A post-rollback read-only query confirmed that the temporary products/order, stock RPC functions, and validator trigger were not persisted. The remote migration ledger remains unchanged at 67 applied versions, latest 20261107160152. No live migration or production data change was made.

The static Node regression tests were extended but not executed. A staging-database migration run, full Node suite, browser QA and production deployment are still required before release.


## Order ownership migration repair and end-to-end rollback verification — 2026-11-07

The combined dry-run exposed malformed duplicated SQL in 20261107200000_bind_order_ownership_to_auth_user_uuid.sql. The stray fragment began with a bare THEN after the first notification-function grants and repeated already-complete checkout/history/notification definitions. The duplicate tail was removed; the migration now ends after the first complete set of functions.

All four pending migrations (20261107170000, 20261107200000, 20261107230000, 20261107234500) were then loaded together against the live schema inside BEGIN ... ROLLBACK. The authenticated functional test passed:
- Order insert owner was bound to auth.uid() by the trigger.
- Customer order history returned the owner's order, retained custom-variant display fields, and omitted purchase_cost/vendor/category.
- A different authenticated UUID saw no orders or notifications and could not mark the owner's notifications read; the actual owner could read and mark their notifications.
- Variant stock RPC increment, oversell rejection, stale-editor stock preservation, duplicate ID/name rejection, cancellation restore-once, and protected reactivation/re-deduction all passed.

The transaction was rolled back. Post-rollback checks confirmed no temporary product/order rows, RPCs, validator trigger, or orders.user_id column remained. The live migration ledger and production data were unchanged. Node regression tests were updated but not run; no staging database migration, production migration, browser QA, build, or deployment was performed.


## Supabase advisor follow-up — 2026-11-07

Latest advisor snapshot: no health findings; one security WARN remains for Auth leaked-password protection being disabled. The owner must enable it manually in Supabase Auth settings. The RLS-enabled/no-policy INFO findings are limited to private rate-limit/activity tables and public.order_notifications, which has no direct client SELECT privilege and is consumed through owner-filtered RPCs. No public SECURITY DEFINER functions or private SECURITY DEFINER functions with a non-empty search_path were found. Four currently-unused indexes were left intact because the project has very low traffic and their future use is not yet measurable. No live settings, indexes, grants, policies or rows were changed.
