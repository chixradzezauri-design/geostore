# Order and stock ledger audit — refreshed 2026-11-07

## Scope and safety

Read-only audit of the live Supabase project `xmtnszxtnfxnrojionoa`. No orders, products, stock values, customer records, or migration rows were modified. Customer names, phone numbers, addresses, and email addresses were not queried.

## Current exact row counts

A direct SQL `count(*)` query (not estimated table statistics) returned:

| Table | Exact rows |
|---|---:|
| `public.orders` | 0 |
| `public.products` | 1 |
| `public.expenses` | 1 |
| `public.order_notifications` | 0 |

The only current product has base stock 61, price 134 GEL, and an empty custom-variant array. There are no live custom variants to reconcile or test against.

**Important correction:** an earlier version of this audit recorded 21 orders and legacy order-stock findings. That snapshot is no longer current and is superseded by this direct count. Do not backfill, restore, deduct, or otherwise alter stock based on the stale report.

## Live checkout and stock implementation

Read-only catalog inspection confirms that `private.create_order_with_stock(jsonb)` currently:
- validates order identity, required fields, item shape and positive quantities;
- locks product rows before checking stock;
- uses database catalogue prices, including custom variant prices;
- calculates gift wrapping (+5 GEL) and VIP warranty (+15 GEL) on the server;
- snapshots custom variant identity, selected size/color and paid add-ons;
- deducts base or variant stock and inserts the order in one transaction;
- uses an advisory lock and stored request/result for idempotent retry.

No live order rows exist, so historical stock reconciliation and end-to-end order replay cannot be validated from current production data.

## Confirmed remaining database gaps

1. The live `private.preserve_product_variant_stock()` trigger preserves existing variant stock and prevents removal/reuse of IDs referenced in order history, but does not yet reject duplicate variant IDs or case-insensitive duplicate names.
2. The live order cancellation and reactivation functions combine JSON type checking and `jsonb_array_length` in one `OR` expression. SQL does not guarantee short-circuit evaluation; malformed non-array JSON could raise an array-function error instead of the intended validation message.
3. The admin UI now calls `public.admin_adjust_product_variant_stock` for saved-variant stock deltas. That RPC is staged in GitHub but is not present in the live database yet. Do not deploy the UI before its migration.
4. The custom-variant integration and the latest admin stock-adjustment migrations are not recorded in the live migration ledger. Some related functions/triggers are nevertheless present in the live catalog, which indicates migration-history/schema drift. Do not replay the entire integration migration without reconciliation.

## Staged correction

The forward-only migration `20261107234500_harden_order_json_and_variant_integrity.sql`:
- separates JSON array-type checks from array-length checks in cancellation and reactivation;
- adds duplicate variant ID rejection;
- adds case-insensitive duplicate variant name rejection;
- retains the live trigger's stock-preservation and order-history protections.

The existing staged migration `20261107230000_admin_adjust_product_variant_stock.sql` supplies the row-locked, exact-one-variant, bounded-delta RPC required by the admin UI.

These files are staged on the design branch only. They have not been applied to production. The complete SQL test suite and browser checkout tests remain outstanding.

## Release blockers

1. Reconcile the 67-version live migration ledger with the repository migration files and live catalog before applying any migration.
2. Review the live definitions of overlapping checkout, variant, status and stock-trigger functions against their staged migrations; do not replay equivalent DDL blindly.
3. Apply the forward-only validation and stock RPC migrations only after the reconciliation plan is verified.
4. Run controlled staging tests for plain checkout, custom-variant checkout, add-ons, idempotent retry, cancellation, reactivation, insufficient stock, duplicate variant IDs/names, and illegal status rollback.
5. Complete mobile/desktop browser QA and the Node test suite before production deployment.

## Conclusion

The current live product data is small and has no custom variants or orders. The checkout RPC is already variant-aware and calculates paid add-ons server-side, but the database still needs the staged validation/stock-RPC work and migration-history reconciliation. Production deployment remains deferred.
