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
