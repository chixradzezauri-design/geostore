import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/adminDashboardSections.css', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('campaign and catalog admin sections retain their existing forms and lists', () => {
  for (const name of ['admin-flash-sale-form', 'admin-banner-form', 'admin-banner-list', 'admin-category-form', 'admin-category-tree', 'admin-coupon-form', 'admin-coupon-list']) {
    assert.ok(admin.includes(name), `missing existing section class: ${name}`);
  }
});

test('campaign, banner, category and coupon controls fit mobile layouts', () => {
  assert.ok(css.includes('.admin-category-form > div'));
  assert.ok(css.includes('grid-template-columns: minmax(0, 1fr)'));
  assert.ok(css.includes('.admin-flash-sale-submit'));
  assert.ok(css.includes('.admin-banner-card'));
  assert.ok(css.includes('.admin-coupon-card'));
  assert.ok(css.includes('padding: 14px !important'));
});

test('long campaign and catalog labels wrap without breaking action controls', () => {
  assert.ok(css.includes('.admin-banner-card h4'));
  assert.ok(css.includes('.admin-coupon-card button'));
  assert.ok(css.includes('overflow-wrap: anywhere'));
  assert.ok(css.includes('flex: 0 0 auto'));
  assert.ok(css.includes('flex-wrap: wrap'));
});
