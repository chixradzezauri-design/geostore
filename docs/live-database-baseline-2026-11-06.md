# GEOSTORE live database baseline (read-only)

- Captured: 2026-11-06
- Supabase project: `xmtnszxtnfxnrojionoa`
- Source: live PostgreSQL catalog queries through Supabase SQL
- Scope: inventory only; this is **not** a replayable schema dump and must not be used as migration SQL.
- Changes made while capturing: none. No DDL, DML, migration repair, migration push, reset, or storage operation was run.

## Migration ledger reconciliation

- Live Supabase migration ledger: 47 applied versions.
- Maintenance branch migration directory: 24 SQL files (per the reconciliation snapshot).
- 23 applied versions have no same-version/same-name source file in the branch.
- This filename comparison does not prove schema equivalence or identify the original SQL.
- Three current staged checkout/order migrations remain unapplied and must not be pushed until the historical source history is reconciled:
  - `20261106120000_validate_order_item_variants.sql`
  - `20261106200000_prevent_completed_order_status_rollback.sql`
  - `20261106210000_validate_checkout_input_on_order_insert.sql`

## Public schema inventory

Catalog snapshot:
- 10 public tables/views
- 98 public columns
- 34 public constraints
- 17 public indexes
- 34 public RLS policies
- 2 non-internal public-table triggers
- 9 public functions
- 11 private functions
- 5 installed extensions

Public base tables:
- `expenses`
- `messages`
- `orders`
- `products`
- `store_coupons`
- `store_delivery_fees`
- `storefront_config`
- `storefront_media`
- `storefront_versions`
- `support_tickets`

## Constraints and indexes

Observed constraints include:
- Primary keys on all ten listed tables.
- `products_purchase_cost_check`: purchase cost is null or non-negative.
- Coupon uniqueness and discount/minimum-order checks.
- Delivery region allowlist and non-negative delivery fee.
- Storefront config JSON-object and non-empty-key checks.
- Storefront media non-empty path/URL, non-negative size, unique storage path.
- Storefront version foreign keys to config and auth users, plus JSON-object snapshot check.
- Support ticket ID/name/message/subject/email/reply length checks.

Observed indexes (17):
- Primary/unique indexes for core tables and coupon/config/media/version keys.
- Storefront-specific indexes: `storefront_config_updated_by_idx`, `storefront_media_created_by_idx`, `storefront_media_folder_created_idx`, `storefront_versions_config_created_idx`, `storefront_versions_created_by_idx`.
- No index was added or removed during this audit.

## Live triggers

Enabled triggers on public tables:
- `orders_set_status_changed_at` on `public.orders`, BEFORE UPDATE OF status, invokes `private.set_order_status_changed_at()`.
- `prevent_cancellation_after_dispatch` on `public.orders`, BEFORE UPDATE OF status, invokes `private.prevent_cancellation_after_dispatch()`.

Not present in the live trigger inventory:
- `orders_validate_item_variants`
- `validate_order_checkout_input_before_insert`

The checkout RPC itself validates raw line structure and quantity bounds and preserves selected size/color in order snapshots. It does **not** currently validate the selected size/color against each product's catalogue `available_sizes`/`available_colors`. Treat this as a known server-side validation gap, not as evidence that the staged migrations are safe to apply.

## Live function inventory and security posture

Private functions (11):
- `admin_apply_flash_sale(numeric, text)`
- `admin_delete_product(text)`
- `admin_list_products()`
- `admin_reactivate_cancelled_order(text)`
- `admin_save_order_note(text, text)`
- `admin_save_product(jsonb)`
- `admin_update_order_status(text, text)`
- `create_order_with_stock(jsonb)`
- `lookup_order_for_tracking(text, text)`
- `prevent_cancellation_after_dispatch()`
- `set_order_status_changed_at()`

Public functions (9) are invoker wrappers for the public RPC names above:
- `admin_apply_flash_sale(numeric, text)`
- `admin_delete_product(text)`
- `admin_list_products()`
- `admin_reactivate_cancelled_order(text)`
- `admin_save_order_note(text, text)`
- `admin_save_product(jsonb)`
- `admin_update_order_status(text, text)`
- `create_order_with_stock(jsonb)`
- `lookup_order_for_tracking(text, text)`

Catalog inspection showed:
- All 11 private functions use an empty `search_path`.
- Privileged private RPC implementations use SECURITY DEFINER and perform primary-admin identity/role checks where applicable.
- Public RPC wrappers are SECURITY INVOKER and delegate to the private implementations.
- Guest checkout and phone-verified order tracking have anonymous execute grants by design; admin mutation functions are not intended for anonymous use.
- The checkout function calculates prices, coupon discount, delivery fee, and total from server-side catalogue/config records; locks products and deducts stock transactionally; supports idempotent replay; and stores purchase-cost snapshots.
- The checkout function preserves selected size/color in each order line, but catalog membership validation for those variants remains absent.

## Storage

One bucket was returned by the live storage catalog:
- `storefront-media`
- Public: true
- File size limit: 5,242,880 bytes (5 MiB)
- Allowed MIME types: JPEG, PNG, WEBP, GIF

This inventory does not validate individual stored objects or storage-object policies. Those require a separate policy and object audit.

## Extensions

- `pg_stat_statements` 1.11
- `pgcrypto` 1.3
- `plpgsql` 1.0
- `supabase_vault` 0.3.1
- `uuid-ossp` 1.1

## Important privilege-review note

The catalog exposes broad table-level grants to `authenticated` on several admin-managed tables (for example product write privileges and order DELETE), with row-level policies providing the effective row authorization boundary. This baseline records grants separately from RLS; neither layer should be judged in isolation. Before any privilege cleanup, compare exact policies and all active client operations so that checkout, admin CRUD, support submission, and storefront publishing are not broken.

The anonymous role has intended access paths including public catalog/config reads, coupon/delivery reads, support-ticket submission, guest checkout, and phone-verified tracking. Confirm each against the exact policy and function definition before changing it.

## Next required work

1. Recover original missing migration SQL from historical PR commits/branches where available; do not synthesize SQL based only on names.
2. Build a complete reviewed schema baseline including every column/default, constraint, index, RLS policy, table/column/function grant, trigger, function definition, view, storage policy, bucket, and extension.
3. Compare the baseline with every tracked migration and the live migration ledger.
4. Resolve discrepancies in a dedicated maintenance branch; never run `db push`, `migration repair`, or `db reset` against production during reconciliation.
5. Only then review and separately approve the outstanding checkout validation and order-status migrations.

## Verification boundary

This file is an inventory summary from read-only catalog queries. It is not a complete SQL dump, does not include every policy/function body, and is not proof that every historical migration source has been recovered.
