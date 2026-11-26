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
