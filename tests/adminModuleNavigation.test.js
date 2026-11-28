import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('admin navigation maps each module to its server permission', () => {
  for (const [tab, permission] of [
    ['command', 'owner'],
    ['calculator', 'analytics'],
    ['ai_analyst', 'owner'],
    ['discounts', 'owner'],
    ['broadcasts', 'owner'],
    ['banners', 'settings'],
    ['categories', 'settings'],
    ['coupons', 'settings'],
    ['orders', 'orders'],
    ['products', 'products'],
    ['inventory', 'products'],
    ['replenishment', 'products'],
    ['expenses', 'expenses'],
    ['analytics', 'analytics'],
    ['support', 'support'],
    ['messages', 'crm'],
    ['users', 'crm'],
    ['settings', 'settings'],
    ['vendors', 'owner'],
    ['staff', 'owner'],
    ['logs', 'owner']
  ]) {
    assert.match(source, new RegExp(`${tab}: '${permission}'`));
  }
});

test('unauthorized tabs are filtered and unauthorized content is never rendered during the state-sync frame', () => {
  assert.match(source, /filter\(tab => canAccessAdminTab\(tab\.id\)\)/);
  assert.match(source, /const visibleAdminTab = canAccessAdminTab\(adminTab\) \? adminTab : getDefaultAdminTab\(\)/);
  assert.match(source, /visibleAdminTab === 'analytics' && !isOwner/);
  assert.match(source, /if \(!adminLoggedIn \|\| !hasAnyAdminAccess\(adminAccess\)\)/);
});

test('storefront draft saving is settings-only and publishing remains owner-only', () => {
  assert.match(source, /hasModulePermission\('settings'\) && \(/);
  assert.match(source, /isOwner && \(/);
});


test('Atelier admin preview remains owner-only and its appearance is separate from persistence',()=>{
 assert.match(source,/admin_visual_editor:\s*'owner'/);
 assert.ok(source.includes("visibleAdminTab === 'admin_visual_editor' && isOwner && ("));
 assert.ok(source.includes('if (!adminLoggedIn || !isOwner || !adminVisualDesignReady) return;'));
 assert.ok(source.includes('buildAdminPanelVisualStyle(resolveAdminStudioAppearance(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN))'));
 assert.ok(!source.includes('saveAdminPanelVisualDesignToCloud(effectiveAdminVisualDesign'));
});
