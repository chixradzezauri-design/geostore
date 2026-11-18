import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const polish = readFileSync(new URL('../src/adminDashboardPolish.css', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('mobile admin greeting header stays compact instead of distributing empty vertical space', () => {
  assert.match(polish, /height:\s*auto\s*!important/);
  assert.match(polish, /min-height:\s*0\s*!important/);
  assert.match(polish, /justify-content:\s*flex-start\s*!important/);
});

test('mobile storefront actions use a compact two-column layout with full-width access status', () => {
  assert.match(polish, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(polish, /grid-column:\s*1\s*\/\s*-1/);
  assert.match(dashboard, /მონახაზის შენახვა/);
  assert.match(dashboard, /ცვლილებების გამოქვეყნება/);
});

test('admin action handlers and role guards remain in place', () => {
  assert.match(dashboard, /onSaveStorefrontDraft\(\)/);
  assert.match(dashboard, /onPublishStorefront\(\)/);
  assert.match(dashboard, /hasModulePermission\('settings'\)/);
  assert.match(dashboard, /isOwner &&/);
});
