# Storefront video redesign — 2026-11-24
Source: 52.07s iPhone recording, sampled at 2-second intervals throughout (26 frames). Recording shows a deployment URL, not proof that the production release has identical settings.
## Observed defects
- 0–6s: hero proportions, category layout, asymmetric price filter, dense cards/footer.
- 8–12s: size selector heading/tools squeezed into narrow columns; product details and reviews.
- 14–16s: dark flash-sale product photos, dark title bars.
- 18–26s: long mobile menu with excessive section spacing; duplicated profile entry.
- 28–38s: dark profile card inconsistent with light storefront; floating action overlap; admin itself out of scope.
- 40–46s: category navigation, filter and hero hierarchy.
- 48–52s: dark tracker panel with poorly readable title and fields.
## Batch 01
Fixed specific size tool layout, flash photo blending/title treatment and tracker contrast with scoped CSS and minimal semantic hooks. Existing product selection, stock checks, order lookup and editor state remain unchanged. No database or API changes. No Preview; production remains unchanged pending approval. CI and authenticated real-device visual verification pending.
## Next
Header/menu/search, hero, category and catalog layout, profile/commerce surfaces and floating actions, editor compatibility, final verification.

## Batch 02 — Header, search and mobile navigation
Removed redundant authenticated profile menu link (profile remains in heading), use configured brand name in menu, restored services section's existing editor target. Two-column menu groups with single-column fallback at <=359px; all navigation handlers and admin condition preserved. Compact spacing, 44px controls, readable search placeholder, iOS focus-safe search input and focus outlines. Derived element-specific CSS variables retain explicitly edited menu padding, typography and colors where new rules apply. Batch 01 four reported CI workflows passed; new batch CI and real visual verification pending. No production/preview action.

## Batch 03 — hero, banners and flash-sale presentation
Improved hero typography, compact mobile content, and collection CTA navigation to the first visible catalog section while preserving category resets. Preserved configured hero image, height, overlay, order and visibility. Applied derived element-style variables to the redesigned title/description/buttons and offer section; improved banner text and flash-sale countdown legibility, removed perpetual icon animation, and fixed single-card narrow-screen layout. Existing discount calculations, stock guards, add-to-cart, safe external links and custom sections unchanged. Batch 02 build/dependency checks passed; browser and CodeQL were still running at start. No production/preview action.

## Batch 04 — catalog discovery, filters and cards
Preserved category/subcategory selection, search, price validation, sorting, product reorder, favorites, comparison, detail and pagination handlers. Made price fields symmetric with a dedicated label row and optional reset row; mobile fields retain 16px minimum. Improved category and product type, imagery, selected controls and touch targets, narrow-device fallback. Hero collection CTA now falls back to product grid/empty state when categories/filters are hidden. Corrected prior Flash Sale DOM test expectations to require both the new hooks and original class names (prior CI 1059/1060; one stale exact class assertion). No API, data or production changes. New CI pending.

## Batch 05 — product detail and gallery
Use in-flow flex purchase footer so variable-height purchase messages do not cover review/description content. Responsive desktop two-column gallery/detail layout, visible selected image, theme-aware image/variant/price/description surfaces, accessible sizing controls and review wrapping. Preserve stock checks, size/color/variant selection, add-to-cart payload, review upload/submission and existing focus handling. Respect explicitly selected visual-editor viewport in derived element styles. Batch 04 CI 1060/1061, fixed stale exact product open handler test with explicit focus-return assertion. New CI pending; no Production or Preview.

## Batch 06 — cart, favorites, coupon and checkout
Added localized continue-shopping controls to empty states; improved cart item layout, variant text, thumbnail visibility, quantity/remove controls, coupon wrapping and total hierarchy. Portaled checkout and confirmation receive the same normalized storefront theme variables as the storefront, with accessible labels/invalid-field styling and non-overlapping mobile submit flow. Existing saved-item actions, stock enforcement, prices, coupon eligibility, delivery fees, checkout validation, order submission and confirmation copy action preserved. Batch 05 build/dependency passed; browser/CodeQL were in progress at start. No API/database or Production/Preview changes. New CI pending.

## Batch 07 — customer profile, order history and account dialogs
Replaced conflicting dark profile surfaces with storefront theme tokens, removed email truncation, improved order code/date/item wrapping and accessible status contrast, added existing history error visibility when cached orders remain. Login, registration and password recovery forms plus notification cards use consistent surfaces and 44px targets; no authentication/security policy, identity, status or order API changes. Batch 06 build/dependency/isolated checkout contract passed; browser/CodeQL were running at inspection. No Production/Preview. New CI pending.

## Batch 08 — assistance and additional services
Hide launchers behind active dialogs and AI launcher while support is open. Refine assistance messages, support inputs, photo upload keyboard access and truthful visual search limitation, compare and wardrobe surfaces. Restore sticky mobile checkout submit and scroll padding after 320px browser failure on batch 07 (other four checks passed). No service integration, database or production change. CI pending.

## Batch 09 — footer and shared visual consistency
Use theme-aware footer surfaces and explicit visual-editor values for legal controls and copyright. Added existing customer-support entry and configured store identity, no fabricated social/contact addresses. Legal links and admin footer behavior retained; mobile two-column links and narrow single-column fallback. Batch 08 build, dependency and isolated checkout contract succeeded; browser and CodeQL were still running at inspection. No production/preview change. Next: editor compatibility and consolidated visual/functional tests.

## Batch 10 — visual editor compatibility
Internal preview previously lacked the storefront shell selector, and Header/Footer inferred device from browser rather than selected preview. Shared sanitized style-token helper, explicit viewport props and guarded editor CSS overrides now align preview/live surfaces. No persisted schema, authorization, publication, or cloud synchronization changes. Existing draft polling, version conflict and save/publish paths inspected and preserved. Batch 09 build/dependency/isolated checkout checks passed; browser/CodeQL pending at inspection. New CI pending; no deployment.
