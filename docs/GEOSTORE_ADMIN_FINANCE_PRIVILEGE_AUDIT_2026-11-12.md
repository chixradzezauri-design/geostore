# GEOSTORE admin finance and inventory privilege audit — 2026-11-12

## Scope

Read-only review of the live Supabase privilege catalog and the current audit-branch implementations for:
- order status changes and stock restoration/reactivation;
- product and custom-variant stock adjustments;
- flash-sale price updates;
- expense records;
- coupon and delivery-fee management.

## Verified Production controls

### Orders and stock

- Direct client-role UPDATE on `public.orders` is not granted to `authenticated`; order status changes use the public invoker wrapper and the private SECURITY DEFINER RPC.
- `private.admin_update_order_status` requires both the trusted `app_metadata.role = admin` and the fixed primary-admin Auth UID. It validates allowed statuses, locks the order row, validates stored order lines before restoring stock, and updates order status and stock-restored timestamp in one transaction.
- Completed/delivered and shipped orders cannot be rolled back through the status RPC.
- Reactivation is a separate RPC requiring recent password authentication, validates order-line quantities, locks the order, checks available stock, and deducts stock atomically.
- All inspected private variant-stock RPCs require the same primary-admin UID and trusted app-metadata role, use an empty search_path, validate requested IDs/quantities, and lock the product row.
- Anonymous EXECUTE is denied on these admin RPCs; authenticated EXECUTE is only the wrapper entry point and is rechecked inside the private function.

### Expenses

- Production grants authenticated CRUD on `public.expenses`, because the admin UI uses direct PostgREST insert/read/delete operations.
- This is constrained by one RLS `ALL` policy requiring both trusted `app_metadata.role = admin` and the immutable primary-admin UID in both USING and WITH CHECK.
- No anon table privileges were found.
- Expense creation uses a stable generated ID and verifies the persisted row after ambiguous network outcomes before allowing a retry, preventing duplicate entries.
- Expense deletion requires a confirmed response containing exactly one row with the requested ID before updating the UI.
- No change to expense rows or permissions was made.

### Coupons and delivery fees

- Production write policies require both the trusted admin role and primary-admin UID.
- Delivery fee writes are limited to INSERT/UPDATE; public read remains available for checkout.
- Coupon delete is separately admin-restricted.
- No anonymous write privilege was found.

### Flash-sale pricing

- The public function is an invoker wrapper; its private SECURITY DEFINER implementation requires the trusted admin role and primary-admin UID, validates the discount range and precision, and excludes products with custom variants from base-product discounts.
- No anonymous EXECUTE privilege was found.

## Outstanding separate finding

Production still has authenticated table-level DELETE on `public.products`. Its RLS policy is primary-admin-only, but direct REST deletion can bypass the historical-order guard in the dedicated delete RPC. A forward-only migration and regression test to revoke direct DELETE are already staged in the audit branch; they have not been applied to Production.

## Safety and release state

- This review used read-only Production catalog/privilege queries.
- No order, product, stock, expense, coupon, delivery-fee, customer, message, or Storage row was modified.
- No Production migration or deployment was performed.
- Existing staged changes remain on `fix/admin-panel-audit-2026-11-10`; PR #87 remains Draft.
- The Vercel check for the latest PR head SHA reported a deployment rate limit, not an application build error. The previously completed test/build workflow passed 318 tests and the Production build; that earlier successful run was for a preceding commit, so it must not be treated as validation of every later commit.
