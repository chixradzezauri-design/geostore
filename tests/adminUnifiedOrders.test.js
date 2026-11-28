import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('unified orders retains all existing status and document actions',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const status of ['ახალი','მუშავდება','გაგზავნილი','დასრულებული','გაუქმებული']){
  assert.ok(app.includes('data-admin-order-status="'+status+'" aria-pressed='));
  assert.ok(app.includes("handleUpdateOrderStatus(o.id, '"+status+"')"));
 }
 for(const token of ['data-admin-order-filter={st}','handleExportOrders','handlePrintInvoice(o)','handlePrintInvoice(selectedOrderForModal)','handleSaveOrderAdminNote(selectedOrderForModal.id)','orderDetailTriggerRef.current = event.currentTarget','aria-modal="true"','Boolean(o.stock_restored_at)','setOrderPageByStatus({})','data-admin-order-action="details"','data-admin-order-action="invoice"'])assert.ok(app.includes(token),token);
});
test('order presentation scopes all changes to the admin shell and preserves editable card geometry',()=>{
 const css=read('src/adminUnifiedWorkspace.css').split('/* Stage 05 — orders.')[1];
 assert.ok(css);
 for(const token of ['@container (min-width: 480px)','@container (min-width: 720px)','@media (max-width: 359px)','--admin-pro-order-bg','--admin-vd-primaryButtonBackground-active','min-height: 44px','admin-unified-order-field-label'])assert.ok(css.includes(token),token);
 const card=css.match(/\.admin-orders-list \.admin-order-card \{([^}]+)\}/)[1];
 assert.doesNotMatch(card,/padding|border-radius|background-color/);
 assert.doesNotMatch(css,/overflow:\s*(hidden|clip)/);
});


test('order and stock presentation uses readable status labels and active typography',()=>{
 const css=read('src/adminUnifiedWorkspace.css'),video=read('src/adminVideoRedesign.css');
 assert.ok(css.includes('font-size: max(12px,var(--admin-vd-buttonFontSize-active,13px))'));
 assert.ok(css.includes('clamp(20px,calc(var(--admin-vd-titleFontSize-active,22px) * 1.15),30px)'));
 assert.match(video,/\.admin-order-status-badge\[data-admin-order-status\] \{[^}]*font-size:12px!important/);
 assert.match(video,/\[data-admin-pro-replenishment-status\] \{[^}]*font-size:12px!important[^}]*max-inline-size:100%/);
 assert.ok(read('tests/browser/adminWorkspaceSmoke.mjs').includes('stock captions remain readable and bounded'));
});


test('order and inventory surfaces drop decorative classes and retain mutations',()=>{
 const app=read('src/components/AdminDashboardPro.jsx'),css=read('src/adminUnifiedWorkspace.css');
 assert.ok(app.includes('admin-orders-panel min-w-0 border rounded-xl'));
 assert.ok(app.includes('admin-order-card min-w-0 p-3 rounded-xl'));
 assert.ok(app.includes('admin-inventory-panel min-w-0 space-y-4 rounded-xl'));
 assert.ok(css.includes('--admin-vd-ordersSectionBackground-active,var(--av-surface)'));
 assert.ok(css.includes('--admin-vd-inventorySectionBackground-active,var(--av-surface)'));
 assert.ok(css.includes('A single intrinsic column'));
 assert.ok(app.includes('validateReplenishmentSaveResponse'));
});


test('Studio stock and supply presentation preserves status colors and table scrolling',()=>{
 const css=read('src/adminStudioWorkspace.css').split('/* Studio — inventory and supply.')[1].split('/* Studio — ')[0];
 assert.ok(css);
 const prefix='.admin-dashboard-pro.admin-dashboard-shell[data-admin-video-layout="v1"][data-admin-appearance="studio"] ';
 const selectors=css.split('\n').map(line=>line.trim()).filter(line=>line.startsWith('.'));
 assert.ok(selectors.length>20);
 for(const line of selectors)assert.ok(line.startsWith(prefix),line);
 for(const term of ['[data-admin-pro-inventory-summary]','[data-admin-pro-inventory-table]','.admin-replenishment-metric > input','.admin-replenishment-save > button','.admin-unified-purchase-line','.admin-supplier-card'])assert.ok(css.includes(term),term);
 assert.doesNotMatch(css,/display:\s*none|visibility:\s*hidden|pointer-events\s*:\s*none|overflow\s*:\s*(?:hidden|clip)/);
 assert.doesNotMatch(css,/\[data-admin-pro-replenishment-status=/);
});
