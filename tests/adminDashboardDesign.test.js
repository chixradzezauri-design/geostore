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

test('all admin sections including Command Center and inventory history remain available', () => {
  const ids = [...admin.matchAll(/\{ id: '([^']+)', label:/g)].map(match => match[1]);
  assert.deepEqual(ids, [
    'command', 'analytics', 'calculator', 'expenses', 'ai_analyst', 'staff', 'orders',
    'products', 'inventory', 'replenishment', 'support', 'messages', 'discounts', 'logs', 'broadcasts',
    'banners', 'categories', 'coupons', 'vendors', 'users', 'settings'
  ]);
});

test('inventory history uses the protected RPC and cursor pagination', () => {
  assert.match(admin, /admin_list_inventory_movements/);
  assert.match(admin, /p_before_id:\s*beforeId/);
  assert.match(admin, /p_limit:\s*50/);
  assert.match(admin, /inventoryMovementHasMore/);
  assert.match(admin, /inventoryMovementRequestRef/);
});

test('responsive admin navigation safeguards remain in place', () => {
  assert.match(css, /position:\s*sticky/);
  assert.match(css, /max-height:\s*calc\(100dvh - 24px\)/);
  assert.match(css, /overscroll-behavior:\s*contain/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?overflow-x:\s*auto/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('Command Center remains a read-only overview using existing operational data', () => {
  assert.match(admin, /useState\('command'\)/);
  assert.match(admin, /commandCenterOverdueTickets/);
  assert.match(admin, /commandCenterLowStockGroups/);
  assert.match(admin, /flashSaleAdminSummary\.expiringCount/);
});
