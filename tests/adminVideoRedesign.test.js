import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const jsx=read('src/components/AdminDashboardPro.jsx'),css=read('src/adminVideoRedesign.css');
test('video redesign is opt-in to actual admin shell and loaded after visual editor CSS',()=>{
 assert.match(jsx,/data-admin-video-layout="v1"/);
 assert.ok(jsx.indexOf("import '../adminVideoRedesign.css'")>jsx.indexOf("import '../adminPanelVisualDesign.css'"));
 assert.ok(css.includes('[data-admin-video-layout="v1"]'));
 assert.match(css,/var\(--admin-vd-text-active/);
});
test('product actions retain handlers and full labels, category actions retain movement and names',()=>{
 for(const term of ['admin-video-publish','admin-video-edit','admin-video-delete','handleToggleProductPublished(p.id)','handleEditProduct(p)','handleDeleteProduct(p.id)','moveCategory(parentCat.id, -1)','moveCategory(sub.id, 1)','admin-video-category-actions','admin-video-category-identity'])assert.ok(jsx.includes(term),term);
 assert.match(css,/grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/word-break: normal !important/);
 assert.match(css,/min-height: 44px !important/);
});
test('support statuses remain semantic and contrast scoped, preview disabled only on accumulation branch',()=>{
 assert.ok(jsx.includes("aria-pressed={t.status === 'ღია'}"));
 assert.ok(css.includes('button[aria-pressed="true"]'));
 assert.ok(css.includes('admin-support-ticket-reply'));
 const cfg=JSON.parse(read('vercel.json'));
 assert.deepEqual(cfg.git.deploymentEnabled,{'internal-admin-video-redesign-2026-11-24':false});
 assert.notEqual(cfg.git.deploymentEnabled.main,false);
});

test('batch 02 chrome uses editor tokens and retains owner/staff navigation and publishing actions',()=>{
 for(const term of ['data-admin-visual-header="true"','data-admin-visual-nav-item="true"','setAdminTab(tab.id)','onSaveStorefrontDraft()','onPublishStorefront()','visibleAdminNavigationItems','hasModulePermission']) assert.ok(jsx.includes(term),term);
 for(const term of ['--admin-vd-headerBackground-active','--admin-vd-navActiveBackground-active','--admin-vd-navInactiveText-active','--admin-vd-primaryButtonText-active','--admin-vd-inputFocus-active','clamp(10px, var(--admin-vd-headerPadding-active','button:only-of-type',':focus-visible']) assert.ok(css.includes(term),term);
 assert.ok(css.includes('Video redesign 02'));
});

test('batch 03 shared card geometry cannot leak one module settings into another',()=>{
 const studio=read('src/adminPanelVisualDesign.css');
 const rules=[...studio.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
 const shared=rules.find(([,selector,body])=>selector.includes('.admin-command-kpi,')&&body.includes('contentCardBackground-active'));
 assert.ok(shared);
 assert.match(shared[2],/--admin-vd-cardPadding-active/);
 assert.doesNotMatch(shared[2],/--admin-vd-(staff|inventory|orders|support|discounts)-padding-active/);
 for(const [key,selector] of Object.entries({staff:'.admin-staff-panel',inventory:'.admin-inventory-panel',orders:'.admin-orders-panel',support:'.admin-support-panel',discounts:'.admin-discounts-panel',analytics:'.admin-analytics-card'})){
   const rule=rules.find(([,s,b])=>s.includes(selector)&&b.includes('--admin-vd-'+key+'-padding-active'));
   assert.ok(rule,key);
   for(const other of ['staff','inventory','orders','support','discounts','analytics'].filter(k=>k!==key)) assert.ok(!rule[2].includes('--admin-vd-'+other+'-padding-active'),key+' vs '+other);
 }
 assert.ok(studio.indexOf('Batch 03: independent module geometry')<studio.indexOf('.admin-banner-form {'));
 assert.ok(css.includes('Video redesign 03'));
 assert.ok(css.includes('max(16px, var(--admin-vd-inputFontSize-active, 16px))'));
});

test('batch 04 responsive order, staff and finance layouts retain security-sensitive actions',()=>{
 for(const term of ['aria-pressed={orderStatusFilter === st}','handleUpdateOrderStatus(o.id, \'ახალი\')','isDeliveredOrderStatus(o.status)','isShippedOrderStatus(o.status)','handlePrintInvoice(o)','handleExportOrders','handleInviteStaff','revokeStaff(staff)','reactivateStaff(staff)','handleExportAnalytics','!ordersVerifiedForReports','handleAddExpense','handleDeleteExpense(exp.id)']) assert.ok(jsx.includes(term),term);
 for(const term of ['Video redesign 04','--admin-vd-filterBackground-active','button[aria-pressed="true"]','.admin-order-status-actions > button:disabled','.admin-staff-permission-grid > label','.admin-analytics-kpis .admin-analytics-value','font-variant-numeric: tabular-nums','.admin-expense-row','grid-template-columns: repeat(2,minmax(0,1fr))']) assert.ok(css.includes(term),term);
});
