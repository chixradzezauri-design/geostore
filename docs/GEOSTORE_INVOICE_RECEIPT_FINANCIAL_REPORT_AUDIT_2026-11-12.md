# GEOSTORE Invoice, Receipt and Financial Reporting Audit — 2026-11-12

## Scope and safety
Reviewed the audit-branch invoice renderer, order financial detail view, financial analytics calculations, CSV export paths and order snapshot normalization. No order/customer contents were read from Production. No Production data, schema, permissions, Storage objects or deployment were changed. No test orders or payments were created.

## Confirmed design

### Server total remains authoritative
Checkout stores server-calculated `subtotal_gel`, `discount_gel`, `delivery_gel`, and `total_gel` in the order's `checkout_result`. The client maps these fields into the order snapshot. The invoice uses the saved order total and, when valid, displays the saved breakdown. Legacy orders without a saved breakdown retain a total-only invoice rather than inventing historical delivery or discount values.

### Invoice line items
The invoice uses saved order item snapshots, including product image/gallery, selected size/color/custom variant, quantity and add-on details. It escapes dynamic text and restricts image sources to HTTPS or supported inline image data. Product fallback images are used only when the order snapshot lacks one.

### Financial analytics
The dashboard calculates revenue from delivered/completed orders, separates delivery revenue from product revenue, and allocates discounted product revenue across item lines. It uses order-time purchase-cost snapshots where available; otherwise current product cost is explicitly marked estimated. If historical cost or revenue data is incomplete, gross/net profit is suppressed rather than presented as exact. Invalid expense rows are excluded and cause net profit to be marked unavailable.

### Payment status limitation
The admin order details explicitly state that payment method and payment-confirmation status are not stored separately. Therefore an order's workflow status must not be treated as proof that payment was received. This is a data-model limitation, not a confirmed calculation defect.

## Issue found and correction staged
The invoice breakdown resolver previously checked only that subtotal, discount and delivery were finite, non-negative numbers. It did not verify that:
- discount does not exceed subtotal; and
- subtotal minus discount plus delivery reconciles to the saved order total.

A malformed or inconsistent breakdown could therefore be printed alongside a different authoritative total. Updated `src/components/AdminDashboardPro.jsx` so the detailed breakdown is displayed only when these values reconcile in integer tetri, allowing a one-tetri rounding tolerance. If the breakdown is inconsistent, the existing safe total-only fallback is used. This does not modify any order or financial data.

## Verification and limitations
- The source change was committed to `fix/admin-panel-audit-2026-11-10`.
- Branch head verified as `5beadebaabdcd6defaf5ca237eb963cacd8b54e2`.
- No Production deploy, merge, migration, or data mutation.
- A full browser print/PDF end-to-end test and current CI/build validation were not run in this pass.
- Historical orders without saved checkout breakdowns remain total-only by design; do not reconstruct missing historical coupon or delivery amounts from today's settings.

## Release status
This is staged audit-branch work only. Production release remains subject to the existing migration-source, backup-readiness, E2E and explicit-approval gates.
