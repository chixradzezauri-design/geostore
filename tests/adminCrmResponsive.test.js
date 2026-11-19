import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/adminDashboardSections.css', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('CRM customer actions remain visible and touch-friendly on mobile', () => {
  assert.match(admin, /admin-crm-user-actions/);
  assert.match(admin, /admin-crm-user-card/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.admin-crm-user-actions \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.admin-crm-user-actions > button \{[\s\S]*?min-height: 44px/);
});

test('CRM search and customer details do not overflow narrow viewports', () => {
  assert.match(admin, /admin-crm-search/);
  assert.match(css, /\.admin-crm-user-card p \{[\s\S]*?overflow-wrap: anywhere/);
  assert.match(css, /\.admin-crm-search \{[\s\S]*?width: 100%/);
  assert.match(css, /@media \(max-width: 380px\)[\s\S]*?\.admin-crm-user-actions \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
});

test('CRM labels distinguish synchronized Auth customers from preserved local records', () => {
  assert.match(admin, /სინქრონიზებული სია/);
  assert.match(admin, /ძველი ლოკალური ჩანაწერები შენარჩუნებულია/);
  assert.match(admin, /Auth ანგარიშის უფლებებს/);
});
