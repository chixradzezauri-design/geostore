# GEOSTORE administrator and financial-data privilege audit — 2026-11-12

## Scope

Read-only Production review of database grants, RLS policies, admin RPCs, and frontend write paths for orders, products/inventory, expenses, coupons, delivery fees, support tickets, and storefront configuration.

## Verified protections

- `public.orders`: authenticated has SELECT only; no direct INSERT, UPDATE, or DELETE column grants. RLS limits order reads/updates to the fixed primary-admin identity with trusted `app_metadata.role = 'admin'`. Order status and stock transitions are performed through guarded SECURITY DEFINER RPCs with row locks and stock restoration/reactivation checks.
- `private.admin_update_order_status`, `private.admin_reactivate_cancelled_order`, `private.admin_save_order_note`, product stock RPCs, flash-sale RPC, and product create/update RPCs use SECURITY DEFINER and empty search_path. The inspected admin functions check the fixed primary-admin identity and trusted app_metadata role. Reactivation additionally requires recent password authentication and atomically re-deducts stock.
- `public.expenses`: authenticated CRUD grants exist, but the single ALL policy requires both the fixed primary-admin UID and trusted admin app_metadata. The frontend uses authenticated direct CRUD; removing these grants would break current admin workflows, so they are not changed here.
- Coupons, delivery fees, storefront configuration/media, and support-ticket admin policies inspected also constrain authenticated writes to the fixed primary-admin identity and trusted admin app_metadata.
- Product direct write grants are currently used by admin quick-update/publish UI; RLS constrains them to the same primary-admin identity. The dedicated RPCs retain validation and stock locking for full product/variant updates.

## Confirmed Production exposure requiring staged fix

Production still grants authenticated users direct SELECT on `public.products`, including the `purchase_cost` column. Since published product rows are readable by authenticated customers, RLS alone does not hide this column. This can expose procurement costs to signed-in customers.

The forward-only migration `supabase/migrations/20261112120000_restrict_authenticated_product_cost_select_again.sql` revokes broad SELECT and explicitly allow-lists storefront catalogue columns, while full admin reads continue through the protected `admin_list_products` RPC. It is staged only and has NOT been applied to Production.

A regression test `tests/productCostPrivileges.test.js` now asserts the allow-list and confirms `purchase_cost` is excluded.

## Release safety

- No Production rows, orders, stock, expenses, or user data were changed during this audit.
- No Production migration was applied.
- The staged product-cost privilege migration must be applied before considering the financial-data exposure closed.
- The direct product DELETE revocation and legacy-order history guard are also staged, not live.
- Do not deploy or apply migrations until the complete migration-source/backup reconciliation gate is resolved and the user explicitly approves the combined release.
