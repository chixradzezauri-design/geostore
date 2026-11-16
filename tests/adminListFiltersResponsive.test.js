import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/adminDashboardSections.css', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('order status filters remain horizontally scrollable and touch-friendly', () => {
  assert.match(admin, /className="admin-order-status-filters[^"]*overflow-x-auto/);
  assert.match(css, /\.admin-order-status-filters \{[\s\S]*?max-width: 100%/);
  assert.match(css, /\.admin-order-status-filters > button \{[\s\S]*?flex: 0 0 auto/);
  assert.match(css, /scroll-snap-type: x proximity/);
});

test('product category and search filters fit narrow screens without forcing horizontal overflow', () => {
  assert.match(admin, /className="admin-product-list-filters[^"]*flex-col sm:flex-row/);
  assert.match(css, /\.admin-product-list-filters \{[\s\S]*?min-width: 0/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.admin-product-search > input \{[\s\S]*?min-width: 0/);
});

test('orders and products list containers preserve available viewport width', () => {
  assert.match(css, /\.admin-orders-list,[\s\S]*?\.admin-products-list \{[\s\S]*?width: 100%/);
});
