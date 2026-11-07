# Supabase migration reconciliation snapshot

Checked against project `xmtnszxtnfxnrojionoa` and branch `design/neo-editorial-2026-11-07` on 2026-11-08.

## Current result

- Remote migration history entries: 67
- SQL migration files in branch: 67
- Duplicate migration versions in branch: 0
- Remote-applied versions without a matching SQL file in this branch: 20
- Branch SQL migrations not recorded as applied remotely: 20

**Do not apply pending branch migrations to production as a batch.** The remote history and checked-in migration set have diverged. Some schema changes may already exist because migrations were previously applied through another workflow, and some branch migrations may still be unapplied. Reconcile the actual schema/function/policy state for each migration before applying anything.

## Remote-applied versions missing from this branch

- `20261102181854` — `add_product_purchase_cost`
- `20261103042140` — `server_checkout_prices_and_store_config`
- `20261103083543` — `add_optional_customer_email_to_orders`
- `20261103113219` — `restrict_unused_public_order_tracking_rpc`
- `20261103114054` — `restrict_anon_products_to_public_catalog_columns`
- `20261103114610` — `restore_secure_order_tracking_and_admin_notes`
- `20261103114846` — `protect_product_cost_from_authenticated_customers`
- `20261103114947` — `optimize_admin_rls_policies_without_changing_access`
- `20261103114954` — `correct_admin_email_in_message_rls`
- `20261103115012` — `restore_exact_admin_email_in_rls_policies`
- `20261103115142` — `move_privileged_rpc_implementations_to_private_schema`
- `20261103115237` — `keep_current_main_admin_catalog_compatible_until_pr18_merge`
- `20261103124219` — `grant_admin_product_purchase_cost_write`
- `20261103124349` — `align_product_admin_access_with_app_metadata`
- `20261103124427` — `optimize_product_admin_role_policy_jwt_calls`
- `20261103153931` — `correct_admin_reactivation_email_guard`
- `20261103205301` — `snapshot_order_item_cost_vendor_category`
- `20261103225225` — `create_storefront_studio_foundation`
- `20261103225301` — `tighten_storefront_studio_rls_and_indexes`
- `20261103230610` — `create_storefront_media_bucket_and_admin_policies`

## Branch migrations not recorded as applied remotely

- `20261106120000_validate_order_item_variants.sql`
- `20261106210000_validate_checkout_input_on_order_insert.sql`
- `20261106220000_harden_support_ticket_public_insert.sql`
- `20261107001000_add_product_data_integrity_constraints.sql`
- `20261107002000_harden_flash_sale_rounding.sql`
- `20261107020000_add_order_status_notifications.sql`
- `20261107153000_enable_rls_order_tracking_rate_limits.sql`
- `20261107170000_integrate_custom_product_variants.sql`
- `20261107172000_stabilize_admin_product_order.sql`
- `20261107180000_redact_internal_fields_from_customer_order_history.sql`
- `20261107181500_skip_custom_variant_products_in_flash_sales.sql`
- `20261107190000_restrict_public_storefront_config_columns.sql`
- `20261107200000_bind_order_ownership_to_auth_user_uuid.sql`
- `20261107230000_require_configured_product_options.sql`
- `20261107233000_bound_variant_stock_on_cancellation.sql`
- `20261107234500_harden_order_json_and_variant_integrity.sql`
- `20261107235000_enforce_checkout_pricing_precision.sql`
- `20261107241000_revoke_direct_order_note_column_update.sql`
- `20261108001000_validate_variant_price_precision.sql`
- `20261108010000_add_product_optimistic_version.sql`

## Product cross-session concurrency release dependency

The staged migration `20261108010000_add_product_optimistic_version.sql` adds `products.updated_at` and `products.version`, a version-bump trigger, and version-checked admin update/delete/variant-stock RPCs. The application now selects those two fields and uses the version-checked endpoints.

**Release order:** reconcile and safely apply the required database migration first, then deploy the matching application code. Deploying the app before the database migration will make the catalogue query request columns that do not yet exist.

No production migration was applied during this check. No product/order rows were changed.
