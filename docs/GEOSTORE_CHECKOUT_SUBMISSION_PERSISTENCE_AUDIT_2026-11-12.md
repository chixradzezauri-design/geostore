# GEOSTORE Checkout Submission & Order Persistence Audit

Date: 2026-11-12  
Repository: `chixradzezauri-design/geostore`  
Branch: `fix/admin-panel-audit-2026-11-10`  
Scope: checkout contact validation, guest/authenticated identity, cart snapshot, live catalogue/pricing refresh, coupons, delivery fees, idempotency, server-side price/stock calculation, order snapshot, and notification triggers.

## Executive result

The reviewed checkout flow validates the customer and cart in the browser, refreshes the live catalogue and pricing settings before submission, and delegates final price, coupon, delivery, variant and stock validation to the database transaction. The database uses row locks and a per-order advisory lock, records a server-generated checkout result/request, and returns that result for a matching retry rather than deducting stock again.

No proven checkout defect was found in the reviewed source and live schema. No application code or migration was changed in this stage. No Production test order, stock mutation, customer-data update, schema change, or deployment was performed.

## Source review

Reviewed on audit branch:
- `src/App.jsx`: checkout form, guest/auth session handling, cart item snapshot, catalogue/pricing refresh, idempotency fingerprint, RPC request and confirmation handling.
- `src/utils/checkoutValidation.js` and its tests.
- `src/utils/orderSafety.js` and its tests.
- `src/utils/cartSafety.js`.
- Existing checkout and stock migration/source findings from the prior checkout audit.

Read-only Production database review:
- `public.create_order_with_stock(jsonb)` and `private.create_order_with_stock(jsonb)`.
- `private.bind_order_to_auth_user()`.
- Guest-email validation and unpublished-product order guard triggers.
- Orders constraints, trigger definitions, delivery-fee rows, active-coupon count, and aggregate order-integrity checks.

## Verified checkout behavior

### Customer contact and identity
- Name, phone, address, and email are validated client-side with length/control-character checks.
- Guest checkout requires a valid email; authenticated checkout uses the email from the active Supabase session and sends the same session access token with the RPC.
- The database independently validates guest email and rejects an authenticated order whose submitted user email does not match the JWT email.
- The insert trigger binds authenticated orders to `auth.uid()`; guest orders retain a NULL `user_id`.
- The order snapshot stores the contact email separately from the guest sentinel `user_email='guest'`.

### Cart and order item snapshot
- The client constructs the order item payload from the current cart, preserving selected size, selected color, custom variant ID/name, quantity, image/gallery snapshot, category/vendor, and supported gift/warranty customization flags.
- The browser-supplied product price, total, procurement cost, and vendor data are not trusted for final charge or stock calculation.
- The database fetches product and variant data itself, derives line names/images/prices, and stores the selected options in the order item snapshot.
- Different sizes, colors, custom variants, and add-on combinations remain distinct order lines where needed.
- The database rejects missing, malformed, excessive, or invalid item quantities before any stock deduction.

### Freshness, price, coupon and delivery
- Immediately before RPC submission, the client fetches the current published catalogue and reconciles product existence, price, stock, selected option, and selected variant. A change refreshes the cart and requires customer review rather than silently placing the order.
- The client also reloads active coupons and delivery fees; unavailable settings or changed fee/coupon terms stop submission and ask the customer to review.
- The database independently reads the current delivery fee and active coupon, checks the minimum order amount, calculates the discount rounded to tetri, and computes the final total.
- Product/variant prices and add-on fees are calculated server-side. Fixed gift-wrap and VIP-warranty fees are not accepted from browser-supplied prices.
- The submitted `total_gel` is not used as the authoritative order total.

### Atomic stock and duplicate-submission protection
- The public RPC wrapper is SECURITY INVOKER with an empty search path; execution is granted to anon/authenticated for guest and signed-in checkout.
- Direct anon/authenticated INSERT on `public.orders` is not granted; order creation is through the RPC.
- The private checkout implementation is SECURITY DEFINER with an empty search path.
- A per-order advisory transaction lock serializes concurrent requests for the same order ID. An existing order is returned only when the idempotency request and customer identity match; a reused ID with different data is rejected.
- Product rows are locked before stock checks. Stock deductions occur in the same transaction as order creation, and any failed deduction rolls back the transaction.
- Variant stock is deducted by the exact variant ID; legacy products without per-option inventory use aggregate product stock.
- The order insert triggers bind account identity, validate guest email, reject unpublished products, and record customer notifications where an authenticated recipient exists.

## Read-only Production snapshot

- Orders: **1**
- Orders with a saved server checkout result: **1**
- Orders with a saved idempotency request: **1**
- Orders missing customer email: **0**
- Malformed or empty item snapshots: **0**
- Guest orders with invalid/missing customer email: **0**
- Orders with at least one selected variant/size/color snapshot: **1**
- Active coupons: **1**
- Delivery fees present for all three regions:
  - Tbilisi: **0 GEL**
  - Other major cities: **10 GEL**
  - Other regions: **15 GEL**

Only aggregate counts and delivery-fee settings were queried; no customer name, phone, email, address, or item details were exposed in this report.

## Findings and limitations

- No proven defect in the inspected checkout submission and persistence path.
- Idempotency state is held in memory and, when browser crypto/session storage are available, sessionStorage stores a SHA-256 fingerprint plus the secure order ID. If digest/session storage is unavailable, the current page still has in-memory retry protection; cross-reload retry continuity is not guaranteed in that degraded browser case.
- A browser end-to-end checkout was not executed because Production test orders and stock mutations are prohibited. Static source review, database function/trigger inspection, and read-only integrity queries do not substitute for a Preview end-to-end order test.
- This stage did not alter code, migrations, Production schema, privileges, orders, products, stock, or customer records.

## Next safe verification

Run the existing automated test/build workflows on the audit-branch commit and complete a Preview-only end-to-end checkout using isolated test products/data. Keep Production untouched. Before any Production migration or release, resolve the already-documented migration-source drift and obtain a verified backup/recovery path.
