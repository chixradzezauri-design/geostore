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
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.admin-category-form > div \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.admin-flash-sale-submit \{[\s\S]*?width: 100%/);
  assert.match(css, /\.admin-banner-card,[\s\S]*?\.admin-coupon-card \{[\s\S]*?padding: 14px !important/);
});

test('long campaign and catalog labels wrap without breaking action controls', () => {
  assert.match(css, /\.admin-banner-card h4,[\s\S]*?overflow-wrap: anywhere/);
  assert.match(css, /\.admin-coupon-card button \{[\s\S]*?flex: 0 0 auto/);
  assert.match(css, /@media \(max-width: 380px\)[\s\S]*?\.admin-banner-card \{[\s\S]*?flex-wrap: wrap/);
});
