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

test('inventory history announces loading and provides a retry path for failed pages', () => {
  assert.match(dashboard, /aria-labelledby="admin-inventory-title" aria-busy=\{inventoryMovementLoading\}/);
  assert.match(dashboard, /role="status" className="rounded-2xl border border-white\/5/);
  assert.match(dashboard, /inventoryMovementRows\.length > 0 \? 'სცადეთ „მეტი ჩანაწერის ჩატვირთვა“ ხელახლა\.'/);
  assert.match(dashboard, /inventoryMovementLoading \? 'იტვირთება…' : 'განახლება'/);
});

test('replenishment settings enforce displayed limits before sending changes', () => {
  const start = dashboard.indexOf('const saveInventoryReplenishmentSetting = async');
  const end = dashboard.indexOf('const fetchInventoryMovements = async', start);
  const save = dashboard.slice(start, end);
  assert.match(save, /threshold > 100000/);
  assert.match(save, /target <= threshold \|\| target > 1000000/);
  assert.match(save, /Number\.isSafeInteger\(threshold\)/);
});

test('replenishment mobile cards use two columns and accessible loading feedback', () => {
  assert.match(dashboard, /admin-replenishment-row grid min-w-0 grid-cols-2/);
  assert.match(dashboard, /admin-replenishment-product col-span-2 min-w-0 xl:col-span-1/);
  assert.match(dashboard, /admin-replenishment-save col-span-2 flex flex-col gap-1 xl:col-span-1/);
  assert.match(dashboard, /aria-labelledby="admin-replenishment-title" aria-busy=\{replenishmentLoading\}/);
  assert.match(dashboard, /replenishmentLoading && <p role="status"/);
});

test('replenishment save blocks duplicate submissions and preserves drafts on failed refresh', () => {
  const start = dashboard.indexOf('const saveInventoryReplenishmentSetting = async');
  const end = dashboard.indexOf('const fetchInventoryMovements = async', start);
  const save = dashboard.slice(start, end);
  assert.match(save, /!hasProductsPermission \|\| replenishmentSavingKey/);
  assert.match(save, /const refreshed = await fetchInventoryReplenishmentSettings\(\)/);
  assert.match(save, /if \(!refreshed\) throw new Error/);
  assert.ok(save.indexOf('if (!refreshed) throw') < save.indexOf('setReplenishmentDrafts(current =>'));
  assert.match(dashboard, /disabled=\{Boolean\(replenishmentSavingKey\) \|\| replenishmentLoading \|\| !hasProductsPermission\}/);
});

test('replenishment save rejects blank values and locks inputs during save', () => {
  const start = dashboard.indexOf('const saveInventoryReplenishmentSetting = async');
  const end = dashboard.indexOf('const fetchInventoryMovements = async', start);
  const save = dashboard.slice(start, end);
  assert.match(save, /String\(rawThreshold\)\.trim\(\) === ''/);
  assert.match(save, /String\(rawTarget\)\.trim\(\) === ''/);
  const cardStart = dashboard.indexOf('<article key={position.key} className="admin-replenishment-row');
  const card = dashboard.slice(cardStart, dashboard.indexOf('</article>', cardStart));
  assert.equal(card.split('type="number" disabled={Boolean(replenishmentSavingKey) || replenishmentLoading}').length - 1, 2);
});

test('replenishment recommendation does not treat an empty target as zero', () => {
  assert.match(dashboard, /const validTarget = String\(targetValue\)\.trim\(\) !== ''/);
  assert.match(dashboard, /validTarget \? \(position\.isLowStock \? Math\.max\(0, Number\(targetValue\) - position\.stock\) : 0\) : '—'/);
});

test('replenishment settings can be refreshed from the server without a page reload', () => {
  const start = dashboard.indexOf('aria-labelledby="admin-replenishment-title"');
  const end = dashboard.indexOf('admin-replenishment-row', start);
  const panel = dashboard.slice(start, end);
  assert.match(panel, /onClick=\{\(\) => void fetchInventoryReplenishmentSettings\(\)\}/);
  assert.match(panel, /disabled=\{replenishmentLoading \|\| Boolean\(replenishmentSavingKey\)\}/);
  assert.match(panel, /replenishmentLoading \? 'იტვირთება…' : 'განახლება'/);
});

test('replenishment saves cannot start during a server refresh', () => {
  const start = dashboard.indexOf('const saveInventoryReplenishmentSetting = async');
  const end = dashboard.indexOf('const fetchInventoryMovements = async', start);
  const save = dashboard.slice(start, end);
  assert.match(save, /!hasProductsPermission \|\| replenishmentSavingKey \|\| replenishmentLoading/);
  assert.match(save, /p_low_stock_threshold: savedThreshold/);
  assert.match(save, /p_target_stock: savedTarget/);
});

test('replenishment settings explain manual cross-device refresh and last-write-wins behavior', () => {
  assert.match(dashboard, /სხვა მოწყობილობაზე შეცვლილი პარამეტრების სანახავად გამოიყენეთ „განახლება“/);
  assert.match(dashboard, /მოძველებული ვერსიით შენახვა დაიბლოკება/);
});

test('replenishment settings reject incomplete or malformed server responses', () => {
  const start = dashboard.indexOf('const fetchInventoryReplenishmentSettings = async');
  const end = dashboard.indexOf('const saveInventoryReplenishmentSetting = async', start);
  const fetcher = dashboard.slice(start, end);
  assert.match(fetcher, /!Array\.isArray\(result\?\.items\) \|\| result\?\.has_more === true/);
  assert.ok(fetcher.indexOf('throw new Error') < fetcher.indexOf('setReplenishmentSettings(result.items)'));
  assert.match(fetcher, /setReplenishmentSettings\(result\.items\)/);
});

test('replenishment cards visibly distinguish unsaved local edits', () => {
  assert.match(dashboard, /Object\.prototype\.hasOwnProperty\.call\(replenishmentDrafts, position\.key\)/);
  assert.match(dashboard, /hasUnsavedChanges && <span className="text-\[10px\] text-amber-200" role="status">შეუნახავი ცვლილება<\/span>/);
});

test('replenishment saves send the revision captured when editing began', () => {
  assert.match(dashboard, /p_expected_updated_at: Object\.prototype\.hasOwnProperty\.call\(draft, 'expectedUpdatedAt'\)/);
  assert.match(dashboard, /expectedUpdatedAt: Object\.prototype\.hasOwnProperty\.call\(current\[position\.key\] \|\| \{\}, 'expectedUpdatedAt'\)/);
  assert.match(dashboard, /ცვლილების გაუქმება/);
});
