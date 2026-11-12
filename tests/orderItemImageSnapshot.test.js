import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeOrderItems } from '../src/utils/orderSafety.js';

test('order item normalization preserves saved image, gallery and variant snapshots', () => {
  const [item] = normalizeOrderItems([{
    id: 'product-1',
    image: 'https://cdn.example.test/product.webp',
    gallery: ['https://cdn.example.test/product-1.webp', 'https://cdn.example.test/product-2.webp'],
    selected_size: 'M',
    selected_color: 'Black',
    custom_variant_id: 'variant-1',
    custom_variant_name: 'Premium',
    gift_wrap: true,
    vip_warranty: false
  }]);

  assert.equal(item.image, 'https://cdn.example.test/product.webp');
  assert.deepEqual(item.gallery, [
    'https://cdn.example.test/product-1.webp',
    'https://cdn.example.test/product-2.webp'
  ]);
  assert.equal(item.selectedSize, 'M');
  assert.equal(item.selectedColor, 'Black');
  assert.equal(item.customVariantId, 'variant-1');
  assert.equal(item.customVariantName, 'Premium');
  assert.equal(item.gift_wrap, true);
});

test('production order snapshot migration persists image, gallery and selected product details', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261108231918_order_item_image_snapshot.sql', import.meta.url),
    'utf8'
  );
  const snapshotStart = migration.indexOf("v_line := jsonb_build_object(");
  assert.notEqual(snapshotStart, -1, 'server order snapshot builder must exist');
  const snapshot = migration.slice(snapshotStart, migration.indexOf('v_items :=', snapshotStart));

  for (const field of [
    "'image'",
    "'gallery'",
    "'selectedSize'",
    "'selectedColor'",
    "'customVariantId'",
    "'customVariantName'",
    "'gift_wrap'",
    "'vip_warranty'",
    "'purchase_cost'"
  ]) {
    assert.ok(snapshot.includes(field), `order snapshot must preserve ${field}`);
  }
});

test('admin order detail prefers historical image snapshot and falls back to catalogue image', async () => {
  const admin = await readFile(
    new URL('../src/components/AdminDashboardPro.jsx', import.meta.url),
    'utf8'
  );
  const resolverStart = admin.indexOf('const resolveOrderItemImage =');
  assert.notEqual(resolverStart, -1, 'order image resolver must exist');
  const resolverEnd = admin.indexOf('\n};', resolverStart);
  assert.notEqual(resolverEnd, -1, 'order image resolver must close');
  const resolver = admin.slice(resolverStart, resolverEnd);

  const savedImage = resolver.indexOf('const savedOrderImage');
  const savedGallery = resolver.indexOf('const savedGalleryImage');
  const catalogueFallback = resolver.indexOf('const matchingProduct');
  assert.ok(savedImage >= 0 && savedGallery > savedImage && catalogueFallback > savedGallery);
  assert.match(resolver, /matchingProduct\?\.image/);
  assert.match(resolver, /matchingProduct\?\.gallery/);
});
