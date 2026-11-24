import test from 'node:test';
import assert from 'node:assert/strict';
import {formatPurchaseTetri,purchaseDraftTetri,summarizePurchaseFinance} from '../src/utils/adminPurchaseFinance.js';
const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
const stamp='2026-11-24T12:00:00Z';
function order(n,status,qty,received,cost,supplier=1){
 const line={id:id(n+100),purchase_id:id(n),product_id:'p',product_name:'P',quantity:qty,received_quantity:received,unit_cost:cost};
 return {id:id(n),supplier_id:id(supplier+200),supplier_name:'Supplier '+supplier,status,revision:2,created_at:stamp,admin_purchase_lines:[line],admin_purchase_receipts:received?[{id:id(n+300),purchase_id:id(n),line_id:line.id,quantity:received,unit_cost:cost,stock_before:0,stock_after:received,received_at:stamp}]:[]};
}
test('separates draft, cancelled, commitment and receipt value per supplier without double counting',()=>{
 const summary=summarizePurchaseFinance([order(1,'partial',5,2,4.25),order(2,'approved',3,0,2,2),order(3,'received',2,2,1.01),order(4,'draft',7,0,5),order(5,'cancelled',4,0,3)]);
 assert.deepEqual(summary.total,{draft:3500n,committed:2927n,received:1052n,outstanding:1875n,cancelled:1200n,count:5});
 assert.equal(summary.suppliers[0].received,1052n);
 assert.equal(summary.byOrder.get(id(1)).outstanding,1275n);
});
test('large valid purchases preserve exact tetri beyond safe Number totals',()=>{
 const summary=summarizePurchaseFinance([order(1,'approved',1000000,0,1000000000),order(2,'approved',1000000,0,0.01)]);
 assert.equal(summary.total.committed,100000000001000000n);
 assert.equal(formatPurchaseTetri(summary.total.committed),'1 000 000 000 010 000.00 ₾');
 assert.equal(purchaseDraftTetri([{product_id:'p',quantity:3,unit_cost:0.1}]),30n);
 assert.equal(purchaseDraftTetri([{product_id:'p',quantity:1,unit_cost:''}]),null);
});
test('invalid history fails closed instead of displaying invented totals',()=>{
 const bad=order(1,'partial',5,2,4.25);bad.admin_purchase_receipts=[];
 assert.throws(()=>summarizePurchaseFinance([bad]));
 assert.throws(()=>summarizePurchaseFinance([order(1,'approved',1,0,1),order(1,'approved',1,0,1)]));
 assert.equal(formatPurchaseTetri(null),'—');
 assert.equal(summarizePurchaseFinance([]).total.received,0n);
});
