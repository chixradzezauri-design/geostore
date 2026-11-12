# GEOSTORE Storefront Product Selection, Filters & Cart Audit

Date: 2026-11-12  
Repository: `chixradzezauri-design/geostore`  
Branch: `fix/admin-panel-audit-2026-11-10`  
Scope: customer-facing published catalogue, category/subcategory and price filters, product details, size/color and custom-variant selection, comparison modal, cart stock limits, and pre-checkout catalogue reconciliation.

## Executive result

The reviewed storefront paths fail closed for unavailable inventory variants and re-check the catalogue immediately before checkout. The server-side checkout RPC remains authoritative and validates price and stock transactionally. No production order, cart, product, stock, or customer data was changed.

No production-code change was made in this stage: the inspected paths and current published catalogue did not establish a defect that justified a code modification. Existing behavior was documented rather than changing working selection semantics.

## Source review

Reviewed:
- `src/App.jsx`: published catalogue loading, cart insertion, cart quantity updates, fresh catalogue fetch before checkout, checkout item snapshot.
- `src/components/StoreView.jsx`: category/subcategory filters, price filters and sorting, product detail selection, size/color selectors, custom variants, out-of-stock disabling, add-to-cart button.
- `src/components/ProductCompareModal.jsx`: comparison variant selection and add-to-cart.
- `src/utils/productVariants.js`: option normalization, size/color inventory lookup, available-variant filtering, stock and starting-price helpers.
- `src/utils/cartSafety.js`: cart grouping, stock limits, quantity updates, persisted cart sanitization.
- `src/utils/orderSafety.js`: cart/catalog reconciliation and checkout snapshot grouping.
- `src/utils/checkoutValidation.js`, `src/utils/productSearch.js`, `src/utils/publishedProducts.js`, and `src/utils/productVariants.test.js`.

## Verified behavior

### Catalogue and category filters
- StoreView filters the already-published product collection by parent category and its child categories, or by the selected subcategory.
- Invalid minimum/maximum price ranges return no results rather than silently applying a contradictory range.
- Price filtering and price sorting use the product's starting price helper; invalid/missing prices are not treated as zero.
- Search matching normalizes text and includes product names, category, brand/vendor, SKU/barcode, description, specifications, tags, option labels, and variant names.

### Size/color inventory
- For products with `size_color` inventory rows, the saved variant matrix is the source of truth for size/color selection.
- The detail view initializes from the first in-stock combination. Available sizes are filtered against the currently selected color; choosing a size updates the color if the previous color is unavailable. Choosing a color similarly updates the size.
- Size/color choices with no positive stock are disabled. The add-to-cart action is disabled if the selected size/color combination is missing or has zero stock.
- The add-to-cart handler independently checks that the selected combination exists, is in stock, and has the same variant ID passed by the detail view.
- For legacy products without per-option inventory rows, configured size/color labels are options only; stock is correctly enforced against aggregate product stock rather than pretending each label has an independent ledger.

### Custom variants and comparison modal
- Custom variant choices are listed with their own price and stock; zero-stock options are disabled.
- The first in-stock custom variant is preselected in the detail view. The add-to-cart action rejects missing or stale custom variant selections.
- The comparison modal only offers positive-stock custom or size/color inventory rows, requires a selection when variants/options exist, and passes the exact variant ID, name, price, and stock to the shared cart handler.
- Products with no available inventory cannot be added from the comparison modal.

### Cart and checkout
- Cart stock is tracked by product plus inventory-variant ID. Separate legacy size/color labels share aggregate product stock, which matches the legacy data model.
- Cart quantity increases and repeated add-to-cart taps are checked against the current cart snapshot to avoid exceeding the available quantity.
- Persisted cart values are treated as snapshots, not as authority for current price or stock.
- Before order creation, the client fetches the current catalogue and reconciles every cart line. Missing products, removed variants, changed size/color selections, price changes, or insufficient stock stop checkout and require customer review.
- The checkout item snapshot carries selected size, selected color, and custom variant ID/name. The database checkout RPC independently validates the product/variant relationship, current price and stock under transaction locks; the browser is not trusted as the final inventory authority.

## Read-only Production catalogue snapshot

A read-only aggregate query of `public.products` where `is_published = true` returned:
- Published products: **2**
- Published products with variant rows: **1**
- Published products with size/color inventory: **1**
- Published products with custom variants: **0**
- Published products whose aggregate stock is zero: **0**

The two published records:
- **ჰუდი** (ტანსაცმელი): aggregate stock 10; 12 size/color rows. Four combinations have positive stock (3, 4, 1, and 2 units respectively); the remaining eight combinations have zero stock. The detail selector exposes only in-stock size combinations and disables colors with no stock.
- **ქალის ჯინსი** (ტანსაცმელი): aggregate stock 61; no variant inventory rows; configured sizes are legacy option labels and share aggregate product stock.

This is a current published-catalogue snapshot, not a claim about unpublished admin products or historical catalogue counts. No customer or order content was queried.

## Findings and limitations

- No proven stock-bypass or unavailable-variant selection defect was found in the reviewed paths.
- The legacy jeans size labels do not have independent per-size stock rows. This is existing schema semantics, not a hidden per-size stock guarantee; independent size stock would require explicit size/color inventory rows.
- A browser end-to-end purchase flow was not executed, because no Production test order or stock mutation is permitted. The server checkout implementation was assessed from source and the previously completed checkout/stock audit.
- The audit did not alter source code, migrations, Production schema, Production data, stock, or customer orders.

## Next safe verification

Run the repository's existing unit/build workflows against the resulting audit-branch commit and perform a non-Production preview browser walkthrough when an appropriate Preview environment is available. Do not create test orders against Production.
