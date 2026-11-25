import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingSyncKey,readPendingSync,savePendingSync,markPendingAttempt,planPendingSync,clearPendingSync} from '../src/utils/customerSyncJournal.js';
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const base={revision:4,ids:['p1']},intent={productId:'p2',present:true};
test('pending intent survives a reload and remains scoped to its owner',()=>{
 const s=memory(),saved=savePendingSync(s,A,'wishlist',base,intent);
 assert.equal(saved.status,'saved');
 assert.deepEqual(readPendingSync(s,A,'wishlist'),{status:'pending',entry:saved.entry});
 assert.deepEqual(readPendingSync(s,B,'wishlist'),{status:'empty'});
 assert.deepEqual(readPendingSync(s,A,'cart'),{status:'empty'});
 assert.equal(savePendingSync(s,A,'wishlist',base,{productId:'p3',present:true}).status,'pending-exists');
});
test('crash/uncertain outcome retains exact base; reconnect never rebases',()=>{
 const s=memory(),queued=savePendingSync(s,A,'wishlist',base,intent).entry;
 const attempt=markPendingAttempt(s,queued).entry;
 assert.equal(readPendingSync(s,A,'wishlist').entry.state,'uncertain');
 assert.deepEqual(planPendingSync(attempt,base),{status:'send-original',expectedRevision:4,intent});
 assert.equal(planPendingSync(attempt,{revision:5,ids:['p1','p2']}).status,'review');
 assert.equal(planPendingSync(attempt,{revision:5,ids:[]}).status,'review');
 assert.equal(planPendingSync(attempt,{revision:4,ids:[]}).status,'review');
 assert.equal(planPendingSync(attempt,{revision:3,ids:[]}).status,'stale');
});
test('clear only after matching acknowledged snapshot or explicit resolution',()=>{
 const s=memory(),queued=savePendingSync(s,A,'wishlist',base,intent).entry;
 assert.equal(clearPendingSync(s,queued).status,'review');
 const attempt=markPendingAttempt(s,queued).entry;
 assert.equal(clearPendingSync(s,queued,{explicitResolution:true}).status,'blocked');
 assert.equal(clearPendingSync(s,attempt,{acknowledgedSnapshot:{revision:5,ids:[]}}).status,'review');
 assert.equal(clearPendingSync(s,attempt,{acknowledgedSnapshot:{revision:5,ids:['p1','p2']}}).status,'cleared');
 assert.equal(readPendingSync(s,A,'wishlist').status,'empty');
});
test('corruption or quota error never overwrites a pending record',()=>{
 const s=memory();s.setItem(pendingSyncKey(A,'wishlist'),'{');
 assert.equal(readPendingSync(s,A,'wishlist').status,'blocked');
 assert.equal(savePendingSync(s,A,'wishlist',base,intent).status,'blocked');
 assert.equal(s.getItem(pendingSyncKey(A,'wishlist')),'{');
 const blocked={getItem:()=>null,setItem:()=>{throw Error('quota');}};
 assert.equal(savePendingSync(blocked,A,'wishlist',base,intent).status,'blocked');
});
test('cart intent includes only approved fields and preserves variant identity',()=>{
 const s=memory(),line={productId:'p1',size:'M',color:'black',variantId:null,giftWrap:false,vipWarranty:false,quantity:2};
 assert.throws(()=>savePendingSync(s,A,'cart',{revision:1,lines:[]},{type:'set',line:{...line,giftMessage:'private'}}),/Unexpected/);
 const q=savePendingSync(s,A,'cart',{revision:1,lines:[]},{type:'set',line}).entry;
 assert.equal(planPendingSync(q,{revision:2,lines:[]}).status,'review');
 assert.deepEqual(planPendingSync(q,{revision:1,lines:[]}).intent,{type:'set',line});
});
