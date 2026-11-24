# Admin workspace deep audit — 2026-11-24
Base: beb4391c341769dfe81fe30d22d308b45262c1ec (PR #151 production storefront release). Existing admin video redesign remains intact. No preview deployments for the audit branch; no production merge without approval.

## Plan (17 blocks)
1. Navigation and workspace header; 2. Command center; 3. Orders; 4. Product editor; 5. Inventory and replenishment; 6. Categories; 7. Finance, analytics, expenses and calculator; 8. Staff/permissions; 9. CRM; 10. Support/messages; 11. Promotions, coupons, banners; 12. Vendors, logs, broadcasts; 13. AI analyst and settings; 14. Both visual editors; 15. Shared visual polish, Georgian typography and responsive layout; 16. Functional/visual/security verification; 17. Production release only after approval.

## Initial source review
AdminDashboardPro has 7,629 lines and 23 permission-filtered modules. Existing admin styling spans multiple CSS layers including the prior video redesign; do not repeat resolved issues. Review source for each block and preserve mutation handlers, role gates and visual-editor tokens. An authenticated real-device visual audit has not yet been performed.

## Block 01
Five logical navigation groups for desktop and native mobile optgroups; tablet rail retains all permitted actions. Removes redundant emoji in rendered labels (Lucide icons remain), exposes active section via aria-current, replaces generic greeting with current module title and compact role subtitle. No permission, data, server or publishing changes. Tests added for exact module coverage and permission preservation. CI pending.

## Block 02 — command center
Four KPI cards retain navigation and show unavailable data rather than false zero when orders, support or replenishment are not verified. Low-stock groups and KPI now use the same replenishment planner positions, including saved per-position thresholds (not the obsolete fixed five-unit summary). Improve card alignment, wrapping of long names, 44px actions, compact copy and semantic dates. No data mutation, permissions or financial calculation change. Block 01 CI 1066/1068: two literal navigation regex assertions updated to validate grouped permission-filtered desktop and mobile rendering. New CI pending; production untouched.

## Block 03 — orders
Verified previous block: all five CI workflows passed, 1069/1069 automated tests. Orders list distinguishes unverified/error data from empty results, CSV export blocked until confirmed complete data (existing all-orders semantics unchanged), filter clear action and reset search pagination across statuses. Canonical localized status labels and matching status colors in card/modal; actual stock and owner-only reactivation guards unchanged. Accessible note label, accurate item-row count, localized missing-photo label, responsive detail actions and financial wrapping. No order mutation/RPC/DB changes. New CI pending; production unchanged.
