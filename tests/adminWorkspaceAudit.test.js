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

test('workspace audit 06 category search preserves sibling order and existing product safeguards',()=>{
 const jsx=read('src/components/AdminDashboardPro.jsx'),css=read('src/adminVideoRedesign.css');
 for(const term of ['filteredMainCategories.map(parentCat => {','child.parentId === parent.id','admin-workspace-category-search','setCategorySearch(\'\')','mainCategories[0]?.id === parentCat.id','subCats[0]?.id === sub.id','assignedProducts.length > 0','assignedCount > 0','categoryPhotoRequestRef.current.edit++','value={editCatIcon}','validateImageFile(file, MAX_PRODUCT_IMAGE_BYTES)','persistCategoryList(updatedCategories)'])assert.ok(jsx.includes(term),term);
 assert.equal((jsx.match(/aria-label="რედაქტირებული კატეგორიის ხატულა"/g)||[]).length,2);
 assert.ok(css.includes('Workspace audit 06'));
});

test('workspace audit 07 gates detailed financial views and keeps expense and calculator contracts',()=>{
 const jsx=read('src/components/AdminDashboardPro.jsx'),css=read('src/adminVideoRedesign.css');
 for(const term of ['!verifiedFinanceSnapshot || expensesLoading','ordersVerifiedForReports ? financialOverview.pipelineOrders.length','expensesVerifiedForReports ? financialOverview.periodExpenses.length','expensesVerifiedForReports && <div className="admin-finance-recent-list','admin-workspace-expense-summary','filteredExpenses.reduce','setExpenseCategoryFilter(\'all\'); setExpensePage(1)','calculatedSalesMetrics.revenue > 0 ? calculatedSalesMetrics.profitMargin','Number(calcForm.purchaseCost) > 0 ? calculatedSalesMetrics.markup','onSubmit={handleAddExpense}','handleDeleteExpense(exp.id)','handleExportAnalytics'])assert.ok(jsx.includes(term),term);
 const analytics=jsx.slice(jsx.indexOf('<div className="admin-analytics space-y-6">'),jsx.indexOf('<div className="admin-profit-calculator'));
 for(const expression of ['financialOverview.salesTrend','financialOverview.bestSellingProducts','incomeSources','financialOverview.productProfitability','financialOverview.vendorProfitability']) assert.ok(analytics.includes('ისტორია ჯერ არ არის დადასტურებული.</p> : '+expression+'.length === 0'),expression);
 assert.ok(css.includes('Workspace audit 07'));
});

test('workspace audit 08 verifies staff list, serializes mutations and retains owner and server checks',()=>{
 const jsx=read('src/components/AdminDashboardPro.jsx'),css=read('src/adminVideoRedesign.css'),api=read('supabase/functions/manage-admin-staff/index.ts');
 const staff=jsx.slice(jsx.indexOf('function AdminStaffManagement('),jsx.indexOf('export default function AdminDashboardPro('));
 for(const term of ['staffListReady','staffListRequestRef.current','!Array.isArray(result.staff)','admin-workspace-staff-search','admin-workspace-staff-status','filteredStaff.map','createStaffPermissions(staff.permissions)','callStaffAdminApi({ action: \'revoke\', id: staff.id })','if (!isOwner) return null'])assert.ok(staff.includes(term),term);
 assert.equal((staff.match(/if \(!isOwner \|\| !staffListReady \|\| staffMutationRef.current\) return;/g)||[]).length,4);
 assert.equal((staff.match(/staffMutationRef.current = false;/g)||[]).length,4);
 assert.ok(api.includes('caller.id !== OWNER_ID'));assert.ok(api.includes(".neq('user_id', OWNER_ID)"));assert.ok(css.includes('Workspace audit 08'));
});

test('workspace audit 09 distinguishes CRM sources, caps and confirmed writes',()=>{
 const jsx=read('src/components/AdminDashboardPro.jsx'),css=read('src/adminVideoRedesign.css');
 for(const term of ['crmDirectoryCapped = serverCustomers.length >= 500','!crmDirectoryCapped && customer.isLocalCrmRecord','crmFetchRef.current === requestVersion','crmWriteRef.current === requestVersion','String(saved.user_id) !== String(customer.id)','admin-workspace-crm-filter','setCrmStatusFilter(\'all\'); setCrmPage(1)','u.isServerCustomer && <p','maxLength={1000}','min="0" max="100" step="0.01"','handleToggleVipUser(u.id || u.email)','handleToggleBlockUser(u.id || u.email)']) assert.ok(jsx.includes(term),term);
 assert.ok(css.includes('Workspace audit 09'));
});
