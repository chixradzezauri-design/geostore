# GEOSTORE catalogue search, filtering and sorting audit — 2026-11-12

## Scope and reviewed files
Reviewed `src/App.jsx`, `src/components/StoreView.jsx`, `src/utils/productSearch.js`, `src/utils/productSearch.test.js`, `src/utils/productVariants.js`, `src/utils/pagination.js`, and `src/utils/pagination.test.js`. Changes are confined to the audit branch.

## Findings
- Public catalogue data is filtered through the published-product allowlist after product access verification. Search is applied to the full in-memory published product array before category/price filters and 12-item pagination; it is not restricted to the visible page.
- Search normalization uses Unicode NFKC, lowercase, diacritic removal, punctuation/whitespace normalization and all-token matching. It searches product names/titles, category, brand/vendor, SKU/barcode, descriptions, selected technical fields, tags, available sizes/colors, and variant name/SKU/color/size.
- Parent categories include configured child subcategories; child selection is exact.
- Price min/max boundaries are inclusive. An inverted finite range produces an explicit error/empty state. Starting price resolves to the lowest valid custom/size-color variant price, or base price when no variants exist. Invalid/missing prices are excluded from range results and sort after valid prices.
- Price/name sorting runs after filtering. Stable JavaScript sorting preserves input order for equal comparator values.
- Pagination clamps the displayed page safely, but the reset effect previously did not observe changes to the search/vendor-filtered product array.
- Product data is loaded in a single public PostgREST query or admin RPC; no client range pagination is present. Completeness beyond the configured PostgREST row cap/admin RPC result size was not verified.
- No separate “in stock only” storefront filter control was found. Purchase controls use variant-aware stock and disable add-to-cart when unavailable.
- Vendor predicate exists, but selected vendor state is initialized to “ყველა” without a setter in the reviewed declaration; no vendor selector was added in this stage.

## Confirmed defects fixed
1. Pagination reset now also depends on `activeProducts`, so search/vendor result-set changes reset the catalogue to page 1 without changing existing category, price, or sort behavior.
2. App.jsx normalizes database `screen_size` to `screenSize`, while search previously checked only `screen_size`. Added `screenSize` to searchable fields and a regression test for the actual frontend-shaped property.

## Changed files
- `src/components/StoreView.jsx`
- `src/utils/productSearch.js`
- `src/utils/productSearch.test.js`

## Validation limitations and safety
- Updated file blobs were confirmed in the audit branch Git tree.
- Added regression coverage was not executed; Node tests and Vite build were not run. No current-HEAD CI success is claimed.
- No browser E2E, performance/Lighthouse profile, live catalogue row-count comparison, PostgREST max_rows check, or admin RPC pagination test was performed.
- No Production data/schema, Storage object, setting, or deployment was changed. No orders, messages, or product records were created, edited, or deleted. No merge or Production deployment occurred.

## Follow-up
A separate stage should verify PostgREST row cap and admin product RPC completeness using read-only counts/metadata, then decide whether server-side search/filter/pagination is necessary. Do not change Production configuration without explicit approval.
