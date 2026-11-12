# GEOSTORE admin inventory and order-status audit — 2026-11-12

## Scope and safety

Read-only audit of live Supabase order/product privileges, RLS, stock functions, order-status triggers, and the audit-branch admin UI. No stock, order, product, or customer data was modified. No Production test order or status change was submitted.

## Findings

### 1. Product and variant stock editing
- Product RLS is enabled. Product INSERT/UPDATE/DELETE policies are restricted to the fixed primary administrator Auth UID and trusted `app_metadata.role = 'admin'`.
- Public users have published-product read access only.
- Admin stock RPC wrappers are SECURITY INVOKER with an empty search_path. They are executable by authenticated users only (not anon); the underlying private stock functions are SECURITY DEFINER with an empty search_path and repeat the fixed administrator UID + app_metadata role check.
- Variant stock batch functions validate array shape, row count, unique variant IDs, integer stock bounds (0–1,000,000), verify each ID belongs to the product and the expected variant type, lock the product row `FOR UPDATE`, and patch only explicitly requested variants.
- Product editor RPC locks the current product row and uses that locked row as the base so omitted fields remain unchanged. The latest live stock is preserved when editing metadata; only explicitly changed variant stock is patched. Product variant preservation triggers prevent ordinary edits from silently resetting existing variant stock.
- The aggregate-stock trigger recalculates product stock from variant stock. Current live data check found zero products where aggregate stock differs from the sum of variant stock.
- Authenticated product table INSERT/UPDATE grants exist, but RLS restricts them to the primary administrator. Admin UI currently uses the atomic product-update RPC for product edits.

### 2. Order-status write boundary
- The live `orders` table has RLS enabled. Authenticated users have SELECT column grants for the admin order view, but no direct UPDATE column grants were returned. Order status changes therefore use the protected RPC rather than direct REST table updates.
- Public `admin_update_order_status(text,text)` is SECURITY INVOKER, empty search_path, and EXECUTE is granted to authenticated only. Its private SECURITY DEFINER implementation repeats the fixed primary-admin UID and trusted app_metadata role checks.
- Status RPC locks the order row `FOR UPDATE`, allows only the known statuses, blocks backward transitions from dispatched/completed orders, and rejects direct reactivation of cancelled orders.
- The database trigger independently blocks backward transitions from dispatched/completed orders and permits cancelled-order reactivation only through the transaction-local reactivation marker after fresh password authentication.
- The separate reactivation RPC requires recent password authentication (within five minutes), validates stock ledger markers and item quantities, deducts current available stock atomically, then reactivates the order. Insufficient stock aborts the whole transaction.
- The cancellation RPC validates each order line before aggregation, groups by product and selected variant ID, locks/updates stock rows transactionally, marks stock restoration, and changes status in the same transaction. Variant restoration updates the selected variant stock; the aggregate-stock trigger recalculates product stock from variant rows.
- A separate trigger blocks cancellation after dispatch/completion.

### 3. Live ledger consistency snapshot
At audit time:
- 1 order exists.
- 1 order has a stock-deduction marker.
- 1 order has a stock-restoration marker.
- 0 cancelled orders have a deduction marker without a restoration marker.
- 0 non-cancelled orders retain a restoration marker.
- 0 cancelled orders have a restoration marker without a deduction marker.
- 0 product rows have aggregate stock inconsistent with the sum of configured variant stock.

These are consistency counts only; they do not prove historical inventory values or reconstruct unavailable stock movements.

## Conclusion

No proven authorization bypass or current stock-ledger inconsistency was found in the inspected admin inventory and order-status paths. The database protects variant edits with row locks and explicit patch lists, and the order-status write path is RPC-only for authenticated clients. Cancellation/restoration and reactivation are transactional and marker-backed.

The audit did not submit live test operations, so it does not claim an end-to-end runtime test of cancellation/reactivation. Existing migration-source reconciliation and release blockers remain applicable; do not apply migrations or deploy this audit branch to Production without a separately reviewed release plan.

## No Production changes

No Production schema, grants, RLS policies, functions, triggers, orders, stock, products, migrations, deployments, merges, or promotions were changed.
