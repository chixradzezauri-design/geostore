import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('order management uses the same dark surface system as the admin dashboard', () => {
  const stage45 = css.slice(css.lastIndexOf('GEOSTORE ADMIN VISUAL AUDIT — STAGE 45'));
  assert.match(stage45, /\.admin-orders-panel\s*\{[^}]*background:\s*#0d192a\s*!important;/s);
  assert.match(stage45, /\.admin-order-card\s*\{[^}]*background:\s*#142238\s*!important;/s);
  assert.match(stage45, /\.admin-order-detail-modal\s*\{[^}]*background:\s*#0d192a\s*!important;/s);
  assert.match(stage45, /\.admin-order-item\s*\{[^}]*background:\s*#101e31\s*!important;/s);
  assert.match(stage45, /@media \(max-width: 640px\)[\s\S]*?\.admin-order-detail-modal/);
});

test('order search, filters, status actions, pagination, export and details remain wired', () => {
  assert.match(admin, /onClick=\{handleExportOrders\}/);
  assert.match(admin, /setOrderSearchQuery\(e\.target\.value\)/);
  assert.match(admin, /setOrderStatusFilter\(st\)/);
  assert.match(admin, /handleUpdateOrderStatus\(o\.id,/);
  assert.match(admin, /setCurrentOrderPage\(page\)/);
  assert.match(admin, /setSelectedOrderForModal\(o\);/);
  assert.match(admin, /handleSaveOrderAdminNote\(selectedOrderForModal\.id\)/);
});

test('Stage 45 changes remain CSS-only and do not alter order component source', async () => {
  const stage45 = css.slice(css.lastIndexOf('GEOSTORE ADMIN VISUAL AUDIT — STAGE 45'));
  assert.ok(stage45.length > 7000);
  assert.ok(admin.includes('admin-order-detail-modal'));
  assert.ok(admin.includes('normalizeOrderItems(selectedOrderForModal.items)'));
});
