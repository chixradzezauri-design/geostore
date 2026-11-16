import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/adminDashboard.css', import.meta.url), 'utf8');
const entry = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('admin visual layer loads after the existing global stylesheet', () => {
  assert.ok(entry.indexOf("import './index.css'") >= 0);
  assert.ok(entry.indexOf("import './adminDashboard.css'") > entry.indexOf("import './index.css'"));
});

test('all existing admin sections and tab selection remain unchanged', () => {
  const ids = [...admin.matchAll(/\{ id: '([^']+)', label:/g)].map(match => match[1]);
  assert.deepEqual(ids, [
    'analytics', 'calculator', 'expenses', 'ai_analyst', 'staff', 'orders',
    'products', 'support', 'messages', 'discounts', 'logs', 'broadcasts',
    'banners', 'categories', 'coupons', 'vendors', 'users', 'settings'
  ]);
  assert.match(admin, /onClick=\{\(\) => setAdminTab\(tab\.id\)\}/);
});

test('desktop admin navigation stays visible while the long menu scrolls internally', () => {
  assert.match(css, /position:\s*sticky/);
  assert.match(css, /max-height:\s*calc\(100dvh - 24px\)/);
  assert.match(css, /overscroll-behavior:\s*contain/);
});

test('tablet and mobile admin navigation remains horizontally touch-scrollable', () => {
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?overflow-x:\s*auto[\s\S]*?scroll-snap-type:\s*x proximity/);
  assert.match(css, /-webkit-overflow-scrolling:\s*touch/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media \(max-width: 380px\)/);
});

test('admin palette and keyboard focus treatment remain scoped to the admin workspace', () => {
  assert.match(css, /--admin-surface:/);
  assert.match(css, /--admin-accent:/);
  assert.match(css, /:focus-visible[\s\S]*?outline:\s*3px solid var\(--admin-focus\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
