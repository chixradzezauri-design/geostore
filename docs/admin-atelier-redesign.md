# GEOSTORE Atelier — admin redesign

Stage 1: use the existing visual-design schema as the single source of design tokens. A porcelain canvas, aubergine navigation and amethyst action color replace the default PRO palette. Use a 256px sidebar and an 18px section gap through the existing responsive token path. Do not introduce another blanket override stylesheet.

The existing professional preset now selects Atelier. Untouched legacy owner settings and staff default views project to Atelier without a storage write; explicitly saved custom desktop and responsive appearances remain unchanged until the owner chooses the preset. Existing per-element custom values, content, saved templates and responsive overrides remain supported. Status colors, authorization, action handlers, API calls and database schemas are out of scope for this stage.

## Release gates (not yet verified)
- Build and all existing unit and integration tests.
- Chromium and WebKit browser matrix, including 320, 360, 390, 430, 768, 1024 and 1440 px.
- Verify actual computed colors, contrast, text flow, overlapping controls, keyboard focus, dialogs, native controls, and no storefront style leakage.
- Consolidate chrome and module layouts in later commits: inventory, orders, catalog, customer support, marketing, finance, users, staff, design editors, settings.
- Review selectors and remove obsolete competing declarations only when equivalent behavior is covered by tests. Do not conceal layout bugs with global overflow clipping.
- Review permission boundaries and security checks separately; never modify live data or deploy without explicit approval.

Stage 1 is not a completed visual redesign or a production release.
