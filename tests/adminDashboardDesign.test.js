import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const css = await readFile(new URL('../src/adminDashboard.css', import.meta.url), 'utf8');
const entry = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const polish = await readFile(new URL('../src/adminDashboardPolish.css', import.meta.url), 'utf8');
const globalCss = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');

test('admin visual layer loads after the existing global stylesheet', () => {
  assert.ok(entry.indexOf("import './index.css'") >= 0);
  assert.ok(entry.indexOf("import './adminDashboard.css'") > entry.indexOf("import './index.css'"));
});

test('all admin sections including Command Center and inventory history remain available', () => {
  const ids = [...admin.matchAll(/\{ id: '([^']+)', label:/g)].map(match => match[1]);
  assert.deepEqual(ids, [
    'command', 'analytics', 'calculator', 'expenses', 'ai_analyst', 'staff', 'orders',
    'products', 'inventory', 'replenishment', 'support', 'messages', 'discounts', 'logs', 'broadcasts',
    'banners', 'categories', 'visual_editor', 'coupons', 'vendors', 'users', 'settings'
  ]);
});

test('inventory history uses the protected RPC and cursor pagination', () => {
  assert.match(admin, /admin_list_inventory_movements/);
  assert.match(admin, /p_before_id:\s*beforeId/);
  assert.match(admin, /p_limit:\s*50/);
  assert.match(admin, /inventoryMovementHasMore/);
  assert.match(admin, /inventoryMovementRequestRef/);
});

test('replenishment planner uses protected settings RPCs and does not mutate stock', () => {
  assert.match(admin, /admin_list_inventory_replenishment_settings/);
  assert.match(admin, /admin_save_inventory_replenishment_setting/);
  assert.match(admin, /buildInventoryReplenishmentPlan/);
  assert.match(admin, /visibleAdminTab === 'replenishment'/);
  assert.match(admin, /სისტემა მარაგს ავტომატურად არ ცვლის/);
});

test('inventory replenishment planner paginates long result lists without changing stock data', () => {
  assert.match(admin, /const REPLENISHMENT_PER_PAGE = 10/);
  assert.match(admin, /const totalReplenishmentPages = Math\.max\(1, Math\.ceil\(filteredReplenishmentPositions\.length \/ REPLENISHMENT_PER_PAGE\)\)/);
  assert.match(admin, /paginatedReplenishmentPositions = filteredReplenishmentPositions\.slice/);
  assert.match(admin, /paginatedReplenishmentPositions\.map\(position =>/);
  assert.match(admin, /setReplenishmentPage\(1\)/);
  assert.match(admin, /aria-label="მარაგის შევსების გეგმის გვერდები"/);
  assert.match(admin, /replenishmentPaginationItems\.map/);
  assert.match(admin, /სისტემა მარაგს ავტომატურად არ ცვლის/);
});

test('responsive admin navigation safeguards remain in place', () => {
  assert.match(css, /position:\s*sticky/);
  assert.match(css, /max-height:\s*calc\(100dvh - 24px\)/);
  assert.match(css, /overscroll-behavior:\s*contain/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?overflow-x:\s*auto/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /min-width:\s*0 !important/);
  assert.match(css, /white-space:\s*normal !important/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /flex:\s*0 0 auto/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('Command Center remains a read-only overview using existing operational data', () => {
  assert.match(admin, /useState\('command'\)/);
  assert.match(admin, /commandCenterOverdueTickets/);
  assert.match(admin, /commandCenterLowStockGroups/);
  assert.match(admin, /flashSaleAdminSummary\.expiringCount/);
});
test('admin activity history displays paginated results and requests the supported latest 200 rows', () => {
  assert.match(admin, /ACTIVITY_LOGS_PER_PAGE = 20/);
  assert.match(admin, /p_limit: 200/);
  assert.match(admin, /paginatedActivityLogs = activityLogs\.slice/);
  assert.match(admin, /paginatedActivityLogs\.map\(log =>/);
  assert.match(admin, /aria-label="აქტივობების ისტორიის გვერდები"/);
  assert.match(admin, /setActivityLogsPage\(1\)/);
});

 
test('legacy light paper surfaces cannot override the dark expenses, vendor and settings admin sections', () => {
  assert.match(globalCss, /\.admin-dashboard-pro :is\([\s\S]*?\.admin-vendors-panel[\s\S]*?background: var\(--gs-admin-paper\)/);
  assert.match(globalCss, /\.admin-dashboard-pro \.admin-settings-panel/);
  assert.match(polish, /STAGE 115\/116 — restore dark admin finance, vendor and settings surfaces/);
  assert.match(polish, /\.admin-dashboard-pro\.admin-dashboard-shell :is\([\s\S]*?\.admin-expenses,[\s\S]*?\.admin-vendors-panel,[\s\S]*?\.admin-settings-panel[\s\S]*?background: transparent !important/);
  assert.match(polish, /color: var\(--admin-text\) !important/);
  assert.ok(entry.indexOf("import './adminDashboardPolish.css'") > entry.indexOf("import './index.css'"));
});
