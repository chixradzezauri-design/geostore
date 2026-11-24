import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('product image cleanup paginates the complete catalogue before checking references', () => {
  assert.match(admin, /const productRows = \[\];[\s\S]*?const pageSize = 1000;[\s\S]*?for \(let offset = 0; offset < 100000; offset \+= pageSize\)/);
  assert.match(admin, /products\?select=id,image,gallery&order=id\.asc/);
  assert.match(admin, /productHeaders\.Range = \x60\$\{offset\}-\$\{offset \+ pageSize - 1\}\x60/);
  assert.match(admin, /productRows\.push\(\.\.\.page\)/);
});

test('partial catalogue or order scans fail closed and never authorize storage deletion', () => {
  assert.match(admin, /პროდუქტების სრული სიის შემოწმება ვერ დასრულდა; ფოტოს წაშლა შეჩერდა/);
  assert.match(admin, /rest\/v1\/rpc\/admin_order_image_refs_page/);
  assert.match(admin, /body: JSON\.stringify\(\{ p_offset: offset, p_limit: pageSize \}\)/);
  assert.doesNotMatch(admin, /rest\/v1\/orders\?select=items/);
  assert.match(admin, /შეკვეთების სრული სიის შემოწმება ვერ დასრულდა; ფოტოს წაშლა შეჩერდა/);
  assert.match(admin, /if \(!safePaths\.length\) return true;[\s\S]*?method: 'DELETE'/);
  assert.match(admin, /catch \(error\) \{[\s\S]*?GEOSTORE product image cleanup failed:[\s\S]*?return false;/);
});

test('historical order image snapshots and legacy product fallbacks are included in deletion protection', () => {
  assert.match(admin, /collectReferencedOrderImageUrls\(orderRows\)/);
  assert.match(admin, /collectOrderProductIdsWithoutImageSnapshot\(orderRows\)/);
  assert.match(admin, /const hasLegacyOrderFallback = legacyOrderProductIds\.has\(String\(productId\)\)/);
  assert.match(admin, /const safePaths = hasLegacyOrderFallback \? \[\] : paths\.filter/);
});
