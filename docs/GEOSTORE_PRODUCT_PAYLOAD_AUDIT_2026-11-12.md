# GEOSTORE — server-side base product payload validation audit
Date: 2026-11-12
Branch: `fix/admin-panel-audit-2026-11-10`
Migration: `supabase/migrations/20261112063136_product_base_payload_validation.sql`

## Scope
Reviewed the product create/update paths in `src/components/AdminDashboardPro.jsx` and the live definitions of:
- `private.admin_save_product(jsonb)`
- `private.admin_update_product_with_stock(jsonb,jsonb,jsonb)`

Creation calls `admin_save_product`; editing calls `admin_update_product_with_stock`.

## Findings
The browser form enforced:
- Name ≤160 characters; category ≤80; description ≤5,000.
- Tags: at most 30, each 1–40 characters, case-insensitive unique.
- Available sizes/colors: at most 30 each, each 1–40 characters, case-insensitive unique.
- Material ≤160; durability ≤240; model/GPU ≤120; screen size ≤40; OS ≤80.
- Gallery: 1–10 images.
- Money: 0–1,000,000,000 GEL, max 2 decimals; stock: integer 0–1,000,000.

The privileged database RPCs did not independently enforce all of those rules. Existing table CHECK constraints protected money ranges/precision, stock bounds, and array counts, but not JSON item types, empty strings, duplicate tags/options, gallery item shape, or the matching text-field limits.

## Staged remediation
Generated the migration filename with Supabase CLI 3.1.0 (not hand-invented). The migration adds private immutable function `private.validate_product_base_payload(jsonb)` and invokes it from both privileged product create and update RPCs.

It validates required identity/name/category, JSON numeric types and money/stock formats, optional text-field types, established UI text limits, unique bounded tags and size/color options, and a non-empty 1–10 string-image gallery. It does not invent length limits for fields whose current UI does not define one.

No client UI behavior changed. Existing product rows, orders, stock, images, and variants are not rewritten. Existing variant integrity validation and stock-preservation behavior remain in place.

## Verification
- Isolated PGlite migration/RPC harness: **25 checks passed**.
- Covered valid payloads; malformed root/required fields; name/category/description limits; string price and excessive precision; negative purchase cost; fractional stock; malformed/duplicate tags; malformed/oversized/duplicate size/color options; malformed/empty/oversized gallery; invalid old price; valid create; invalid create rejection; update preserving omitted stock; invalid update rejection without row mutation.
- Read-only live audit: 8 products, zero invalid name/category/description/specification lengths; zero malformed or oversized tags/gallery/size/color arrays; zero invalid tag/gallery/option elements; zero duplicate tags or option values; zero missing/oversized main image values.

## Release safety
This migration is staged on the audit branch only and has **not** been applied to live Supabase. No product/order/stock/Auth rows were changed; no live test product/order was created. No Production deployment or PR merge. Keep PR #87 Draft/unmerged until the full audit is complete and the user explicitly approves the combined release.
