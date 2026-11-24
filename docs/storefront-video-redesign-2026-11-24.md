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
