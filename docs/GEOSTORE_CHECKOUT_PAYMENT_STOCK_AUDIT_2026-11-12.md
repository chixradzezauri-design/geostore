# GEOSTORE checkout, payment and stock security audit — 2026-11-12

## Scope and safety

Read-only review of the live Supabase schema/functions and the maintenance branch checkout implementation. No Production orders were created, no payment was attempted, and no product, stock, coupon, order, migration, or account data was changed.

## Verified protections

### 1. Checkout RPC boundary
- `public.create_order_with_stock(jsonb)` is SECURITY INVOKER with an empty search_path and validates the top-level payload size (64 KiB), order ID format/length, customer name, address, phone digits, email/coupon/region lengths, item array size (1–50), item IDs, selected size/color lengths, add-on booleans, and gift-message constraints.
- The public wrapper delegates to `private.create_order_with_stock(jsonb)`; only the private function is SECURITY DEFINER and it also has an empty search_path.
- Anonymous and authenticated callers can execute the public wrapper. This is intentional for guest checkout; the private function validates guest identity sentinel or authenticated JWT email before creating an order.
- Direct client INSERT on orders is not the checkout path; the server-side RPC owns order creation.

### 2. Server-side pricing and coupons
- The private checkout function fetches current product/variant prices from `public.products`; it does not trust browser-provided line prices or `total_gel`.
- Gift wrap and VIP warranty fees are fixed server-side (5 GEL and 15 GEL per unit); gift messages are capped and only accepted with gift wrap.
- Delivery fee is read from `public.store_delivery_fees` using a whitelisted delivery region.
- Coupon lookup requires an exact active code. Database constraints enforce discount_percent > 0 and <= 100, min_order_gel >= 0, and unique coupon codes.
- Coupon discount and final total are calculated in the database, with the discount rounded to two decimal places.
- Active coupon reads are public by policy; inactive coupons remain restricted to the administrator.

### 3. Stock integrity and concurrency
- The function locks product rows with `FOR UPDATE` before checking stock and prices.
- It validates raw line quantities before aggregation, bounds each line and grouped product quantity, checks variant existence and availability, and verifies selected size/color against configured product options.
- A transaction-scoped advisory lock keyed by order ID and the stored checkout request/result prevent duplicate order creation on retry or reuse of an order ID with different payload data.
- Stock deduction is conditional on sufficient quantity. A failed product/variant update raises an exception; PostgreSQL rolls back all prior stock updates and the order insert in the same transaction.
- Cancellation restores stock only when the marker-backed workflow indicates stock was deducted and not already restored. Reactivation rechecks available stock and uses row locks; these flows are transactional.
- Historical markerless orders remain outside the scope of automatic stock reconciliation. Do not backfill or adjust them without independent evidence.

### 4. Order data snapshot
- The database stores server-confirmed item snapshots, image/gallery references, selected variants, add-on choices, purchase cost/vendor/category fields for admin use, and the authoritative total.
- Customer order-history and tracking RPCs have separate scoped output paths; the customer-facing history strips procurement/vendor/margin fields.

## Findings and limitations

### Payment integration is not represented in the current database schema
- No public payment-related table, payment-status column, transaction/reference field, or payment provider RPC was found in the live public schema.
- The inspected checkout frontend calls the order-creation RPC and handles the server-confirmed order response; no payment-provider call or payment state was found in the inspected checkout path.
- The checkout RPC deducts stock and creates an order immediately. That is compatible with cash-on-delivery/manual payment, but it is not proof of a completed online card payment.
- If GEOSTORE intends to accept online card payments, a separate verified provider flow is still required: server-created payment intent/session, signed provider webhook verification, idempotent payment-state transitions, and an explicit policy for stock reservation/release. Do not mark an order as paid based on a browser callback.
- No payment integration was added in this audit because the intended payment provider and business flow are not established; inventing a provider or schema would be unsafe.

### Existing order status transition caveat
- The live order status trigger blocks selected invalid transitions, but the earlier stock-ledger audit found it does not independently prevent every backward transition through every possible update path.
- The staged status-transition hardening migration remains unapplied. It must not be applied until the known migration-history/source gaps are reconciled and a reviewed release plan exists.

### Supabase security advisor
- The current security advisor reports one warning: leaked-password protection is disabled. This is an Auth project setting, not a checkout or stock function defect. Enable it through the Auth security settings after review.

## Conclusion

The current server-side checkout pricing, coupon validation, stock locking, idempotency, and transactional rollback protections are materially stronger than a browser-trusted checkout. No proven checkout price-tampering or partial-stock-deduction defect was found in the inspected live RPC.

The main functional gap is payment-state integration: the current schema and inspected frontend path do not establish online payment capture or a verified paid status. Treat orders as unpaid/manual-payment unless a separate provider integration is independently verified.

No Production changes, test orders, payment attempts, migrations, deployments, merges, or promotions were performed.
