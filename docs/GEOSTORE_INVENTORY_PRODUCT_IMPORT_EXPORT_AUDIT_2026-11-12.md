# GEOSTORE product inventory import/export audit — 2026-11-12

## Scope
Reviewed the admin product CSV export, shared CSV serialization, product editor model, variant/stock representation, and repository test/scripts inventory. All code changes are confined to `fix/admin-panel-audit-2026-11-10`.

## Findings
- The admin dashboard exposes product CSV export, order CSV export, and financial report CSV export.
- No product/inventory CSV import workflow was found. The `FileReader` usages in the admin component are for image/data-URL handling, not CSV parsing or product import.
- The former product export contained only seven columns: ID, SKU, name, category, base price, aggregate stock, and vendor. It omitted product metadata and the exact variant stock matrix, so the file was not a complete product-data backup.
- Product records in the editor contain additional fields: old price, purchase cost, description, tags, material, durability, brand, model, CPU, RAM, storage, GPU, screen size, OS, available sizes/colors, variants, main image, gallery, published state, and featured state.
- Variant stock is important: aggregate `products.stock` may be derived from variant quantities. Exporting only aggregate stock cannot preserve individual size/color/custom variant stock allocations.
- The shared CSV writer emits UTF-8 BOM, uses semicolon separators, quotes cells and doubles embedded quotes, and prefixes formula-like cells (including values preceded by whitespace/control characters) to mitigate spreadsheet formula injection.
- Product image URLs are exported as references, not binary image files. CSV alone is not a complete Storage/media backup.
- No matching import parser/validator, preview/dry-run, duplicate-ID/SKU conflict handling, or transactional bulk-save path was found. Therefore the exported CSV must not be presented as a directly restorable import file.

## Change made
Expanded the product export while retaining the original seven columns first, preserving their existing order for spreadsheet compatibility. Additional columns now include:
- old price and purchase cost;
- description, tags, material, durability, brand and technical specifications;
- JSON-encoded available sizes and colors;
- JSON-encoded complete variants, including per-variant stock/price/identity;
- main image URL and JSON-encoded gallery URLs;
- published and featured flags.

The existing shared CSV escaping/formula-safety implementation remains in use. The export activity log now records that a full product CSV was exported and includes the product count.

## Data safety
- Export is read-only; it does not update product rows, stock, variants, orders, or Storage.
- No import operation was introduced. This avoids accidentally overwriting existing products, stock, variants, or historical order snapshots with an unvalidated CSV.
- Image URLs in CSV do not copy underlying Storage objects. Keep a separate verified Storage backup for actual media recovery.
- The export contains purchase cost and other admin-only product metadata; it must be treated as confidential and stored only in a trusted location.

## Validation limitations
- Code was reviewed and the update was committed to the audit branch.
- Node tests and Vite build were not run; no current-HEAD CI success is claimed.
- No real CSV download/open/import was performed in a browser or spreadsheet application.
- No Production data, database schema, Storage objects, permissions, or settings were changed. No import, bulk update, product mutation, deployment, merge, or Production promotion occurred.

## Recommended next step
Design a separate safe import workflow only after defining a versioned CSV schema, required/optional columns, strict field and variant-stock validation, image URL ownership checks, duplicate detection, explicit preview/dry-run, row-level error report, and an all-or-nothing or clearly resumable server-side write strategy. Never import by directly overwriting historical order snapshots or silently replacing product IDs/variant IDs.
