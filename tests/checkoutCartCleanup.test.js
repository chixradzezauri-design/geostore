import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeCartSnapshot} from '../src/utils/cartSafety.js';
import {captureCheckoutCart,checkoutCartUnchanged,planConfirmedLocalCartCleanup} from '../src/utils/checkoutCartCleanup.js';
const id='ORD-'+'A'.repeat(32),cart=[{id:'p',name:'P',quantity:1,priceGEL:20}];
const items=[{id:'p',quantity:1,price:20}];
const receipt={order_id:id,stock_deducted:true,items,subtotal_gel:20,discount_gel:0,delivery_gel:5,total_gel:25};
const base={quickBuy:false,submitted:captureCheckoutCart(cart),current:cart,persisted:sanitizeCartSnapshot(cart),requestedItems:items,receipt,orderId:id};
test('quick buy never clears unrelated cart, normal exact receipt may clear',()=>{assert.deepEqual(planConfirmedLocalCartCleanup({...base,quickBuy:true}),{status:'preserve'});assert.deepEqual(planConfirmedLocalCartCleanup(base),{status:'clear'});});
test('later local or cross-tab changes never clear cart',()=>{assert.equal(checkoutCartUnchanged(base.submitted,[...cart,{id:'q'}]),false);for(const change of [{current:[...cart,{id:'q'}]},{persisted:[{...cart[0],quantity:2}]},{persisted:null},{current:[]}])assert.equal(planConfirmedLocalCartCleanup({...base,...change}).status,'review');});
test('mismatched receipt or missing confirmation never clears',()=>{for(const r of [{...receipt,stock_deducted:false},{...receipt,items:[{...items[0],id:'q'}]},{...receipt,order_id:'ORD-'+'B'.repeat(32)}])assert.equal(planConfirmedLocalCartCleanup({...base,receipt:r}).status,'review');});

test('normal checkout accepts the existing sanitized persistence shape only',()=>{const normalized=sanitizeCartSnapshot(cart);assert.notDeepEqual(normalized,cart);assert.equal(planConfirmedLocalCartCleanup({...base,persisted:normalized}).status,'clear');assert.equal(planConfirmedLocalCartCleanup({...base,persisted:cart}).status,'review');assert.equal(planConfirmedLocalCartCleanup({...base,persisted:[...normalized,{id:'q',name:'Q',quantity:1,priceGEL:10}]}).status,'review');});
