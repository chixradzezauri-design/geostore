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
1. Product detail presentation: **Stage 2 in progress** — responsive gallery, readable mobile options, visible purchase CTA, accessible labelled modal with Escape/focus recovery. Inventory validation and cart handlers unchanged.
2. Cart and checkout: **Stage 3 in progress** — enlarge quantity controls, compact cart summary/coupon layout, constrain checkout modal on phone, improve checkout error semantics and keep ≥16px mobile inputs. Order/price/payment RPC logic unchanged.
3. Legacy CSS extraction: **Stage 4 first pass** — move the compact responsive compatibility tail from `index.css` into `responsiveCompatibility.css` at the exact original import order (no cascade reordering), with mobile/desktop browser QA. Continue isolated sections only after tests.
4. Runtime performance: **Stage 4 first pass** — stop the storefront-wide Flash Sale 1-second rerender when no promotion is active, correctly wake future scheduled sales, pause hidden tabs and resume on visibility.
5. Image decoding, Web Vitals and SEO based on measured baselines (Lighthouse/field data not yet verified).
6. Admin operations enhancements, export/bulk actions and permissions only after server-side safety checks.

## Acceptance and release rules
- Existing frontend/admin behavior, saved presets, Supabase rows and RLS must remain intact.
- `npm test`, production build, CodeQL, dependency audit and the responsive Chromium workflow should pass at the exact PR SHA.
- Browser and authenticated admin/editor checks are separate gates. Automated unauthenticated tests are not evidence of permission-protected flows.
- Keep this PR **Draft** and separate from completed PR #145. Do not merge or deploy it until separately reviewed and authorized; Vercel quota may prevent fresh previews.
