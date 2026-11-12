# GEOSTORE Product Edit and Historical Order Snapshot Integrity Audit — 2026-11-12

## Scope
New stage: verify that editing product catalogue data cannot retroactively change historical order snapshots, overwrite live stock with stale editor state, or remove variant identities already referenced by orders. Previously completed order export/print and order detail UI checks were not repeated.

## Branch review
Reviewed:
- `src/components/AdminDashboardPro.jsx` product editor payload and save flow.
- `supabase/migrations/20261110145000_preserve_live_stock_during_product_edit.sql`
- `supabase/migrations/20261112061816_product_variant_integrity_validation.sql`
- `supabase/migrations/20261112063136_product_base_payload_validation.sql`
- `supabase/migrations/20261108231918_order_item_image_snapshot.sql`
- `src/utils/productImageCleanup.js`
- `src/utils/productValidation.js`

## Findings
1. **Historical order lines are snapshots, not live catalogue joins.** Checkout persists the then-current product name, main image, gallery, base/variant price, custom variant ID/name, selected size/color, quantity, add-ons, purchase cost, vendor and category into `orders.items`. Product edits update `products` only; the reviewed product update RPC does not rewrite existing `orders.items`.
2. **Catalogue image replacement preserves historical image assets.** Admin cleanup checks other products, all order image snapshots, legacy orders without image snapshots, storefront drafts/published snapshots, legacy messages and the media registry. It fails closed if reference checks cannot complete. Existing order snapshots retain their own URLs.
3. **Stale product-form stock is not written back.** The admin editor omits the base `stock` field from its update payload. The RPC locks the current product row and uses that row as the base; the newer branch migration explicitly preserves the locked base stock. Existing variant stock is preserved by the trigger, and only explicitly changed quantities are sent through the atomic stock-batch RPC.
4. **Historical custom/size-color variant identities are protected.** Checkout snapshots `customVariantId` for selected variants. The database trigger refuses to remove a variant ID referenced by any order and refuses to reuse an already historically referenced ID. Renaming/repricing an existing variant keeps its ID, while the order's stored name and price remain independent snapshots.
5. **Input validation is stricter in the audit branch.** The branch's latest product update RPC invokes server-side base payload validation and the variant trigger validates matrix coverage, unique IDs, size/color combinations and numeric bounds. Production's currently deployed function/trigger definitions are older than these branch migrations; do not assume the newer validation is live.

## Production read-only verification
- Confirmed the live `admin_update_product_with_stock` function locks the current product row and uses `jsonb_populate_record(v_existing, ...)` so omitted values inherit the current row.
- Confirmed the live variant trigger preserves existing variant stock and prevents deletion/reuse of variant IDs referenced by historical order items.
- Production currently has one order. No order contents were opened or changed.
- No Production product, order, stock, image, schema, function or permission was modified.

## Result
No new confirmed defect was found in the reviewed product-edit / historical-snapshot flow. No application code change was necessary. The existing protections are present in the audit branch, with some newer validation migrations not yet reflected in Production.

## Validation limitations
- No test suite, build, browser E2E or live checkout/edit operation was run.
- The latest visible successful CI runs are for an earlier commit, not the current audit-branch HEAD.
- This was a source review plus read-only Production function/trigger inspection; it is not a proof of end-to-end runtime behavior.

## Next safe stage
Review product image replacement/cleanup edge cases and image ownership boundaries independently, without repeating the snapshot-preservation checks above.
