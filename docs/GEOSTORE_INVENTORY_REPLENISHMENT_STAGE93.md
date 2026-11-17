# GEOSTORE Stage 93 — Replenishment planning foundation

Status: helper and unit tests staged on Draft PR #129. No UI, schema, live database or stock mutation is included in this foundation commit.

## Scope
- Build a read-only plan from the catalogue's existing product and variant stock values.
- Evaluate variant-backed products per variant and never count the aggregate parent stock as a second position.
- Default low-stock threshold: 5 units. Default target stock: 20 units.
- Allow a later private settings table to override threshold and target per product/variant.
- Calculate the suggested replenishment quantity as max(0, target - current stock) only when current stock is at or below its threshold.
- Filter by product name/ID, SKU, category, variant name or variant ID.

## Safety
- This helper never writes stock, orders, purchase orders or customer data.
- Invalid/missing stock values and invalid saved settings are excluded rather than guessed.
- This is not yet a complete admin feature. The next step is a protected settings API and responsive admin tab, followed by migration tests and CI.
- No Supabase migration has been applied; no Production database or deployment has been changed.
