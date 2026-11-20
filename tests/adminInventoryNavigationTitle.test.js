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

test('replenishment saves preserve acknowledged revisions when full refresh fails', () => {
  const start = dashboard.indexOf('const saveInventoryReplenishmentSetting = async');
  const end = dashboard.indexOf('const fetchInventoryMovements = async', start);
  const save = dashboard.slice(start, end);
  assert.match(save, /!hasProductsPermission \|\| replenishmentSavingRef\.current \|\| replenishmentSavingKey/);
  assert.match(save, /const savedSetting = validateReplenishmentSaveResponse/);
  assert.match(save, /const refreshed = await fetchInventoryReplenishmentSettings\(\)/);
  assert.match(save, /if \(!refreshed\) \{\s*\/\/ The save was confirmed/);
  assert.match(save, /setReplenishmentSettings\(current => \[/);
  assert.match(save, /savedSetting\s*\]\);/);
  assert.ok(save.indexOf('setReplenishmentSettings(current => [') < save.indexOf('setReplenishmentDrafts(current =>'));
  assert.match(dashboard, /disabled=\{Boolean\(replenishmentSavingKey\) \|\| replenishmentLoading \|\| !hasProductsPermission \|\| hasConflict\}/);
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

test('replenishment recommendation previews the edited threshold and target', () => {
  assert.match(dashboard, /calculateReplenishmentDraftPreview\(position\.stock, thresholdValue, targetValue\)/);
  assert.match(dashboard, /draftPreview\.valid \? draftPreview\.suggestedQuantity : '—'/);
  assert.match(dashboard, /draftPreview\.isLowStock \? 'შევსება საჭიროა' : 'მარაგი ნორმაშია'/);
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
  assert.match(save, /!hasProductsPermission \|\| replenishmentSavingRef\.current \|\| replenishmentSavingKey \|\| replenishmentLoading/);
  assert.match(save, /p_low_stock_threshold: savedThreshold/);
  assert.match(save, /p_target_stock: savedTarget/);
});

test('replenishment settings explain manual cross-device refresh and last-write-wins behavior', () => {
  assert.match(dashboard, /სხვა მოწყობილობაზე შეცვლილი პარამეტრების სანახავად გამოიყენეთ „განახლება“/);
  assert.match(dashboard, /მოძველებული ვერსიით შენახვა დაიბლოკება/);
});

test('replenishment only displays server lists after validating their structure', () => {
  const start = dashboard.indexOf('const fetchInventoryReplenishmentSettings = async');
  const end = dashboard.indexOf('const saveInventoryReplenishmentSetting = async', start);
  const fetcher = dashboard.slice(start, end);
  assert.match(fetcher, /validateReplenishmentSettingsResponse\(result\)/);
  assert.ok(fetcher.indexOf('validateReplenishmentSettingsResponse(result)') < fetcher.indexOf('setReplenishmentSettings(settings)'));
});
test('replenishment cards visibly distinguish unsaved local edits', () => {
  assert.match(dashboard, /Object\.prototype\.hasOwnProperty\.call\(replenishmentDrafts, position\.key\)/);
  assert.match(dashboard, /\(hasUnsavedChanges \|\| hasConflict\) && <div className="flex flex-wrap items-center gap-2">/);
  assert.match(dashboard, /<span className="text-\[10px\] text-amber-200" role="status">შეუნახავი ცვლილება<\/span>/);
});

test('replenishment saves send the revision captured when editing began', () => {
  assert.match(dashboard, /const expectedUpdatedAt = Object\.prototype\.hasOwnProperty\.call\(draft, 'expectedUpdatedAt'\)/);
  assert.match(dashboard, /p_expected_updated_at: expectedUpdatedAt/);
  assert.match(dashboard, /expectedUpdatedAt: Object\.prototype\.hasOwnProperty\.call\(current\[position\.key\] \|\| \{\}, 'expectedUpdatedAt'\)/);
  assert.match(dashboard, /ცვლილების გაუქმება/);
});

test('replenishment list refresh shows parsed server error messages', () => {
  const start = dashboard.indexOf('const fetchInventoryReplenishmentSettings = async');
  const end = dashboard.indexOf('const saveInventoryReplenishmentSetting = async', start);
  const fetcher = dashboard.slice(start, end);
  assert.match(fetcher, /JSON\.parse\(detail\)\?\.message \|\| detail/);
  assert.match(fetcher, /throw new Error\(message \|\| `HTTP \$\{response\.status\}`\)/);
});

test('replenishment save validates server acknowledgment before clearing drafts', () => {
  const start = dashboard.indexOf('const saveInventoryReplenishmentSetting = async');
  const end = dashboard.indexOf('const fetchInventoryMovements = async', start);
  const save = dashboard.slice(start, end);
  assert.match(save, /validateReplenishmentSaveResponse\(saveResult, position, savedThreshold, savedTarget, expectedUpdatedAt\)/);
  assert.ok(save.indexOf('validateReplenishmentSaveResponse(saveResult') < save.indexOf('setReplenishmentDrafts(current =>'));
});
test('existing replenishment settings without a revision cannot be saved blindly', () => {
  const start = dashboard.indexOf('const saveInventoryReplenishmentSetting = async');
  const end = dashboard.indexOf('const fetchInventoryMovements = async', start);
  const save = dashboard.slice(start, end);
  assert.match(save, /position\.hasCustomSetting && !expectedUpdatedAt/);
  assert.match(save, /შენახულ პარამეტრს ვერსიის ინფორმაცია აკლია/);
  assert.ok(save.indexOf('position.hasCustomSetting && !expectedUpdatedAt') < save.indexOf('setReplenishmentSavingKey(position.key)'));
});

test('replenishment refresh uses strict response validation', () => {
  const start = dashboard.indexOf('const fetchInventoryReplenishmentSettings = async');
  const end = dashboard.indexOf('const saveInventoryReplenishmentSetting = async', start);
  const fetcher = dashboard.slice(start, end);
  assert.match(fetcher, /const settings = validateReplenishmentSettingsResponse\(result\)/);
  assert.match(fetcher, /setReplenishmentSettings\(settings\)/);
});
test('synchronous lock prevents double-click save races before React re-renders', () => {
  const start = dashboard.indexOf('const saveInventoryReplenishmentSetting = async');
  const end = dashboard.indexOf('const fetchInventoryMovements = async', start);
  const save = dashboard.slice(start, end);
  assert.match(dashboard, /const replenishmentSavingRef = useRef\(false\)/);
  assert.match(save, /if \(!hasProductsPermission \|\| replenishmentSavingRef\.current/);
  assert.match(save, /replenishmentSavingRef\.current = true/);
  assert.match(save, /finally \{\s*replenishmentSavingRef\.current = false/);
  assert.ok(save.indexOf('replenishmentSavingRef.current = true') < save.indexOf('await getSupabaseHeaders()'));
});

test('replenishment conflict responses retain local edits and require user review', () => {
  const start = dashboard.indexOf('const saveInventoryReplenishmentSetting = async');
  const end = dashboard.indexOf('const fetchInventoryMovements = async', start);
  const save = dashboard.slice(start, end);
  assert.match(save, /payload\?\.code === '40001'/);
  assert.match(save, /setReplenishmentConflictKeys\(current => \(\{ \.\.\.current, \[position\.key\]: true \}\)\)/);
  assert.match(dashboard, /const hasConflict = Boolean\(replenishmentConflictKeys\[position\.key\]\)/);
  assert.match(dashboard, /კონფლიქტი: სერვერის ვერსიის ჩატვირთვა გააუქმებს ამ პოზიციის ძველ ადგილობრივ ცვლილებებს/);
  assert.match(dashboard, /\|\| !hasProductsPermission \|\| hasConflict/);
  assert.match(dashboard, /setReplenishmentConflictKeys\(current => \{\s*const next = \{ \.\.\.current \};\s*delete next\[positionKey\];\s*return next;\s*\}\)/);
});

test('conflict recovery retains drafts if server reload fails and discards only after success', () => {
  const start = dashboard.indexOf('const recoverInventoryReplenishmentConflict = async');
  const end = dashboard.indexOf('const saveInventoryReplenishmentSetting = async', start);
  assert.ok(start >= 0 && end > start);
  const recover = dashboard.slice(start, end);
  assert.match(recover, /replenishmentRecoveryRef\.current = true/);
  assert.match(recover, /if \(await fetchInventoryReplenishmentSettings\(\) !== true\) return/);
  assert.ok(recover.indexOf('if (await fetchInventoryReplenishmentSettings() !== true) return') < recover.indexOf('setReplenishmentDrafts(current =>'));
  assert.match(recover, /setReplenishmentConflictKeys\(current =>/);
  assert.match(recover, /finally \{\s*replenishmentRecoveryRef\.current = false/);
  assert.match(dashboard, /onClick=\{\(\) => void recoverInventoryReplenishmentConflict\(position\.key\)\}/);
  assert.match(dashboard, /სერვერის ვერსიით ჩანაცვლება/);
});

test('partially successful save does not falsely claim the save itself failed', () => {
  assert.doesNotMatch(dashboard, /პარამეტრების შენახვა\/ჩატვირთვა ვერ მოხერხდა: \{replenishmentError\}/);
  assert.match(dashboard, /პარამეტრი შენახულია, მაგრამ სრული სიის განახლება ვერ მოხერხდა/);
});
