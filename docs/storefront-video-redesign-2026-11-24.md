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
