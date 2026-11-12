# GEOSTORE Coupon, Discount, Delivery and Checkout Audit — 2026-11-12

## Scope and safety
Read-only review of Production coupon/delivery table schema, constraints, grants, RLS, checkout RPC and audit-branch frontend calculations. No order/customer contents were read. No coupon, delivery fee, order, product, stock, schema, grant, or policy was changed. No test checkout was submitted.

## Findings

### 1. Server-side checkout is authoritative
The public `create_order_with_stock(jsonb)` wrapper is SECURITY INVOKER and delegates to `private.create_order_with_stock(jsonb)`, which is SECURITY DEFINER with an empty search_path. The private function independently:
- validates order and item payloads, quantities, selected variants and add-ons;
- fetches current product and variant prices from the database;
- locks products and checks current stock;
- calculates add-on fees server-side (gift wrap 5 GEL and VIP warranty 15 GEL per item);
- reads delivery fee from `store_delivery_fees`;
- reads active coupon terms from `store_coupons` and checks minimum subtotal;
- calculates discount and final total itself;
- deducts stock and inserts the order in the same transaction;
- uses an advisory transaction lock and stored checkout request/result for idempotent retry protection.

The browser-supplied `total_gel` is not used as the source of truth in the private calculation.

### 2. Coupon constraints are present
Production database constraints enforce:
- unique coupon code;
- discount_percent greater than 0 and no greater than 100;
- min_order_gel greater than or equal to 0.

The frontend normalizes entered coupon codes to uppercase, validates percentage and minimum amount, rechecks current coupon terms immediately before submission, and clears cached coupons when the authoritative fetch fails.

### 3. Delivery fee constraints and access are present
Production constraints limit delivery regions to `tbilisi`, `bigCities`, and `other`; fee_gel must be non-negative; region is the primary key. Public read is allowed for checkout, while INSERT/UPDATE are restricted by RLS to the fixed primary admin UID and trusted `app_metadata.role = 'admin'`.

The frontend re-fetches delivery settings immediately before order submission and requires the customer to review again if the selected fee changed. The server independently loads the selected region's current fee and rejects missing/unsupported regions.

### 4. Coupon access is appropriately scoped
Public and authenticated users can read active coupon rows for checkout. Coupon INSERT/UPDATE/DELETE policies require the fixed primary administrator UID and trusted admin app_metadata role. Coupon codes are unique in the database.

### 5. Client/server calculation consistency
The frontend uses integer tetri (two-decimal GEL) arithmetic for subtotal, coupon discount and delivery. The server rounds the coupon discount to two decimal places and adds delivery after the discount. The checkout response validator checks item totals, discount bounds and the final total equation before showing confirmation.

### 6. No confirmed defect in this pass
No exploitable coupon discount bypass, negative delivery fee, browser-controlled order total, or missing server-side stock/price check was confirmed in the inspected path. No Production change is warranted based on this pass.

## Follow-up notes
- Current policy intentionally exposes only active coupons to the public checkout; coupon terms are revalidated server-side at submission.
- Continue to keep historical checkout totals based on the stored server result, not a recalculation from current coupon or delivery settings.
- Existing production release blockers remain: 24 Production migration source files are missing from the audit branch, no verified restorable backup has been confirmed, and Production release requires explicit approval.

## Release status
- Report committed only to `fix/admin-panel-audit-2026-11-10`.
- No Production migration, deployment, merge, or data mutation.
- Do not run a blanket `supabase db push`.
