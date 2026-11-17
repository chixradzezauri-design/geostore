import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117140000_staff_products_permission.sql', import.meta.url), 'utf8');
const foundation = await readFile(new URL('../supabase/migrations/20261117100000_admin_staff_auth_foundation.sql', import.meta.url), 'utf8');

test('product RLS is based on the active products module permission', () => {
  assert.match(migration, /Staff with products permission can insert products/);
  assert.match(migration, /Staff with products permission can read all products/);
  assert.match(migration, /Staff with products permission can update products/);
  assert.match(migration, /public\.has_staff_permission\('products'\)/);
  assert.match(foundation, /staff\.is_active IS TRUE/);
});

test('product and inventory RPCs are converted to server-side products authorization', () => {
  for (const name of [
    'admin_save_product',
    'admin_update_product_with_stock',
    'admin_delete_product',
    'admin_set_product_custom_variant_stocks',
    'admin_set_product_variant_stock_batches',
    'admin_set_product_variant_stocks',
    'list_inventory_movements',
    'list_inventory_replenishment_settings',
    'save_inventory_replenishment_setting'
  ]) assert.ok(migration.includes(name), name);
  assert.ok(migration.includes("IF NOT public.has_staff_permission(''products'') THEN"));
});

test('purchase cost is protected by the separate expenses permission', () => {
  assert.match(migration, /REVOKE INSERT \(purchase_cost\), UPDATE \(purchase_cost\), SELECT \(purchase_cost\)/);
  assert.ok(migration.includes("public.has_staff_permission(''expenses'')"));
  assert.ok(migration.includes("p_product := p_product - ''purchase_cost''"));
  assert.ok(migration.includes("v_product_result := v_product_result - ''purchase_cost''"));
  assert.ok(migration.includes("jsonb_set(p_product, ''{purchase_cost}'', ''null''::jsonb, true)"));
});

test('full product-cost listing is not granted by products permission alone', () => {
  assert.match(migration, /admin_list_products\(\)/);
  assert.ok(migration.includes("IF NOT public.has_staff_permission(''expenses'') THEN"));
  assert.ok(migration.includes("EXECUTE regexp_replace(v_definition, ';[[:space:]]*$', '')"));
});

test('product permission changes preserve inventory transaction markers', () => {
  assert.match(migration, /geostore\.inventory_reason/);
  assert.match(migration, /geostore\.variant_stock_adjustment/);
  assert.match(migration, /admin_set_product_variant_stock_batches/);
});
