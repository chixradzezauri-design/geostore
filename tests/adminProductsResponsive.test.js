import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/adminDashboardSections.css', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('product editor and inventory rows retain their established structure', () => {
  assert.match(admin, /admin-product-form/);
  assert.match(admin, /admin-product-attributes/);
  assert.match(admin, /admin-product-gallery/);
  assert.match(admin, /admin-product-row/);
  assert.match(admin, /admin-product-controls/);
});

test('product inventory controls adapt to mobile and narrow screens', () => {
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.admin-product-controls \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.admin-product-controls > button \{[\s\S]*?min-height: 44px/);
  assert.match(css, /@media \(max-width: 380px\)[\s\S]*?\.admin-product-controls \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
});

test('product names, SKU labels and form sections cannot force horizontal overflow', () => {
  assert.match(css, /\.admin-product-identity h4,[\s\S]*?overflow-wrap: anywhere/);
  assert.match(css, /\.admin-product-form,[\s\S]*?min-width: 0/);
  assert.match(css, /\.admin-product-gallery/);
});
test('inventory replenishment cards compact to two columns on mobile without clipping fields', () => {
  assert.match(admin, /className="admin-replenishment-row/);
  assert.match(admin, /className="admin-replenishment-metric/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.admin-replenishment-row \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.admin-replenishment-product,[\s\S]*?grid-column: 1 \/ -1/);
  assert.match(css, /\.admin-replenishment-metric input[\s\S]*?font-size: 16px/);
});

test('size-color and custom variant stock rows wrap safely on narrow screens', () => {
  assert.match(admin, /admin-size-color-stock-row/);
  assert.match(admin, /admin-custom-variant-row/);
  assert.match(css, /\.admin-size-color-stock-identity,[\s\S]*?overflow-wrap: anywhere/);
  assert.match(css, /\.admin-size-color-stock-control input,[\s\S]*?min-height: 44px/);
});
