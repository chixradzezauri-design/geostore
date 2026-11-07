# GEOSTORE database migration reconciliation

Date: 2026-11-07
Supabase project: `xmtnszxtnfxnrojionoa`
Working branch: `maintenance/storefront-draft-save-2026-11-06`
Reviewed branch commit: `a8b8ac2942bbe6314b875b0d9d73ef33dca69106`

## Current reconciliation status

- Supabase remote migration ledger: **57 applied versions**.
- Working branch: **46 SQL migration files**.
- Exact version-and-name matches: **37**.
- Remote applied versions with no exact matching source file in the working branch: **20**.
- Branch files not present in the remote migration ledger: **9**.
- The migration `20261107110746_enforce_nonnegative_product_stock` is applied remotely and its exact source file is present in the branch.
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
- `20261106200000_prevent_completed_order_status_rollback.sql`
- `20261106210000_validate_checkout_input_on_order_insert.sql`
- `20261106220000_harden_support_ticket_public_insert.sql`
- `20261107001000_add_product_data_integrity_constraints.sql`
- `20261107002000_harden_flash_sale_rounding.sql`
- `20261107010000_add_authenticated_order_history.sql`
- `20261107020000_add_order_status_notifications.sql`
- `20261107030000_preserve_stock_on_admin_product_upsert.sql`

## Read-only live schema inventory

The live catalog was queried across `public` and `private` schemas. Counts at this snapshot:

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

All public tables remain RLS-enabled based on the preceding security audit. No live schema mutation, migration repair, database push, reset, or test-data cleanup was performed in this reconciliation step.

## Confirmed support-intake permission detail

The public support form sends only these five fields: `id`, `customer_name`, `email`, `subject`, and `message`.

The live `public.support_tickets` table currently grants the `anon` role table-level INSERT, which permits attempts to supply all columns. Its RLS insert policy already forces `status = 'ღია'` and `reply IS NULL`, but a caller can still supply `created_at`. The safer target is a column-level INSERT grant for the five form fields only, with the database default controlling `created_at`. This should be a new forward-only migration after the history reconciliation; do not rewrite an already-applied migration.

## Recovery and safety constraints

1. Do not create placeholder/no-op migrations for missing versions.
2. Do not rename a similar migration to impersonate a missing version unless the original SQL is recovered and equivalence is independently verified.
3. Do not run `supabase migration repair`, `supabase db push`, or `supabase db reset` while the source history and live schema have not been reconciled.
4. Do not replay any of the 57 already-applied migrations.
5. Recover exact original SQL where possible. For unrecoverable versions, use the catalogued live schema as a reviewed baseline; do not invent historical SQL.
6. Keep the nine branch-only migrations staged until their effects are individually compared with the live catalog and routines.
7. Once reconciliation is complete, add new forward-only migrations for verified security improvements; do not rewrite historical migration files.

## Next actions

1. Finish classifying the 20 unrecovered historical migrations by their live schema effects and source provenance.
2. Compare all nine branch-only migrations against the live constraints, functions, triggers, policies, grants, and data.
3. Prepare a forward-only least-privilege support INSERT grant migration (five allowed columns only).
4. Validate the flash-sale rounding fix against the live `private.admin_apply_flash_sale` function and test data in a non-production-safe way before any rollout.
5. Run CI/security checks after the source reconciliation commit. Do not trigger a Vercel production deployment until the consolidated release is approved.

## Deployment rule

Vercel production deployment remains intentionally deferred until the complete release review. Avoid repeated builds/deployments while the free account's usage limits are a concern.
