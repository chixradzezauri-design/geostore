# Order and stock ledger audit — 2026-11-07

## Scope and safety

Read-only audit of the live Supabase project. No order, product, stock, or migration data was modified. Customer names, phone numbers, addresses, and email addresses were intentionally excluded from this report.

## Live snapshot

- Orders: 21
- Products: 1
- Duplicate order IDs: 0
- Orders with empty/invalid item arrays: 0
- Order lines with invalid/non-positive quantities: 0
- Orders referencing a product ID absent from the current catalogue: 1 order / 1 line
- Orders with `stock_deducted_at IS NULL` and status other than `გაუქმებული`: 7
- Orders with `stock_restored_at IS NOT NULL` and status other than `გაუქმებული`: 0
- Orders with a restoration marker but no deduction marker: 0

## Findings

### 1. Legacy orders without stock markers

Seven non-cancelled orders have no `stock_deducted_at` marker:

- Six refer only to the currently existing product; this group includes one completed order.
- The remaining order, `ORD-8862`, is pending and contains two units of `prod-2` (MacBook Air 15 M3) plus one unit of `prod-1793257789731`; `prod-2` no longer exists in the live product catalogue.

The marker absence does not prove that stock was not deducted. These orders predate the marker-based workflow or were created by earlier paths. Do not backfill markers or restore/deduct stock for these rows without independent, trustworthy evidence.

### 2. Historical product reference

Order `ORD-8862` refers to product `prod-2`, which is absent from the current catalogue. Preserve the historical order and its item snapshot. Do not delete or rewrite the order. If the product needs to be restored for future sales, recreate it as a new catalogue record only after confirming its details and stock; do not assume its historic stock value.

### 3. Current marker-backed order behavior

The live cancellation RPC restores stock only when `stock_deducted_at` exists and `stock_restored_at` is null. It updates the order status and restoration marker in the same transaction. The live reactivation RPC requires:
- cancelled status,
- both stock markers,
- non-empty item array,
- a fresh password authentication event,
- sufficient stock for every product.

A failed update for a missing product or insufficient stock raises an exception and rolls back the transaction, preventing partial stock changes.

### 4. Status-transition protection is incomplete in live database

The live trigger currently blocks cancellation after dispatch/completion, but it does not independently block all backward transitions (for example, completed -> processing or shipped -> processing) through every possible update path.

The staged migration `20261106200000_prevent_completed_order_status_rollback.sql` adds RPC and trigger-level protections, including controlled reactivation. It is NOT applied. Do not deploy dependent behavior or apply this migration until migration history reconciliation is complete.

### 5. Checkout validation

The live `private.create_order_with_stock(jsonb)` function:
- validates order identity and required fields;
- validates each raw quantity before aggregation;
- locks product rows and checks available stock;
- calculates price, coupon, and delivery from server-side data;
- deducts stock and inserts the order atomically;
- uses an order-ID advisory lock and stored checkout request/result for idempotent retries.

The staged variant-validation migration `20261106120000_validate_order_item_variants.sql` is not applied. Therefore, selected size/color values are not yet proven to be checked against the current product option arrays at the database boundary.

## Release blockers / required actions

1. Reconcile the 47 live migration versions with repository history before applying any SQL. No migration repair, reset, or `db push` based on assumptions.
2. Review the seven legacy markerless orders manually using trusted order/stock history. Do not infer stock actions from status alone.
3. Decide how to preserve the historical `prod-2` item snapshot; do not rewrite the order.
4. Apply and verify the staged order status-transition and checkout validation protections only after migration reconciliation and a reviewed deployment plan.
5. Run controlled staging tests for checkout, idempotent retry, cancellation, reactivation, insufficient stock, missing product, and illegal status rollback before production release.

## Conclusion

The current marker-backed cancellation/reactivation logic has transactional safeguards, but historical markerless orders and a missing product reference require manual reconciliation. The live status-transition guard is not yet as strict as the staged migration. The database is not ready for a production release that includes the pending order-related migrations.
