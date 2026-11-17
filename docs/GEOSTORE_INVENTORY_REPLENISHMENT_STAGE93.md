# GEOSTORE Stage 93 — Inventory replenishment planner

Status: implementation staged on Draft PR #129. The migration is committed to the draft branch only and has NOT been applied to the connected/live Supabase project.

## Delivered in the draft
- Read-only replenishment calculations from existing product and variant stock.
- Variant-backed products are evaluated per variant; aggregate parent stock is not double-counted.
- Default low-stock threshold: 5 units. Default target stock: 20 units.
- Suggested quantity is max(0, target - current stock), shown only when stock is at or below the threshold.
- Search by product name/ID, SKU, category, variant name or variant ID.
- Responsive admin tab with editable per-position threshold and target values.
- Command Center low-stock KPI and queue link to the replenishment planner.
- Private settings table and admin-only list/save RPCs; the save path locks and validates the product and exact variant before writing settings.
- Automated helper and migration regression tests.

## Safety boundaries
- The planner never changes stock, orders, products or purchase orders.
- No automatic purchase-order creation or customer notification is included.
- Settings live in a private schema; direct table access is revoked and RLS is enabled.
- RPCs require the existing primary-admin UUID and app_metadata.role = admin.
- Invalid stock values or invalid thresholds are excluded/rejected rather than guessed.
- No existing order, customer, message, product, stock balance or setting was changed.
- No Supabase migration was applied and no Production deployment or merge was performed.

## Verification still required
- GitHub Actions test/build and CodeQL on the final PR head.
- Apply the migration to an isolated Supabase staging branch, then verify list/save RPC behavior and admin denial for non-admin accounts.
- Browser/device checks at 1440, 1024, 768, 390 and 320 CSS pixels.
- Confirm the app degrades clearly when the migration is not installed.
