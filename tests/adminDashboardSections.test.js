import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/adminDashboardSections.css', import.meta.url), 'utf8');
const entry = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('admin content refinement loads after both existing style layers', () => {
  assert.ok(entry.indexOf("import './index.css'") >= 0);
  assert.ok(entry.indexOf("import './adminDashboard.css'") > entry.indexOf("import './index.css'"));
  assert.ok(entry.indexOf("import './adminDashboardSections.css'") > entry.indexOf("import './adminDashboard.css'"));
});

test('content styles target existing sections and all original tabs remain available', () => {
  for (const selector of [
    '.admin-analytics-card', '.admin-profit-calculator', '.admin-ai-analyst',
    '.admin-staff-panel', '.admin-orders-panel', '.admin-products-panel',
    '.admin-support-ticket', '.admin-crm-panel', '.admin-expense-row'
  ]) assert.ok(css.includes(selector), 'missing style target: ' + selector);

  const ids = [...admin.matchAll(/\{ id: '([^']+)', label:/g)].map(match => match[1]);
  assert.deepEqual(ids, [
    'command', 'analytics', 'calculator', 'expenses', 'ai_analyst', 'staff', 'orders',
    'products', 'inventory', 'support', 'messages', 'discounts', 'logs', 'broadcasts',
    'banners', 'categories', 'coupons', 'vendors', 'users', 'settings'
  ]);
});

test('admin form controls retain touch-sized dimensions and narrow-screen safeguards', () => {
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /min-width:\s*0/);
  assert.match(css, /max-width:\s*100%/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(max-width: 380px\)/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});
