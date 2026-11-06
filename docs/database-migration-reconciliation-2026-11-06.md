# GEOSTORE database migration reconciliation
Date: 2026-11-06
Project: `xmtnszxtnfxnrojionoa`
Branch: `maintenance/security-cleanup-2026-11-06`

## Read-only findings

- Supabase remote migration ledger: **47 applied versions**.
- Current maintenance branch: **24 SQL migration files**.
- Applied remote versions with no same-version/same-name file in this branch: **23**.
- The 24 branch files are recorded as present in the remote ledger; this is a filename/version comparison only, not a checksum verification.
- No schema changes, migration repairs, migration pushes, resets, or live data edits were performed during this audit.

## Missing migration source files

The following remote ledger entries do not have a matching file in the current branch:

- `20261102181854_add_product_purchase_cost.sql`
- `20261103042140_server_checkout_prices_and_store_config.sql`
- `20261103044438_add_idempotent_checkout_replay.sql`
- `20261103044704_validate_checkout_idempotency_payload.sql`
- `20261103044919_minimize_checkout_idempotency_snapshot.sql`
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

## Recovery constraints

1. Do not create placeholder/no-op migrations for these versions.
2. Do not rename a similar migration from another branch to one of these versions unless its original SQL is recovered and its equivalence is independently verified.
3. Do not run `supabase migration repair`, `supabase db push`, or `supabase db reset` while the source history and live schema have not been reconciled.
4. Recover exact SQL from the original commits/PR branches where possible. Preserve original ordering and content.
5. For any migration whose original SQL cannot be recovered, capture the live schema as a reviewed baseline only after cataloguing tables, columns, constraints, indexes, RLS policies, grants, triggers, views, functions, storage buckets, and extensions.
6. A schema dump/baseline is not permission to replay all migrations against production. Existing 47 versions are already applied.

## Supabase CLI v3 caution

Supabase CLI v3 changes database commands to target the local stack by default; hosted operations require explicit remote targeting and confirmation. Before adding any CI or operator commands, review the current CLI v3 migration guide. The project must not rely on old `--linked` assumptions or run a remote mutation accidentally.

## Verification status

- This document records a read-only reconciliation snapshot.
- Latest branch build and dependency audit passed on commit `4144cbf28e0936f4a2fd6ad69edff5576beff7f4`.
- CodeQL completed successfully on that same commit.
- Vercel check remains blocked by the account's build-rate limit, not by a reported application build error.
