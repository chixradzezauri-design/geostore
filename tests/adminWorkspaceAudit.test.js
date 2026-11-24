import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADMIN_WORKSPACE_GROUPS,groupAdminWorkspaceNavigation,adminWorkspaceNavigationLabel} from '../src/utils/adminWorkspaceNavigation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('workspace audit 01 groups every admin module once and never adds unauthorized modules',()=>{
 const jsx=read('src/components/AdminDashboardPro.jsx');
 const list=jsx.slice(jsx.indexOf('const visibleAdminNavigationItems = ['),jsx.indexOf('].filter(tab => canAccessAdminTab(tab.id));',jsx.indexOf('const visibleAdminNavigationItems = [')));
 const ids=[...list.matchAll(/\{ id: '([^']+)'/g)].map(m=>m[1]);
 const grouped=ADMIN_WORKSPACE_GROUPS.flatMap(group=>group.ids);
 assert.equal(ids.length,23);assert.equal(new Set(grouped).size,23);assert.deepEqual([...grouped].sort(),[...ids].sort());
 const permitted=[{id:'orders',count:3},{id:'support',count:2},{id:'future-module'}];
 const result=groupAdminWorkspaceNavigation(permitted);assert.deepEqual(result.flatMap(g=>g.items),permitted);assert.equal(groupAdminWorkspaceNavigation([]).length,0);
 assert.equal(adminWorkspaceNavigationLabel('📂 კატეგორიები'),'კატეგორიები');assert.equal(adminWorkspaceNavigationLabel('🛠️ დიზაინი'),'დიზაინი');assert.equal(adminWorkspaceNavigationLabel('მარაგები'),'მარაგები');
 for(const term of ['canAccessAdminTab(tab.id)','groupAdminWorkspaceNavigation(visibleAdminNavigationItems)','aria-current={isActive ? "page" : undefined}','<optgroup','onSaveStorefrontDraft()','onPublishStorefront()','currentAdminNavigationLabel'])assert.ok(jsx.includes(term),term);
 assert.equal(JSON.parse(read('vercel.json')).git.deploymentEnabled['internal-admin-workspace-audit-2026-11-24'],false);
});

test('workspace audit 02 command center uses the same low-stock positions as replenishment and avoids false zero on unverified orders',()=>{
 const jsx=read('src/components/AdminDashboardPro.jsx'), css=read('src/adminVideoRedesign.css');
 for(const term of ['const commandCenterLowStockPositions = replenishmentPositions.filter(position => position.isLowStock)','commandCenterLowStockByProduct','commandCenterLowStockPositions.length','ordersVerifiedForReports ? commandCenterNewOrders.length','!ordersVerifiedForReports ? (','supportTicketsError ? "—"','!replenishmentSettingsReady || replenishmentError','შევსების ინდივიდუალური ზღვრების მიხედვით','admin-workspace-command-row-title','dateTime={new Date(event.timestamp).toISOString()}'])assert.ok(jsx.includes(term),term);
 assert.ok(css.includes('Workspace audit 02'));assert.ok(css.includes('.admin-workspace-command-row-title'));
});
