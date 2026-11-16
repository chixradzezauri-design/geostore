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
