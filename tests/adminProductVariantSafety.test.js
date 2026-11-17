import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const variantGuard = await readFile(new URL('../supabase/migrations/20261107170000_integrate_custom_product_variants.sql', import.meta.url), 'utf8');
const atomicStock = await readFile(new URL('../supabase/migrations/20261110043433_admin_atomic_variant_stock_batches.sql', import.meta.url), 'utf8');
const categories = await readFile(new URL('../src/utils/productCategories.js', import.meta.url), 'utf8');
const validation = await readFile(new URL('../src/utils/productValidation.js', import.meta.url), 'utf8');

test('editing product metadata does not overwrite checkout-updated variant stock snapshots', () => {
  assert.match(admin, /const updatePayload = \{ \.\.\.newProdPayload \};[\s\S]*?delete updatePayload\.stock/);
  assert.match(variantGuard, /CREATE OR REPLACE FUNCTION private\.preserve_product_variant_stock/);
  assert.match(variantGuard, /geostore\.variant_stock_adjustment/);
  assert.match(variantGuard, /v_variant := jsonb_set\(v_variant, '\{stock\}', to_jsonb\(\(v_existing->>'stock'\)::integer\), true\)/);
  assert.match(variantGuard, /CREATE TRIGGER preserve_product_variant_stock[\s\S]*?BEFORE UPDATE OF variants ON public\.products/);
});

test('variant stock changes use the authenticated atomic batch RPC, not the stale form snapshot', () => {
  assert.match(admin, /rpc\/admin_update_product_with_stock/);
  assert.match(admin, /p_size_color_stocks:\s*changedSizeColorStocks/);
  assert.match(admin, /p_custom_variant_stocks:\s*changedCustomVariantStocks/);
  assert.match(atomicStock, /CREATE OR REPLACE FUNCTION private\.admin_set_product_variant_stock_batches/);
  assert.match(atomicStock, /IF v_size_count > 0 THEN[\s\S]*?private\.admin_set_product_variant_stocks/);
  assert.match(atomicStock, /IF v_custom_count > 0 THEN[\s\S]*?private\.admin_set_product_custom_variant_stocks/);
  assert.match(atomicStock, /SECURITY DEFINER[\s\S]*?auth\.uid\(\) IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid/);
});

test('order-referenced custom variants cannot be silently removed or have IDs reused', () => {
  assert.match(variantGuard, /item->>'customVariantId' = v_removed->>'id'[\s\S]*?ვარიანტი შეკვეთების ისტორიაში გამოიყენება და მისი წაშლა დაუშვებელია/);
  assert.match(variantGuard, /item->>'customVariantId' = v_variant->>'id'[\s\S]*?ამ ვარიანტის ID შეკვეთების ისტორიაში უკვე გამოიყენება/);
});

test('clothing and footwear keep their dedicated size/color inventory validation', () => {
  assert.match(categories, /isClothingProductCategory/);
  assert.match(categories, /isShoesProductCategory/);
  assert.match(admin, /validateSizeColorInventoryVariants\(normalizedSizeColorStock, availableSizes, availableColors\)/);
  assert.match(validation, /expectedPairs/);
  assert.match(validation, /seenPairs/);
  assert.match(validation, /variants\.length > 50/);
});

test('category-specific product fields remain present for phones, laptops, clothing and footwear', () => {
  assert.match(admin, /პროცესორი \(CPU\)/);
  assert.match(admin, /SSD/);
  assert.match(admin, /მეხსიერება/);
  assert.match(admin, /ზომები \(EU\)/);
  assert.match(admin, /100% ბამბა/);
});
