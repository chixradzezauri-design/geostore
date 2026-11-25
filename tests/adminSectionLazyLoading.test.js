import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/components/AdminDashboardPro.jsx',import.meta.url),'utf8');
test('dedicated admin modules use section-local lazy imports',()=>{
 for(const name of ['AdminPanelVisualEditor','AdminSupplierWorkspace','AdminPurchaseWorkspace','AdminMarketingSegments']){
  assert.ok(source.includes('const '+name+' = React.lazy(() => import('));
  assert.ok(!source.includes('import '+name+' from'));
 }
 assert.ok(source.includes("visibleAdminTab === 'admin_visual_editor' && isOwner && ("));
 assert.ok(source.includes('adminVisualDesignReady ? ('));
 for(const [tab,name] of [['vendors','AdminSupplierWorkspace'],['vendors','AdminPurchaseWorkspace'],['users','AdminMarketingSegments']]){
  assert.ok(source.includes("isOwner && visibleAdminTab === '"+tab+"' && <React.Suspense fallback={<AdminSectionLoading />}><"+name));
 }
});
