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
5. Image loading: **Stage 5 first pass** — convert category decoration from CSS backgrounds to native lazy/async images with unchanged hover crop/overlay; show accessible cart/wishlist placeholders on failed image URLs. Remove only byte-for-byte adjacent duplicate CSS declarations. Web Vitals and SEO still require measured field baselines.
6. Admin operations: **Stage 6 first pass** — improve existing product-list quick edit accessibility, readable buttons, mobile controls and pagination without changing save/publish authorization. Existing CSV exports remain. Bulk actions and permissions require separate server-side safety checks.

## Acceptance and release rules
- Existing frontend/admin behavior, saved presets, Supabase rows and RLS must remain intact.
- `npm test`, production build, CodeQL, dependency audit and the responsive Chromium workflow should pass at the exact PR SHA.
- Browser and authenticated admin/editor checks are separate gates. Automated unauthenticated tests are not evidence of permission-protected flows.
- Keep this PR **Draft** and separate from completed PR #145. Do not merge or deploy it until separately reviewed and authorized; Vercel quota may prevent fresh previews.


## Phase 6 — admin product operations, first pass
- Ensure price, cost, stock and product-specific icon actions have meaningful accessible names; make edit/delete actions readable with text.
- Organize existing product-row quick actions into two columns at 381–639px and one column on ultra-narrow 320–380px phones, preserving the older responsive safety layout; stock/publish span full width in the two-column mode.
- Keep numeric inputs legible on iOS, preserve 44px touch targets and protect long names and SKUs from forcing horizontal overflow.
- Add a targeted Node regression test. No database, RLS, payment, cart, save or publication workflow changes.
- Verify CI and authenticated admin editor workflow before any merge; avoid inferring authenticated coverage from public browser smoke.


## Phase 7 — order operations first pass
- Reuse the already-tested `getPaginationItems` bounded page-number window for order pages, instead of rendering one button for every page. Existing five-order page size and page-by-status memory are unchanged.
- Label order search, grouped status filters and order-specific detail/invoice controls; expose pressed filter state to assistive technology.
- Add scoped, responsive touch-height rules for order filters, status controls, action buttons and pagination; keep phone search inputs at 16px to avoid Safari focus zoom.
- Add Node regressions and a Chromium fixture exercising these controls at 320–1440px.
- Out of scope: status transitions, reactivation rules, stock restoration, invoices, exports, Supabase data, customer data, RLS, payment handling or publication.
- Require exact-HEAD build and Chromium success plus authenticated admin validation before release.
