import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

const orderAndVariantMigration = read('supabase/migrations/20261107234500_harden_order_json_and_variant_integrity.sql');
const variantIntegrationMigration = read('supabase/migrations/20261107170000_integrate_custom_product_variants.sql');
const variantStockMigration = read('supabase/migrations/20261107230000_admin_adjust_product_variant_stock.sql');
const adminDashboard = read('src/components/AdminDashboardPro.jsx');
const storeViewSource = read('src/components/StoreView.jsx');
const orderOwnershipMigration = read('supabase/migrations/20261107200000_bind_order_ownership_to_auth_user_uuid.sql');
const orderNoteGrantMigration = read('supabase/migrations/20261107241000_revoke_direct_order_note_column_update.sql');

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
  assert.match(orderAndVariantMigration, /jsonb_array_length\(coalesce\(NEW\.variants, '\[\]'::jsonb\)\) > 50/);
  assert.match(orderAndVariantMigration, /length\(trim\(coalesce\(v_variant->>'id', ''\)\)\) > 80/);
  assert.match(orderAndVariantMigration, /length\(trim\(coalesce\(v_variant->>'name', ''\)\)\) > 80/);
  assert.match(orderAndVariantMigration, /v_variant->>'priceGEL'\)::numeric > 1000000000/);
  assert.match(orderAndVariantMigration, /v_variant->>'stock'\)::integer > 1000000/);
});

test('variant stock RPC checks admin identity, locks the product and matches exactly one variant', () => {
  assert.match(variantStockMigration, /SECURITY INVOKER/);
  assert.match(variantStockMigration, /auth\.jwt\(\)/);
  assert.match(variantStockMigration, /auth\.uid\(\) IS DISTINCT FROM/);
  assert.match(variantStockMigration, /FOR UPDATE/);
  assert.match(variantStockMigration, /v_variant_count <> 1/);
  assert.match(variantStockMigration, /v_new_stock < 0 OR v_new_stock > 1000000/);
  assert.match(variantStockMigration, /length\(trim\(p_product_id\)\) > 64/);
  assert.match(variantStockMigration, /length\(trim\(p_variant_id\)\) > 80/);
  assert.match(variantStockMigration, /v_current_stock > 1000000/);
  assert.match(variantStockMigration, /set_config\('geostore\.variant_stock_adjustment', 'on', true\)/);
  assert.match(variantStockMigration, /CREATE OR REPLACE FUNCTION public\.admin_adjust_product_variant_stock/);
});

test('custom variant checkout requires one exact catalogue match and stable idempotency ordering', () => {
  assert.match(variantIntegrationMigration, /v_variant_count <> 1/);
  assert.match(variantIntegrationMigration, /grouped\.custom_variant_id nulls first/);
  assert.match(variantIntegrationMigration, /item->>'custom_variant_id', item->>'gift_wrap'/);
  assert.match(variantIntegrationMigration, /z_validate_product_variant_identity/);
});

test('variant stock RPC returns only granted inventory columns and keeps both wrappers invoker-only', () => {
  assert.match(variantStockMigration, /RETURNS jsonb/);
  assert.match(variantStockMigration, /SELECT id, variants INTO v_product_id, v_variants/);
  assert.match(variantStockMigration, /RETURNING p\.id, p\.variants INTO v_product_id, v_variants/);
  assert.match(variantStockMigration, /RETURN jsonb_build_object\('id', v_product_id, 'variants', v_variants\)/);
  assert.match(variantStockMigration, /LANGUAGE plpgsql\s+SECURITY INVOKER/);
  assert.match(variantStockMigration, /LANGUAGE sql\s+SECURITY INVOKER/);
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

test('public checkout wrapper is rebound after private UUID-ownership function rename', () => {
  const renameAt = orderOwnershipMigration.indexOf('ALTER FUNCTION private.create_order_with_stock(jsonb)');
  const wrapperAt = orderOwnershipMigration.indexOf('CREATE OR REPLACE FUNCTION public.create_order_with_stock(p_order jsonb)');
  const revokeUncheckedAt = orderOwnershipMigration.indexOf('REVOKE ALL ON FUNCTION private.create_order_with_stock_unchecked(jsonb)');
  assert.ok(renameAt >= 0 && wrapperAt > renameAt && revokeUncheckedAt > wrapperAt);
  const wrapperEnd = orderOwnershipMigration.indexOf('REVOKE ALL ON FUNCTION public.create_order_with_stock(jsonb)', wrapperAt);
  const publicWrapper = orderOwnershipMigration.slice(wrapperAt, wrapperEnd);
  assert.match(publicWrapper, /RETURN private\.create_order_with_stock\(p_order\);/);
  assert.doesNotMatch(publicWrapper, /SECURITY DEFINER/);
  assert.match(orderOwnershipMigration, /REVOKE ALL ON FUNCTION private\.create_order_with_stock_unchecked\(jsonb\) FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(orderOwnershipMigration, /GRANT EXECUTE ON FUNCTION private\.create_order_with_stock\(jsonb\) TO anon, authenticated, service_role/);
  assert.match(orderOwnershipMigration, /GRANT EXECUTE ON FUNCTION public\.create_order_with_stock\(jsonb\) TO anon, authenticated, service_role/);
});

test('order ownership migration contains no orphaned duplicate checkout SQL tail', () => {
  assert.equal((orderOwnershipMigration.match(/CREATE OR REPLACE FUNCTION private\.get_my_order_notifications\(\)/g) || []).length, 1);
  assert.equal((orderOwnershipMigration.match(/CREATE OR REPLACE FUNCTION private\.mark_my_order_notifications_read\(\)/g) || []).length, 1);
  assert.equal((orderOwnershipMigration.match(/CREATE OR REPLACE FUNCTION public\.create_order_with_stock\(p_order jsonb\)/g) || []).length, 1);
  assert.match(orderOwnershipMigration, /GRANT EXECUTE ON FUNCTION private\.mark_my_order_notifications_read\(\) TO authenticated;\s*$/);
  assert.doesNotMatch(orderOwnershipMigration, /^\s+THEN\s*\n\s+RAISE EXCEPTION 'შეკვეთის იდენტიფიკატორი არასწორია\.'/m);
});

test('direct admin-note column writes are revoked in favor of the validated RPC', () => {
  assert.match(orderNoteGrantMigration, /REVOKE UPDATE \(admin_note\) ON TABLE public\.orders FROM authenticated/);
  assert.match(adminDashboard, /\/rest\/v1\/rpc\/admin_save_order_note/);
});

test('storefront defaults to ascending available price and never sorts the parent product array in place', () => {
  assert.match(storeViewSource, /const \[sortBy, setSortBy\] = useState\('price-asc'\)/);
  assert.match(storeViewSource, /let result = \[\.\.\.activeProducts\]/);
});
