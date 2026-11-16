import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261108231918_order_item_image_snapshot.sql', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const cleanup = await readFile(new URL('../src/utils/productImageCleanup.js', import.meta.url), 'utf8');
const orderSafety = await readFile(new URL('../src/utils/orderSafety.js', import.meta.url), 'utf8');

test('checkout stores a historical image and gallery snapshot on each order item', () => {
  assert.match(migration, /select id, name, price_gel,[^\n]*image, gallery, variants into v_product/i);
  assert.match(migration, /'image', coalesce\(nullif\(v_product\.image, ''\), nullif\(v_product\.gallery->>0, ''\)\)/i);
  assert.match(migration, /'gallery', coalesce\(v_product\.gallery, '\[\]'::jsonb\)/i);
  assert.match(migration, /insert into public\.orders[\s\S]*?user_email, customer_email, items,[\s\S]*?v_items, v_total/i);
});

test('admin order details prefer the saved historical image before catalogue fallback', () => {
  assert.match(admin, /const resolveOrderItemImage = \(item, products\) =>/);
  assert.match(admin, /const savedOrderImage = String\(item\?\.image \|\| item\?\.image_url \|\| item\?\.imageUrl \|\| ''\)\.trim\(\)/);
  assert.match(admin, /const savedGalleryImage = Array\.isArray\(item\?\.gallery\)/);
  assert.match(admin, /if \(savedGalleryImage\) return String\(savedGalleryImage\)\.trim\(\)/);
  assert.match(admin, /resolveOrderItemImage\(item, products\)/);
});

test('image cleanup retains files referenced by historical orders and protects legacy fallbacks', () => {
  assert.match(cleanup, /export const collectReferencedOrderImageUrls = \(orders\) =>/);
  assert.match(cleanup, /item\?\.image,[\s\S]*?item\?\.image_url,[\s\S]*?item\?\.imageUrl,[\s\S]*?item\?\.gallery/);
  assert.match(cleanup, /export const collectOrderProductIdsWithoutImageSnapshot = \(orders\) =>/);
  assert.match(cleanup, /if \(!hasImage\) referenced\.add\(productId\)/);
  assert.match(admin, /collectOrderProductIdsWithoutImageSnapshot\(orderRows\)/);
});

test('order normalization preserves historical image and gallery fields', () => {
  assert.match(orderSafety, /image: item\.image \?\? item\.image_url \?\? item\.imageUrl \?\? ''/);
  assert.match(orderSafety, /gallery: Array\.isArray\(item\.gallery\) \? item\.gallery : \[\]/);
});
