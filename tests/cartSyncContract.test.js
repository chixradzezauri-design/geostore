import test from 'node:test';
import assert from 'node:assert/strict';
import {projectCartIntents,cartIntentKey,applyCartSyncIntent,planCartCheckoutClear,validateCartSyncSnapshot} from '../src/utils/cartSyncContract.js';
const line=(overrides={})=>({productId:'p1',size:'M',color:'black',variantId:null,giftWrap:false,vipWarranty:false,quantity:1,...overrides});
const local=(overrides={})=>({id:'p1',selectedSize:'M',selectedColor:'black',customVariantId:null,giftWrap:false,vipWarranty:false,giftMessage:'',quantity:1,...overrides});
test('projection only includes explicit cart intent fields, not price, stock, image or private details',()=>{
 assert.deepEqual(projectCartIntents([local({priceGEL:50,stock:9,purchase_cost:11,name:'secret',image:'private'})]),[line()]);
 assert.throws(()=>projectCartIntents([local({giftWrap:true,giftMessage:'private note'})]),/Personalized/);
 assert.throws(()=>projectCartIntents([local({giftMessage:undefined})]),/legacy/);
 assert.throws(()=>projectCartIntents([local({priceGEL:1}),local({priceGEL:2})]),/Ambiguous/);
});
test('identity preserves size, color, variant and add-ons but not quantity',()=>{
 for(const different of [line({size:'L'}),line({color:'white'}),line({variantId:'v1'}),line({giftWrap:true}),line({vipWarranty:true})]){
  assert.notEqual(cartIntentKey(line()),cartIntentKey(different));
 }
 assert.equal(cartIntentKey(line()),cartIntentKey(line({quantity:5})));
});
test('stale updates cannot undo newer quantities or resurrect removed items',()=>{
 const start={revision:1,lines:[line()]};
 const updated=applyCartSyncIntent(start,1,{type:'set',line:line({quantity:3})});
 assert.deepEqual(updated.snapshot,{revision:2,lines:[line({quantity:3})]});
 const removed=applyCartSyncIntent(updated.snapshot,2,{type:'remove',line:line()});
 assert.deepEqual(removed.snapshot,{revision:3,lines:[]});
 assert.deepEqual(applyCartSyncIntent(removed.snapshot,1,{type:'set',line:line()}),{status:'conflict',snapshot:removed.snapshot});
 assert.deepEqual(start,{revision:1,lines:[line()]});
});
test('checkout clear candidate refuses to erase cart additions after checkout snapshot',()=>{
 const checkout={revision:4,lines:[line()]};
 const newer=applyCartSyncIntent(checkout,4,{type:'set',line:line({productId:'p2'})}).snapshot;
 assert.deepEqual(planCartCheckoutClear(newer,4),{status:'conflict',snapshot:newer});
 assert.deepEqual(planCartCheckoutClear(checkout,4),{status:'candidate',snapshot:{revision:5,lines:[]}});
});
test('invalid quantities, duplicate identities and overflow fail closed',()=>{
 assert.throws(()=>validateCartSyncSnapshot({revision:0,lines:[line({quantity:0})]}),/quantity/);
 assert.throws(()=>validateCartSyncSnapshot({revision:0,lines:[line(),line({quantity:2})]}),/Ambiguous/);
 const full={revision:0,lines:Array.from({length:100},(_,i)=>line({productId:'p'+i}))};
 assert.deepEqual(applyCartSyncIntent(full,0,{type:'set',line:line({productId:'new'})}),{status:'limit',snapshot:full});
});
