# GEOSTORE Design System 2.0 — staged roadmap

## Goals
Improve design consistency and readability at phone (320–430px), tablet (640–1024px) and desktop (1024–1440px) widths without losing any existing functionality, saved storefront/admin visual editor settings, or production data.

## Phase 1 — compact surfaces, mobile text and keyboard UX (this Draft PR)
- Add a small standalone `src/designSystemV2.css` imported **after** legacy styles.
- Define spacing/focus tokens scoped to the existing storefront and admin shells; do not hard-code global palette/typography.
- Compact the read-only operational KPI and command panel surfaces without changing state or handler logic.
- Make long translated menu labels, header search and announcement copy shrink safely on narrow screens.
- Keyboard `Escape` closes the storefront menu and restores focus to the menu button.
- Add six Node regression tests and extended Chromium smoke coverage.
- New styles intentionally **do not** override visual-editor properties addressed by `data-visual-editor-target`.

## Planned phases (not implemented yet)
1. Product detail presentation: image/gallery arrangement, mobile option picker and purchase action accessibility, ensuring variant stock checks remain authoritative.
2. Checkout: improve field errors, step hierarchy, responsive layout and keyboard flow without changing order/payment business logic.
3. Extract duplicated legacy CSS into reviewed modules, one component at a time; preserve the author-defined `--gs-*`/admin visual editor variables and run visual/browser QA per extraction.
4. Runtime performance, image decoding, Web Vitals and SEO, based on measured baselines.
5. Admin operations enhancements, export/bulk actions and permissions only after server-side safety checks.

## Acceptance and release rules
- Existing frontend/admin behavior, saved presets, Supabase rows and RLS must remain intact.
- `npm test`, production build, CodeQL, dependency audit and the responsive Chromium workflow should pass at the exact PR SHA.
- Browser and authenticated admin/editor checks are separate gates. Automated unauthenticated tests are not evidence of permission-protected flows.
- Keep this PR **Draft** and separate from completed PR #145. Do not merge or deploy it until separately reviewed and authorized; Vercel quota may prevent fresh previews.
