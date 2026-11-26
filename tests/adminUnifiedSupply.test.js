import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('inventory redesign preserves existing verification, history and revision safeguards',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const term of ['data-admin-inventory-view="history"','data-admin-inventory-view="planning"','replenishmentSummaryVerified','fetchInventoryMovements(inventoryMovementCursor, true)','saveInventoryReplenishmentSetting(position)','recoverInventoryReplenishmentConflict(position.key)','!hasProductsPermission || hasConflict','data-admin-pro-inventory-table','data-admin-replenishment-metric="recommended"'])assert.ok(app.includes(term),term);
 assert.ok(app.includes('<form id="geostore-product-form"'));
});
test('supplier and purchase workspace retains server and financial operations',()=>{
 const purchase=read('src/components/AdminPurchaseWorkspace.jsx'),supplier=read('src/components/AdminSupplierWorkspace.jsx');
 for(const term of ['admin-unified-purchase-draft','onSubmit={create}','receive(currentOrder,l)','transition(currentOrder,\'approve\')','transition(currentOrder,\'cancel\')','recordPayment(currentOrder,payment)','correctPayment(currentOrder,record,reason)','run(pending,true)','className="admin-pro-native-control-boundary"'])assert.ok(purchase.includes(term),term);
 for(const term of ['onSubmit={submit}','toggle(row)','importOne(item)','admin-unified-supplier-list','!editCurrent'])assert.ok(supplier.includes(term),term);
 const css=read('src/adminUnifiedWorkspace.css').split('/* Stage 07 — inventory, suppliers and purchases.')[1];
 assert.ok(css.includes('@container (min-width: 1050px)'));assert.doesNotMatch(css,/overflow:\s*(hidden|clip)/);
});
