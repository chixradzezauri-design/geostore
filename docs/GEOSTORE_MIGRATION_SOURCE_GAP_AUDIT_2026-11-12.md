# GEOSTORE — Production migration source-gap audit
Date: 2026-11-12
Production project: `xmtnszxtnfxnrojionoa`
Audit branch: `fix/admin-panel-audit-2026-11-10`

## Scope and method
Compared the 93 migration versions recorded by Production with SQL files in the audit branch. For the 24 missing exact-version files, checked all 100 repository branches and queried GitHub commit history for each exact expected migration path. No exact source file or commit was found for these 24 versions.

This is a source-history gap, not proof that the corresponding live schema changes are absent. The live database was inspected read-only. No Production rows, grants, policies, schema, migrations, or deployments were changed by this audit.

## Missing exact source files
- `20261102181854_add_product_purchase_cost`
- `20261103042140_server_checkout_prices_and_store_config`
- `20261103083543_add_optional_customer_email_to_orders`
- `20261103113219_restrict_unused_public_order_tracking_rpc`
- `20261103114054_restrict_anon_products_to_public_catalog_columns`
- `20261103114610_restore_secure_order_tracking_and_admin_notes`
- `20261103114846_protect_product_cost_from_authenticated_customers`
- `20261103114947_optimize_admin_rls_policies_without_changing_access`
- `20261103114954_correct_admin_email_in_message_rls`
- `20261103115012_restore_exact_admin_email_in_rls_policies`
- `20261103115142_move_privileged_rpc_implementations_to_private_schema`
- `20261103115237_keep_current_main_admin_catalog_compatible_until_pr18_merge`
- `20261103124219_grant_admin_product_purchase_cost_write`
- `20261103124349_align_product_admin_access_with_app_metadata`
- `20261103124427_optimize_product_admin_role_policy_jwt_calls`
- `20261103153931_correct_admin_reactivation_email_guard`
- `20261103205301_snapshot_order_item_cost_vendor_category`
- `20261103225225_create_storefront_studio_foundation`
- `20261103225301_tighten_storefront_studio_rls_and_indexes`
- `20261103230610_create_storefront_media_bucket_and_admin_policies`
- `20261107221605_revoke_direct_order_note_column_update`
- `20261110075809_grant_public_product_catalog_read`
- `20261110075829_restrict_public_product_catalog_columns`
- `20261110100653_hide_test_products_from_storefront`

## Live state verified (read-only)

### Checkout and stock
- Production has `private.create_order_with_stock(jsonb)` as SECURITY DEFINER with empty search_path.
- It validates order identity/contact/items and each raw item quantity before aggregation.
- It looks up product and variant prices from the database, validates selected variants, computes add-on fees, coupons and delivery fee server-side, and performs stock deductions in the same transaction as order creation.
- Checkout idempotency data is persisted in `orders.checkout_request` and `orders.checkout_result`; replay requests are compared to the original request.
- Guest checkout email validation is enforced by a database trigger.
- Order status transitions and cancellation stock restoration are guarded by database functions/triggers.
- Customer order history uses `private.get_my_orders()`, which removes purchase-cost, vendor, unit-cost, margin, profit and supplier fields from returned item JSON.
- Guest order tracking uses `private.lookup_order_for_tracking(text,text)`; it bounds inputs, hashes phone/order keys for rate-limit buckets, limits attempts, and returns a constrained order summary.
- Order rows retain historical line snapshots including purchase cost/vendor/category for admin-side historical accounting. Customer-facing history strips those fields.

### Product costs and catalogue
- `products.purchase_cost` exists.
- Admin product listing/saving functions exist in the private schema.
- Public catalogue policies restrict rows to `is_published = true`; the storefront requests an explicit catalogue field list.
- A separate privilege defect was found: authenticated users still had table-level SELECT on `products`, which implicitly included `purchase_cost`. The corrective migration `20261112120000_restrict_authenticated_product_cost_select_again.sql` is staged in this branch only; not applied to Production.

### Storefront studio
- Production tables `storefront_config`, `storefront_media`, and `storefront_versions` exist.
- Their live policies include primary-admin checks for draft/config/media mutations and admin-only access to version history.
- This confirms the tables and policy structures currently exist; it does not recreate the missing original SQL or prove every historical storage-bucket policy is identical to its original migration.

### Order notes and administration
- Production `orders.admin_note` exists.
- Admin note writes use a private SECURITY DEFINER RPC with fixed primary-admin identity and trusted app_metadata role.
- Direct `admin_note` UPDATE is not granted to anon or authenticated roles.
- Public wrapper functions for privileged operations are invoker wrappers; privileged implementations live in the private schema.

## Refreshed release-gate check (2026-11-12, later audit pass)

A fresh read-only comparison was run against the current audit-branch head and the live Production migration ledger:
- Production migration ledger: 93 entries.
- SQL migration files currently in the audit branch: 95.
- Exact Production versions still missing from the branch: 24 (the same 24 listed above).
- Additional branch migration files not present in the Production ledger: 26. These include staged forward fixes and must not be bulk-applied.
- Supabase development branches: none currently exist.
- Project status: `ACTIVE_HEALTHY`; database engine PostgreSQL 17.11 in `us-west-2`.

The comparison confirms that the source gap has not narrowed since the earlier all-branches/commit-history recovery pass. The restored `20261107135028_skip_custom_variant_products_in_flash_sales.sql` is present and matches its ledger version; it is not part of the 24 missing versions.

### Backup capability check
The currently exposed Supabase project tools provide project restore but do not expose a backup creation, backup listing, or export/download operation. The restore operation is destructive and is not a way to create or verify a backup; it was not called. No verified restorable backup ID, timestamp, or restore point was available in this pass. Therefore the backup gate remains **unverified** and must be completed through the Supabase dashboard/provider backup controls or a verified external database export before any Production migration.

### Additional security advisory
Supabase Security Advisor currently reports `auth_leaked_password_protection` as WARN (disabled). This is a separate Auth configuration hardening item; no Auth setting was changed.

## Release decision
Do not create guessed historical migration files, do not substitute similarly named/timestamped SQL, and do not run a blanket `supabase db push`. The migration ledger records these versions as already applied, so recreated same-version files may be skipped by migration tooling and would not safely repair the source-history gap.

The next safe route is to recover original SQL from a verified external backup/export, CI artifact, or archived repository snapshot, or continue object-by-object live-definition reconciliation and create separately versioned, narrowly scoped forward migrations only where an actual defect is proven.

PR #87 remains Draft/unmerged. Production remains unchanged by this audit. A recoverable database backup is still not available under the current Free-plan dashboard view.
