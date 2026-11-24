# Admin video redesign — batch 01 (2026-11-24)

Production baseline: 639724a3c4bddb688c1f147044fc54d5b20d05ce. Phase A is applied; Phase B remains a separate pending production security operation. No database or Production changes in this batch.

Reviewed 66.9-second iPhone recording at two-second intervals across its full duration, plus source inspection. No claim that every intermediate frame or off-screen admin module has been visually verified.

Observed: 0–5s mixed dark/light controls and redundant spacing; 5–11s product card labels crushed into vertical letters by legacy narrow icon-button rules, pale stock surfaces; 12–28s stock list density and repeated navigation; 30–35s nearly unreadable ticket statuses and pale reply backgrounds; 38–62s inconsistent navigation and form contrast; 63–67s squeezed category labels and fragmented controls. iOS sign-in popup in video is external OS UI, not evidence of a site bug.

First batch: scope an explicit admin-only style layer to the real workspace, restore full product action labels and readable stock surfaces, semantic support status colors, category/subcategory identity and four accessible move/edit/delete controls, logout and mobile selector contrast. Owner theme variables remain available, no settings reset, no handlers removed. Additional work: actual full admin route review (orders, staff, editor, dashboard, analytics, CRM, finance, campaigns, banner/coupon/notification forms, inventory tables); compact header and consistent design system, then one coordinated preview/release.

Only accumulation branch internal-admin-video-redesign-2026-11-24 is opted out of automatic Vercel deployments through branch-specific git.deploymentEnabled. Main/other branches remain enabled. Keep all changes in one draft PR and do not merge until reviewed and approved.

## Batch 02 — shared admin chrome
Scoped header/sidebar colors and navigation states use the existing responsive editor tokens (with staff fallbacks). Removed navigation scaling and heavy chrome shadows, added visible focus rings, preserved full labels and 44px action targets. Mobile header/sidebar padding and radii have bounded values to prevent oversized chrome; below 360px header actions stack. No JSX, permission, persistence, or storefront handler changes. Static regression assertions added; actual responsive browser review remains required. Batch 01 build, dependency audit, CodeQL and isolated PostgreSQL check passed; responsive browser smoke was cancelled.
