import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('inventory tab uses configured title rather than a literal template placeholder', () => {
  assert.equal(dashboard.includes("label: '📚 {adminVisualDesign.content.inventoryTitle}'"), false);
  assert.equal(dashboard.includes('label: '+String.fromCharCode(96)+'📚 ${adminVisualDesign.content.inventoryTitle}'+String.fromCharCode(96)), true);
});

test('command center visibility condition avoids redundant nested checks', () => {
  assert.equal(dashboard.includes("(visibleAdminTab === 'command' || (visibleAdminTab === 'command' || adminContentTab === 'command'))"), false);
  assert.equal(dashboard.includes("(visibleAdminTab === 'command' || adminContentTab === 'command')"), true);
});

test('admin navigation keeps long Georgian labels readable and focus visible', () => {
  assert.match(dashboard, /className="flex min-w-0 items-center gap-2\.5"/);
  assert.match(dashboard, /className="min-w-0 break-words">\{tab\.label\}/);
  assert.match(dashboard, /focus-visible:outline-emerald-300/);
  assert.match(dashboard, /shrink-0 px-2 py-0\.5 rounded-full/);
});

test('compact mobile admin header preserves draft save publish and access status', () => {
  assert.match(dashboard, /data-admin-visual-header="true" className="flex min-w-0 flex-col lg:flex-row/);
  assert.match(dashboard, /grid w-full min-w-0 grid-cols-2 items-stretch gap-2 lg:flex/);
  assert.match(dashboard, /onSaveStorefrontDraft\(\)/);
  assert.match(dashboard, /onPublishStorefront\(\)/);
  assert.match(dashboard, /col-span-2 flex min-w-0 items-center justify-center/);
  assert.match(dashboard, /სრული სისტემური წვდომა/);
});

test('command center shows four compact KPI cards in two columns on mobile', () => {
  assert.match(dashboard, /admin-command-kpis grid grid-cols-2 2xl:grid-cols-4 gap-2 sm:gap-3/);
  assert.match(dashboard, /admin-command-hero rounded-2xl border border-emerald-400\/25 p-3 sm:p-5/);
  assert.match(dashboard, /admin-command-kpi group min-w-0 text-left rounded-xl/);
  for (const section of ['orders', 'support', 'replenishment', 'discounts']) {
    assert.match(dashboard, new RegExp("onClick=\\{\\(\\) => setAdminTab\\('" + section + "'\\)\\}"));
  }
});

test('command center detail panels are compact and long statuses can wrap on mobile', () => {
  assert.match(dashboard, /admin-command-panels grid grid-cols-1 xl:grid-cols-2 gap-2\.5 sm:gap-4/);
  assert.match(dashboard, /admin-command-panel min-w-0 rounded-2xl border/);
  assert.match(dashboard, /max-w-\[45%\] shrink-0 break-words rounded-full/);
  assert.match(dashboard, /max-w-\[45%\] shrink-0 break-words text-right/);
  for (const section of ['orders', 'support', 'replenishment']) {
    assert.match(dashboard, new RegExp("setAdminTab\\('" + section + "'\\)"));
  }
});

test('replenishment section visibility has no duplicated tab condition', () => {
  assert.equal(dashboard.includes("(visibleAdminTab === 'replenishment' || (visibleAdminTab === 'replenishment' || adminContentTab === 'replenishment'))"), false);
  assert.equal(dashboard.includes("(visibleAdminTab === 'replenishment' || adminContentTab === 'replenishment')"), true);
});

test('inventory history resets stale records and pagination on a fresh filter request', () => {
  const start = dashboard.indexOf('const fetchInventoryMovements = async');
  const end = dashboard.indexOf('useEffect(() => {', start);
  assert.ok(start >= 0 && end > start);
  const loader = dashboard.slice(start, end);
  assert.match(loader, /if \(!append\) \{\s*\/\/ Never show rows or pagination from a previous product after a filter change\./);
  assert.match(loader, /setInventoryMovementRows\(\[\]\);/);
  assert.match(loader, /setInventoryMovementCursor\(null\);/);
  assert.match(loader, /setInventoryMovementHasMore\(false\);/);
  assert.match(loader, /requestId !== inventoryMovementRequestRef\.current/);
});

test('inventory pagination refuses missing and repeated cursors', () => {
  const start = dashboard.indexOf('const fetchInventoryMovements = async');
  const end = dashboard.indexOf('useEffect(() => {', start);
  const loader = dashboard.slice(start, end);
  assert.match(loader, /const nextCursor = result\?\.next_cursor \?\? null/);
  assert.match(loader, /result\?\.has_more === true && nextCursor !== null/);
  assert.match(loader, /String\(nextCursor\) !== String\(beforeId \?\? ''\)/);
  assert.match(loader, /setInventoryMovementHasMore\(canLoadNextPage\)/);
});
