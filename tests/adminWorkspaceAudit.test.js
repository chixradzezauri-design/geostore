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

test('workspace audit 03 keeps order actions and marks unverified lists correctly',()=>{
 const jsx=read('src/components/AdminDashboardPro.jsx'), css=read('src/adminVideoRedesign.css');
 for(const term of ['if (!hasOrdersPermission || !ordersReady || ordersError)','admin-workspace-orders-notice','admin-workspace-orders-reset','admin-workspace-order-clear','setOrderPageByStatus({})','getOrderStatusFilterKey(selectedOrderForModal.status)','htmlFor="admin-workspace-order-note"','handlePrintInvoice(selectedOrderForModal)','handleSaveOrderAdminNote(selectedOrderForModal.id)',"handleUpdateOrderStatus(o.id, 'ახალი')",'Boolean(o.stock_restored_at)','orderDetailTriggerRef.current = event.currentTarget'])assert.ok(jsx.includes(term),term);
 assert.ok(css.includes('Workspace audit 03'));assert.ok(css.includes('.admin-workspace-order-clear'));assert.ok(css.includes('.admin-order-detail-header > button'));
});

test('workspace audit 04 exposes existing product content fields and decimal price input without changing save contracts',()=>{
 const jsx=read('src/components/AdminDashboardPro.jsx'),css=read('src/adminVideoRedesign.css');
 const form=jsx.slice(jsx.indexOf('<form id="geostore-product-form"'),jsx.indexOf('</form>',jsx.indexOf('<form id="geostore-product-form"')));
 for(const field of ['oldPriceGEL','vendor','description','tags'])assert.ok(form.includes('value={productForm.'+field+'}'),field);
 for(const term of ['step="0.01" inputMode="decimal"','checked={Boolean(productForm.isFeatured)}','MAX_PRODUCT_GALLERY_IMAGES','მთავრად არჩევა','setSelectedImages(prev => [prev[idx], ...prev.filter((_, i) => i !== idx)])','onSubmit={handleSaveProduct}'])assert.ok(form.includes(term),term);
 assert.ok(jsx.includes('const mainImage = galleryImages[0] || null'));assert.ok(jsx.includes('admin_update_product_with_stock'));assert.ok(css.includes('Workspace audit 04'));
});

test('workspace audit 05 inventory filters are read-only and recommendations distinguish saved from unverified settings',()=>{
 const jsx=read('src/components/AdminDashboardPro.jsx'),css=read('src/adminVideoRedesign.css');
 for(const term of ['admin-workspace-inventory-products','admin-workspace-inventory-filter-state','setInventoryMovementProductFilter(\'\')','replenishmentStockFilter','position.isOutOfStock','replenishmentSummaryVerified','admin-workspace-replenishment-filter','setReplenishmentPage(1)','saveInventoryReplenishmentSetting(position)','recoverInventoryReplenishmentConflict(position.key)','fetchInventoryMovements(inventoryMovementCursor, true)'])assert.ok(jsx.includes(term),term);
 assert.ok(css.includes('Workspace audit 05'));assert.ok(css.includes('.admin-workspace-inventory-name'));
});
