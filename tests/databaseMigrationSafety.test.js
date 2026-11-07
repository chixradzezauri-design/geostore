import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

const orderAndVariantMigration = read('supabase/migrations/20261107234500_harden_order_json_and_variant_integrity.sql');
const variantStockMigration = read('supabase/migrations/20261107230000_admin_adjust_product_variant_stock.sql');
const adminDashboard = read('src/components/AdminDashboardPro.jsx');
const orderOwnershipMigration = read('supabase/migrations/20261107200000_bind_order_ownership_to_auth_user_uuid.sql');

test('order cancellation and reactivation validate JSON array type before array length', () => {
  const typeGuards = orderAndVariantMigration.match(
    /jsonb_typeof\(coalesce\(v_order\.items, '\[\]'::jsonb\)\) is distinct from 'array' then/g
  ) || [];
  const lengthGuards = orderAndVariantMigration.match(
    /jsonb_array_length\(coalesce\(v_order\.items, '\[\]'::jsonb\)\) = 0 then/g
  ) || [];
  assert.equal(typeGuards.length, 2);
  assert.equal(lengthGuards.length, 2);
  assert.match(orderAndVariantMigration, /CREATE OR REPLACE FUNCTION private\.admin_update_order_status/);
  assert.match(orderAndVariantMigration, /CREATE OR REPLACE FUNCTION private\.admin_reactivate_cancelled_order/);
});

test('database variant trigger rejects duplicate IDs and case-insensitive duplicate names', () => {
  assert.match(orderAndVariantMigration, /GROUP BY item->>'id'\s+HAVING count\(\*\) > 1/);
  assert.match(orderAndVariantMigration, /GROUP BY lower\(trim\(coalesce\(item->>'name', ''\)\)\)\s+HAVING count\(\*\) > 1/);
  assert.match(orderAndVariantMigration, /CREATE OR REPLACE FUNCTION private\.preserve_product_variant_stock/);
});

test('variant stock RPC checks admin identity, locks the product and matches exactly one variant', () => {
  assert.match(variantStockMigration, /SECURITY INVOKER/);
  assert.match(variantStockMigration, /auth\.jwt\(\)/);
  assert.match(variantStockMigration, /auth\.uid\(\) IS DISTINCT FROM/);
  assert.match(variantStockMigration, /FOR UPDATE/);
  assert.match(variantStockMigration, /v_variant_count <> 1/);
  assert.match(variantStockMigration, /v_new_stock < 0 OR v_new_stock > 1000000/);
  assert.match(variantStockMigration, /set_config\('geostore\.variant_stock_adjustment', 'on', true\)/);
  assert.match(variantStockMigration, /CREATE OR REPLACE FUNCTION public\.admin_adjust_product_variant_stock/);
});

test('admin variant stock control calls the protected RPC and releases its request lock', () => {
  assert.match(adminDashboard, /\/rest\/v1\/rpc\/admin_adjust_product_variant_stock/);
  assert.match(adminDashboard, /quickProductUpdateLocks\.current\.add\(lockKey\)/);
  assert.match(adminDashboard, /quickProductUpdateLocks\.current\.delete\(lockKey\)/);
  assert.match(adminDashboard, /const isSavedVariant = Boolean\(editingProductId/);
});

test('customer order history returns an allowlisted item payload without internal cost/vendor fields', () => {
  const start = orderOwnershipMigration.indexOf('CREATE FUNCTION private.get_my_orders()');
  const end = orderOwnershipMigration.indexOf('REVOKE ALL ON FUNCTION private.get_my_orders()', start);
  assert.ok(start >= 0 && end > start);
  const historyFunction = orderOwnershipMigration.slice(start, end);
  assert.match(historyFunction, /WHERE o\.user_id = auth\.uid\(\)/);
  for (const allowedField of ['id', 'name', 'price', 'quantity', 'selectedSize', 'selectedColor', 'customVariantId', 'customVariantName', 'addon_total', 'gift_wrap', 'vip_warranty', 'gift_message']) {
    assert.ok(historyFunction.includes(`'${allowedField}'`), `missing allowed field: ${allowedField}`);
  }
  for (const privateField of ['purchase_cost', 'vendor', 'category']) {
    assert.ok(!historyFunction.includes(`'${privateField}'`), `internal field leaked: ${privateField}`);
  }
});
