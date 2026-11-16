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
