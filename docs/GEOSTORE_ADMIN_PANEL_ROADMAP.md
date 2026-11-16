# GEOSTORE Admin Panel Completion Roadmap

Last reviewed: 2026-11-17
Repository: `chixradzezauri-design/geostore`

## Working rules

- Preserve existing orders, order items, customers, messages, support tickets, products, stock, uploaded product media, coupons, settings and authentication.
- Keep work incremental, scoped and independently testable.
- Do not delete or rewrite working features for visual convenience.
- Do not merge draft pull requests, apply production database migrations, or deploy the live site without explicit approval.
- Reuse already completed fixes. Revisit them only if a regression or a verified defect is found.
- Keep all work staged for one consolidated release after code review, migration reconciliation and end-to-end verification.

## Existing work to retain

- Admin-wide dark navy/emerald contrast and form-control improvements were previously staged in the existing stylesheet (Stages 37–38).
- Sidebar inactive-state contrast was corrected in Stage 44.
- Order list/detail visual consistency and mobile modal behavior were corrected in Stage 45.
- These areas are not scheduled for another redesign unless a regression is found.
- Stage 58 adds a separate, narrowly scoped stylesheet after the existing global stylesheet. It does not change the admin component's state, tab identifiers, event handlers, database calls or order UI markup.

## Admin panel inventory — 18 existing sections

1. Analytics and finance
2. Profit calculator
3. Expenses
4. AI business assistant
5. Staff and roles
6. Orders
7. Products and attributes
8. Customer support
9. Customer messages
10. Flash sales
11. Activity logs
12. Broadcast messages
13. Banners
14. Categories and subcategories
15. Coupons
16. Vendors
17. CRM customers
18. Settings and security

The navigation identifiers and existing tab-selection handler are regression-tested and remain unchanged.

## Stage 58 — visual refinement pass 1

### What changed
- Added `src/adminDashboard.css`, loaded after `src/index.css` so admin-specific polish is isolated from storefront styling.
- Introduced a coherent navy/blue-green visual token set for the admin shell.
- Refined the desktop sidebar as a sticky, internally scrollable navigation surface, so the full 18-section menu remains reachable without pushing the workspace out of view.
- Refined active/inactive navigation states, count badges, brand mark and logout action.
- Improved the top admin header and its action buttons.
- Preserved the existing horizontal, touch-scrollable tablet/mobile navigation and improved spacing, snap behavior and 44px touch targets.
- Added narrow-screen rules down to 380px, visible keyboard focus, and reduced-motion handling.
- Added regression tests for stylesheet order, all 18 tab IDs, tab selection, desktop sidebar scrolling, mobile navigation, focus and reduced motion.

### Safety boundary
This stage is CSS-only apart from loading the new stylesheet and adding tests/documentation. It does not alter orders, stock, users, authentication, Supabase calls, storage, messages or business logic.

### Verification still required
- Run all repository tests and production build in GitHub Actions.
- Review the final rendered admin at 1440px, 1024px, 768px, 390px and 320px widths on real browser/device viewports. Static CSS assertions do not replace visual device testing.
- Confirm the sticky sidebar does not interfere with the page header, mobile navigation, keyboard focus or nested modals.

## Design work remaining

- Inspect each existing section for consistent spacing, typography, contrast, card hierarchy, form layout, empty/loading/error states and modal sizing.
- Check data tables and long content at 320px reflow; allow horizontal scrolling only for genuinely two-dimensional data tables or controls that need it.
- Review all status colors so success, warning, danger and neutral states remain distinguishable and readable.
- Avoid reworking the Stage 44 navigation contrast and Stage 45 order detail design unless testing finds a concrete issue.

## Functionality audit — next phase

1. Orders: realtime arrival/refresh, details and images, status transitions, idempotency, stock deduction/restoration, customer details, admin notes, invoices and exports.
2. Products: create/edit/delete, category-specific fields, clothing/shoe variants, custom variants, image/gallery upload lifecycle, stock concurrency and price/cost updates.
3. Support and messages: persistence, realtime synchronization, unread/read receipts, ownership checks, admin-only access and honest delivery status.
4. Inventory and promotions: flash-sale start/end/restore behavior, coupon validity, stock thresholds and category/banner publishing.
5. Finance: delivered-order revenue, historical cost snapshots, expenses, profit calculations, date filters and CSV export.
6. Settings and delivery: persistence, validation, safe defaults and publish/draft behavior.
7. CRM, staff, vendors and broadcasts: explicitly distinguish local-only UI from server-backed persistence and real permissions. Existing audit notes that staff and broadcasts are local-only; CRM actions do not create Auth users or grant server permissions; vendor persistence is separately staged in Draft PR #123. Do not present local-only features as live multi-user functionality.

For each item: inspect current implementation and live schema read-only first; write a test reproducing a verified defect; make the smallest safe change; run tests/build; record the result. Do not repeat already passing work.

## Candidate additions — decide after the functionality audit

- Admin command center with actionable cards for new orders, unanswered support tickets, low-stock products and expiring campaigns.
- Low-stock thresholds and inventory movement history, including who changed stock and when.
- Bulk product editing and safe CSV import/export with preview and validation.
- Real staff accounts with server-side role/permission enforcement and audit trails.
- Supplier purchase orders and stock replenishment workflow.
- Customer segments and genuinely delivered marketing campaigns with consent/unsubscribe safeguards.
- System health panel for database/realtime status, failed uploads and recent admin actions.

These are proposals only; none are implemented by this roadmap.

## Release gate

Keep all stages as separate draft work until:
- all tests and production build pass;
- each admin section has been checked at desktop, tablet and phone widths;
- critical workflows have been tested against staging data;
- database migrations are reconciled with the live migration ledger;
- security and role-negative tests pass;
- a single consolidated release branch/PR has been reviewed.

Only then request approval to merge and deploy.


## Stages 66–68 — remaining admin section responsive pass

- Stage 66: improved campaign/discount, flash-sale, banner, category/subcategory and coupon layouts at phone widths. Added stable selectors only where the existing audit-log/broadcast containers needed them; no campaign, price, coupon or category behavior changed.
- Stage 67: improved analytics, profit calculator and expense form/list layouts for small screens. Existing calculations and data handling were not changed.
- Stage 68: improved AI assistant chat/composer, staff panels, audit logs, local-only broadcast form, delivery settings and global settings layouts. Existing local-only staff/broadcast semantics remain unchanged and are not represented as real server-side permissions or delivery.
- Added responsive regression tests for each stage.
- CI at Stage 68 head `3986001acf5c751c33c36fb35922c3d325bb238a`: production build passed and dependency audit passed; CodeQL was still running at last check. Stage 69 adds another test, so its own checks must complete before the release gate.

## Stage 69 — order lifecycle and stock safety audit

### Verified existing database protections
- The order-status RPC locks the target order row with `FOR UPDATE` before applying a transition.
- Server-side rules prevent delivered-order rollback, shipped-order rollback/cancellation, and direct reactivation of cancelled orders.
- Cancellation validates every stored order line before stock restoration and checks that each product row was updated.
- Reactivation requires a recent password-authentication event, validates quantities, checks available stock and performs stock deduction in the same transaction.
- A database trigger also guards direct status changes; client roles cannot delete the order ledger.
- The admin UI uses the protected `admin_update_order_status` RPC. These server checks are authoritative; client-side disabled buttons are not treated as a security boundary.

### Change in this stage
- Added `tests/orderStatusDatabaseGuards.test.js` to protect these SQL-level invariants against accidental regression.
- No order records, stock, SQL migrations, live database settings, or production behavior were changed.

### Remaining verification
- Wait for Stage 69 GitHub Actions build, dependency audit and CodeQL.
- Test order creation, status changes, cancellation/restoration and password-confirmed reactivation against staging data before release.
- Verify real-time order arrival and customer/admin views in a browser session; static source tests alone do not prove live synchronization.


## Stage 70 — administrator support read receipts

### Verified defect
- The customer support view already marked administrator messages as read through `mark_support_ticket_messages_read`.
- The administrator inbox loaded conversation threads and synchronized them through Realtime, but did not call the same read-receipt RPC. As a result, customer messages could remain recorded as unread after an administrator opened the conversation.

### Change
- When an administrator opens the matching ticket thread while the page is visible, the client now calls `mark_support_ticket_messages_read` with the authenticated admin session and no guest access token.
- The conversation is rendered before the receipt request. Receipt failures are logged and do not interrupt message loading.
- Added `tests/adminSupportReadReceipts.test.js` to protect the open-ticket/visible-page guard and failure isolation.

### Safety boundary
- No existing ticket, message, user, access token, or read-receipt record was deleted or rewritten.
- No database migration, live Supabase setting, email delivery behavior, or production deployment was changed.
- This stage records the read receipt only; it does not claim that a reply is emailed to the customer. The admin UI continues to disclose that replies are stored in the support conversation and are not emailed by this action.

### Verification remaining
- Run the new test, full test suite, production build, dependency audit and CodeQL on the updated PR head.
- Verify admin read receipts against staging with an unread customer message, including a hidden tab and a different unselected ticket.


## Stage 71 — product catalog, variants and inventory safety audit

### Areas inspected
- Category-aware product fields for clothing, footwear, phones, laptops and accessories.
- Size/color option parsing, duplicate detection and variant-matrix coverage.
- Custom variant identity, price and stock validation.
- Product image/gallery upload and replacement flow.
- Product edit requests and the database stock-preservation trigger.
- Atomic stock updates and protection for variants referenced by order history.

### Verified safeguards
- Clothing and footwear use a dedicated size/color inventory matrix; each combination is independently stocked and validated, with a maximum of 50 variants.
- Phones expose memory/RAM/color fields; laptops expose CPU/RAM/SSD fields; clothing and footwear retain their respective size/material/color fields.
- Product edits do not directly overwrite the parent stock value. Changed variant stock is submitted through the authenticated atomic batch RPC.
- The database `preserve_product_variant_stock` trigger restores the current database stock for existing variant IDs during ordinary product metadata/variant edits. This prevents a stale admin form from undoing stock deductions made by checkout while the editor was open.
- The trigger rejects removal of custom variants referenced by order history and rejects reuse of variant IDs already present in order history.
- Atomic batch updates apply size/color and custom variant stock changes in one transaction and validate the primary administrator identity.

### Change in this stage
- Added `tests/adminProductVariantSafety.test.js` to protect the verified stock-preservation, order-history, atomic update and category-field safeguards.
- No product records, images, variant quantities, order records, migrations, live Supabase settings or production deployment were changed.

### Remaining verification
- Run the new regression test, full suite, production build, dependency audit and CodeQL.
- Test create/edit of a new clothing product, footwear size/color combinations, a phone, a laptop and an accessory against staging.
- Test simultaneous checkout and product editing with staging data to verify stock cannot be restored from an old form snapshot.
- Confirm historical order snapshots and image references remain available after safe product edits.


## Stage 72 — product image and gallery lifecycle audit

### Verified behavior
- Product images are uploaded to the `storefront-media` bucket under product-specific paths, with random suffixes and no overwrite.
- Upload validation checks the declared MIME type, file signature and a 5 MB per-image limit; the gallery is limited to 10 images.
- Checkout stores image and gallery snapshots on order items. Admin order details prefer the historical snapshot before looking at the current catalogue.
- Image cleanup checks other product references, historical order image URLs and legacy orders that do not have image snapshots. If a reference scan fails, cleanup fails closed and does not delete Storage objects.
- Product deletion is guarded by the database RPC; the UI removes the product row only after the RPC confirms success.

### Verified defect and fix
- The catalogue image-reference scan previously relied on one PostgREST request. With a default server row cap, catalogues larger than 1,000 products could be only partially scanned, potentially missing a reference held by a later product.
- Updated cleanup to page through products in stable `id.asc` order, using 1,000-row ranges, matching the existing historical-order scan.
- If either scan reaches the 100,000-row safety bound without a final short page, cleanup stops and retains the files.
- Added `tests/productImageStorageCleanup.test.js` for complete pagination, fail-closed behavior, order snapshots and legacy fallback protection.

### Safety boundary
- No Storage object, product image URL, gallery entry, product, order or historical snapshot was deleted or modified during this stage.
- No bucket policy, live Supabase configuration, production data or deployment was changed.

### Remaining verification
- Run the new test, full test suite, production build, dependency audit and CodeQL.
- Verify upload, edit, replace, remove and product-delete flows against staging with both shared product references and historical order snapshots.
- Verify the storefront-media bucket's actual policies and storage object ownership against staging before release.


## Stage 73 — pricing, discounts, flash-sale and stock synchronization audit

### Verified behavior
- Flash-sale discounts are applied through the authenticated server RPC, not browser-side price arithmetic.
- The database validates discount precision/range, category and supported duration; products with variants are excluded from base-price campaigns.
- Sale start/end/percentage are persisted on product rows and exposed as catalogue metadata.
- The canonical expiry worker is intended to run once per minute and restore the saved original price when the deadline passes.
- The temporary campaign-table implementation is not exposed to client roles; the compatibility migration restores the product-level expiry implementation and the later migration ensures a single canonical cron job.
- Price, old-price, stock and purchase-cost validation and database constraints already exist in the staged migration set. Quick stock edits are blocked for products with variants; variant stock uses the atomic batch RPC audited in Stage 71.
- Coupon creation/deletion and delivery-fee updates use database REST writes; client-side input validation is present.

### Verified defect and fix
- Both the full product editor and quick price editor could change a product's selling price while a persisted flash sale was active. The scheduled expiry worker later restores the previously saved old price, which could overwrite the administrator's newer manual price.
- Added guards to both admin price-edit paths: while the stored flash-sale deadline is still in the future, price and old-price changes are blocked with a clear Georgian explanation. Other product metadata and stock editing remain available; no sale data is cleared or rewritten.
- Added `tests/flashSaleManualPriceGuard.test.js` covering both editing paths and the persisted expiry behavior.

### Remaining verification
- Run the full suite, production build, dependency audit and CodeQL for the new head.
- Validate a complete flash-sale lifecycle against staging: create, refresh, replace, expiry, and manual price edit after expiry.
- Verify price/discount refresh with catalogues larger than the PostgREST row cap; the current admin post-sale refresh is a single request and may leave later products' in-memory admin values stale until a full reload. This is a UI-refresh limitation, not a database write failure.
- Verify coupon usage limits/expiry and delivery-fee values against the actual checkout path in staging.
- Do not apply migrations or modify live products/prices/coupons/fees until the consolidated release is explicitly approved.


## Stage 74 — coupon and delivery-fee calculation alignment

### Verified behavior
- Checkout reads active coupons and delivery fees from Supabase; cached coupons are cleared when authoritative coupon loading fails.
- Immediately before order creation, checkout re-reads both active coupons and delivery fees and stops for customer review if the selected coupon or regional fee has changed.
- The database checkout RPC recalculates product prices, paid add-on fees, coupon discount and delivery fee; browser-supplied total is not authoritative.
- Coupon codes are normalized to uppercase, and the server checks active status and minimum order amount.
- Server discount is rounded to two GEL decimal places before delivery is added.
- Delivery fee draft validation utility already enforced non-negative amounts with at most two decimal places, but the admin save handler did not use it.

### Verified defects and fixes
1. **Paid add-ons omitted from storefront coupon subtotal.** The server includes gift wrapping (5 GEL per unit) and VIP warranty (15 GEL per unit) in the discount-eligible subtotal, but the storefront preview previously counted only product prices. This could make coupon minimum eligibility and displayed discount/total differ from the server result. Updated `calculateCartSubtotalGEL` to include both camelCase cart fields and snake_case checkout fields, using integer tetri and the same fixed add-on prices as the SQL RPC. Existing checkout item grouping and server authority remain unchanged.
2. **Admin delivery fee precision bypass.** The admin save handler previously converted inputs directly to numbers and accepted precision beyond two decimals. It now uses `parseDeliveryFeeDrafts`, retains raw input strings while editing, and sets `min=0` / `step=0.01` on all three region fields. Blank, negative, malformed and >2-decimal values are rejected before any database write.

### Regression coverage
- Extended `src/utils/orderSafety.test.js` with multiple products, quantities, gift wrap and VIP warranty, covering both camelCase and snake_case cart shapes.
- Added `tests/checkoutPricingAlignment.test.js` to compare storefront calculation, server RPC add-on fees and admin delivery validation wiring.
- Existing `tests/deliveryFeeSafety.test.js` already covers zero fees, missing fields, negatives and 3-decimal precision.

### Safety boundary and remaining verification
- No coupon, delivery fee, product, order, stock, customer or historical record was changed.
- No migration was added/applied and no production deployment was made.
- Run all tests, build, dependency audit and CodeQL on this head.
- Staging verification still required for coupon min-order boundary, 100% discount, disabled/deleted coupon, fee changes between page load and checkout, and authenticated/guest checkout paths.


## Stage 75 — financial accounting, cancellations and returns audit

### Verified existing accounting rules
- Financial revenue, product COGS, delivery income and operating expenses are calculated from delivered orders in the selected reporting period.
- Cancelled orders are excluded from delivered revenue, gross profit and net profit.
- Order cancellation restores stock through the protected status transition RPC; completed/shipped orders cannot be rolled back to cancellation as a substitute for a return.
- Historical order-item purchase-cost snapshots are preferred; missing or estimated COGS prevents the dashboard from presenting a misleading definitive profit figure.

### Gap found and improvement
- Cancelled orders were silently omitted from the analytics KPI and financial CSV. This made cancellation volume and its nominal value hard to audit, even though cancelled orders were correctly excluded from sales.
- Added a separate cancelled-orders KPI showing count and nominal order value, added both values to the financial CSV, and taught the admin analyst to answer cancellation questions.
- The label explicitly says nominal cancelled order value is not a confirmed refund and is not sales revenue. This avoids representing a cancellation as a cash refund.

### Returns limitation — not implemented
- Current order lifecycle intentionally blocks status rollback for shipped/completed orders and contains no separate return/refund ledger or return status.
- Therefore the dashboard must not infer refunds from order status, and must not change delivered revenue or profit for a hypothetical return without a verified return/refund record.
- A real returns feature needs a separate audited workflow: return authorization, returned item/quantity, stock disposition (resalable/damaged), refund amount/method/status, timestamps, and transactional links to the original order. This requires a separately reviewed schema and customer/admin flows; no such schema or data was changed in this stage.

### Regression coverage and safety
- Added `tests/adminCancelledOrderAnalytics.test.js` for separate cancelled-order reporting, exclusion from sales, clear nominal-value labeling, and the protected shipped/completed status transitions.
- No existing orders, expenses, products, stock, customer data, financial records or order statuses were changed.
- No database migration was added/applied and no Production deployment was made.
- Run full test suite, build, dependency audit and CodeQL on the updated PR head.
- Staging verification still required for delivered/cancelled historical records, missing COGS cases, expense date boundaries and future return/refund workflow design.


## Stage 76 — historical COGS and add-on revenue accounting

### Verified source-of-truth
- The server checkout RPC reads product price and `purchase_cost` from the database and snapshots purchase cost, base price, add-on fee, vendor and category into each order item.
- Financial reporting prefers each order item's historical `purchase_cost` snapshot. If it is missing, it falls back to the current product cost only as an explicitly marked estimate; if neither is available, profit is suppressed as incomplete.
- Public catalogue roles cannot read internal purchase cost; the protected admin product RPC is the intended source for current product cost.
- The checkout snapshot stores base product price and paid add-on total separately, and coupon discounts are reflected in the final order total.

### Defect found and correction
- Admin finance previously treated the full order-item price (base product plus gift-wrap/VIP warranty) as product revenue, while COGS only included the product's purchase cost. This could overstate product margin and net profit because the add-on fulfilment costs are not currently captured.
- Added pure `splitOrderRevenue` calculation. It allocates the checkout discount proportionally between base product and paid add-ons, then reports product, add-on and delivery revenue separately.
- Product/vendor profitability now uses only discounted base-product revenue. Add-on revenue appears as its own income source and KPI, and is included in total order turnover but deliberately excluded from profit until its fulfilment cost is tracked. Delivery remains separately reported and included in net operating result as before.
- CSV export and AI analyst expose the add-on revenue and explicitly explain why it is not included in profit.

### Regression coverage
- Added unit tests for proportional coupon allocation, add-on and delivery split, legacy order lines without add-on snapshots, and fully discounted items.
- Added integration/static tests confirming checkout snapshots are the source, add-on revenue is separate from product/vendor profitability, uncosted add-ons are excluded from profit, and historical purchase-cost snapshots remain preferred over current catalogue estimates.

### Safety boundary and remaining verification
- No product purchase costs, historical orders, prices, coupons, delivery fees, expenses, stock or customer data were modified.
- No database migration was added/applied and no Production deployment was made.
- Run full tests, build, dependency audit and CodeQL on the updated PR head.
- Staging checks remain required for legacy order lines with absent add-on fields, coupon allocation rounding, delivery-address fee parsing, and matching historical COGS snapshots to old order records.

## Stage 77 — complete expense-ledger pagination

### Defect found
- The admin expense loader requested the entire ledger in one PostgREST response. With the common 1,000-row server cap, older expense rows could be silently omitted from period totals, category breakdowns and financial exports even though the database still retained them.

### Fix
- Admin expense history now loads in 1,000-row pages using explicit Range / Range-Unit headers and a deterministic created_at.desc,id.desc order.
- The 100,000-row safety bound fails closed. The UI keeps the last successfully loaded expense list and displays the loading error rather than replacing it with a partial ledger.
- Added tests/adminExpensePagination.test.js to cover stable paging, the row cap, and preservation of the last successful list on incomplete scans.

### Safety and remaining verification
- No expense record was created, edited or deleted; no historical financial data was rewritten.
- No schema migration, live Supabase setting or Production deployment was changed.
- Verify against staging with more than 1,000 expense rows, including rows sharing the same created_at, and confirm the period totals and CSV include the complete ledger.

## Stage 78 — complete admin order-ledger pagination

### Defect found
- The authenticated admin order refresh loaded the entire `orders` table in one PostgREST response. Under the common 1,000-row response cap, older delivered/cancelled orders could be omitted from the in-memory admin list, which feeds finance, analytics, order search and exports.

### Fix
- Admin order refresh now requests 1,000-row pages with explicit Range / Range-Unit headers and the existing deterministic `created_at.desc,id.asc` ordering.
- The complete list is committed to React state only after every page has loaded. A failed page or the 100,000-row safety bound leaves the last complete order snapshot intact.
- Existing authenticated headers, session-version checks, logout clearing, fetch lock, queued Realtime refresh and 15-second recovery polling remain in place.
- Added `tests/adminOrderPagination.test.js` for pagination, incomplete-scan protection and preservation of the authenticated session guard.

### Safety and remaining verification
- No order, order item, status, stock, customer record, financial record or historical snapshot was changed.
- No database migration, live Supabase setting or Production deployment was changed.
- Verify against staging with more than 1,000 orders, including same-timestamp records and Realtime inserts while paging; confirm the complete admin order list, financial KPIs and CSV export.

## Stage 79 — complete admin support-ticket history

### Audit finding and change
- The administrator support-ticket list previously fetched `support_tickets` in one PostgREST request. With the default 1,000-row response cap, older tickets could be omitted from the admin list even though their records remained in the database.
- Updated `fetchTickets` to request stable 1,000-row pages ordered by `created_at DESC, id ASC`, and only replace the displayed ticket list after the complete scan succeeds.
- Added a 100,000-row safety bound. If a page fails, the response is malformed, or the bound is reached without a final short page, the previous successful ticket list is retained and an error is surfaced.
- Added `tests/adminSupportTicketPagination.test.js` to protect pagination, stable ordering and fail-safe behavior.

### Safety boundary
- No support tickets, messages, read receipts, customer records, database schema, RLS policies or live settings were changed.
- The existing per-ticket message-thread RPC, realtime refresh, read-receipt handling and 15-second recovery polling remain unchanged.
- The legacy messages panel still explicitly requests its latest 100 records; this is a separate bounded view and is not represented as a complete message archive.

### Verification
- Run the new regression test, full test suite, production build, dependency audit and CodeQL on the updated PR head.
- Confirm the `get_support_ticket_messages` RPC returns complete threads for long-running tickets; this stage changes only the ticket index, not the RPC contract or thread pagination.



## Stage 81 — complete customer support ticket history

### Verified defect
- The authenticated customer history RPC returned at most 50 tickets and the client requested only that first page. Customers with more than 50 account-linked requests could not reach older tickets from the support panel.
- The individual ticket conversation RPC returns the selected ticket's complete message thread; no message-row limit was found in its SQL implementation. This is separate from the 50-ticket list limit.

### Change
- Added `get_my_support_tickets_page`, an authenticated, owner-scoped RPC with a maximum page size of 50 and a deterministic keyset cursor using latest-message timestamp plus ticket ID.
- The new RPC requires both cursor fields together, validates the ticket ID shape, and filters every page by `auth.uid()` and `customer_user_id`. Anonymous access is revoked; only authenticated users may execute it.
- Kept the original `get_my_support_tickets(integer)` RPC unchanged for older clients.
- Updated the customer support panel to load additional pages on demand, merge pages by ticket ID, and retain already loaded older pages during periodic refreshes.
- Guest ticket-number/access-code recovery and the existing full per-ticket conversation view remain unchanged.
- Added regression tests for owner scoping, bounded page size, deterministic cursor ordering, client cursor parameters, deduplication and the load-more UI.

### Safety boundary
- No existing support ticket, message, customer, access-token hash, read receipt or other user data was changed or deleted.
- No live Supabase migration was applied, no production setting was changed, and no deployment or merge was performed.

### Verification remaining
- Run the new regression test, full test suite, production build, dependency audit and CodeQL on the updated draft PR head.
- Apply the new migration only after checking the live migration ledger and confirming the `private` schema exposure configuration remains appropriate.
- Verify account A cannot read account B's history, test more than 50 tickets across multiple pages, and confirm guest access-code recovery and full thread loading against staging.
