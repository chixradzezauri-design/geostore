# GEOSTORE — product categories, attributes and variant model audit

Date: 2026-11-12  
Repository: `chixradzezauri-design/geostore`  
Branch: `fix/admin-panel-audit-2026-11-10`  
Scope: admin product editor, category classification helpers, customer-side cart/variant validation, live product schema and current product/variant metadata. Production inspection was read-only.

## Summary

The current product editor already distinguishes clothing, footwear, phones and laptops. The form is not a single generic editor:

- Clothing: sizes, material and colors; optional per-size/per-color stock matrix.
- Shoes: EU sizes, material and colors; optional per-size/per-color stock matrix.
- Phones: memory-capacity options, RAM, color, model, chipset/CPU, screen size and operating system.
- Laptops: CPU, RAM, SSD/storage, model, GPU, screen size and operating system; independent custom variants are supported.
- Accessories and all other categories: currently use the generic size/color option area. There is no separate accessory-specific field group yet.

Category recognition handles Georgian, English and Russian terms for clothing, shoes, phones, laptops and accessories. Accessory detection intentionally takes precedence over phone/laptop words in compound names such as “Phone Accessories”.

## Important data-model distinction

The product table has dedicated columns for `model`, `cpu`, `ram`, `storage`, `gpu`, `screen_size`, `os`, `material`, `durability`, `available_sizes`, `available_colors` and JSONB `variants`.

- `available_sizes` and `available_colors` are option labels, not independent stock ledgers.
- Apparel/footwear inventory uses JSONB `variants` rows with `variantType: "size_color"`; each combination has its own stock.
- Phone/laptop price-and-stock combinations use custom variant rows (without `variantType: "size_color"`). The editor and storefront require a selected custom variant when those rows exist.
- Legacy option labels without corresponding inventory rows are validated as allowed labels, while stock is checked against the product's aggregate stock. They must not be described as per-option stock tracking.

The admin category-change handler rebuilds the size/color matrix only for clothing and shoes. For other categories it clears the matrix; when editing a product with existing size/color rows, it asks for confirmation before discarding those rows from the editor. A rejected confirmation leaves the editor unchanged. Backend product update and variant-preservation safeguards remain the final protection against silent stock loss.

## Live Production snapshot

- 8 products: clothing 5, shoes 1, laptops 1, accessories 1.
- No phone product was present in the inspected live catalog, so the phone workflow was verified from source code, not live product data.
- All 8 `variants` values were arrays; no product exceeded the 50-variant limit.
- Five clothing products had 0, 8, 10, 10 and 12 size/color rows respectively (one product had no variant rows).
- The shoe product had 12 size/color rows.
- The laptop product had 3 custom variants.
- The accessory product had no variant rows.
- No Production product data was changed. No product was created, edited or deleted.

## Findings and recommendations

1. **Accessory attributes are generic.** The accessory category is recognized, but it does not have dedicated fields such as accessory type, compatibility, dimensions, material, or fit. The current schema can store some general properties, but it does not provide a structured accessory-specific specification model. No fields were invented in this audit; the right set should be chosen before extending the schema and editor.
2. **Phone memory labels are not inventory variants.** The phone editor stores capacities in `available_sizes`. If capacity affects price or stock independently, each capacity must be represented as a custom variant with its own price and stock. The label list alone does not guarantee this.
3. **Laptop configurations should use custom variants when stock/price differs.** The editor has both technical specification fields and a custom-variant editor. Configuration labels alone do not create separate stock balances.
4. **Category matching is regex-based.** Unrecognized custom category names fall back to the generic attribute area. If the store later introduces new category names or synonyms, add explicit classification tests before using them in the editor.
5. **No proven silent stock-loss path was found in the reviewed category-change handler.** It rebuilds apparel/footwear matrices, warns before removing existing matrix rows, and relies on server-side order-history protections. The live variant distribution was consistent with the expected apparel/footwear and laptop custom-variant patterns.

## Verification boundary

Source review covered `AdminDashboardPro.jsx`, `productCategories.js`, `productValidation.js`, `productFormSafety.js`, `productVariants.js`, `cartSafety.js`, the storefront add-to-cart path and existing category/variant tests. Live schema and product metadata were queried read-only.

This was not an end-to-end browser test. The current report commit is documentation-only; no CI run is claimed for this commit. Previous green CI runs refer to earlier source commits.

## Release / next-step gate

Before adding accessory-specific fields, decide which structured accessory properties are actually needed (for example: accessory type, compatible device/model, dimensions, material, and included items). Then add fields additively, preserve existing generic `available_sizes`/`available_colors` and all variant JSON, update customer product details/search where appropriate, and add regression tests. Do not reinterpret existing size/color arrays as independent stock.

No Production schema, data, grants, Storage objects, migrations, deployments or PR merge were changed in this audit.
