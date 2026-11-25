import test from 'node:test';
import assert from 'node:assert/strict';
import {projectWishlistIds,validateWishlistSnapshot,applyWishlistIntent,acceptWishlistResponse} from '../src/utils/wishlistSyncContract.js';
test('projection transfers only IDs and refuses truncation or malformed entries',()=>{
 assert.deepEqual(projectWishlistIds([{id:'p1',priceGEL:1,purchase_cost:5,image:'private'},{id:'p1'},{id:'p2'}]),['p1','p2']);
 assert.throws(()=>projectWishlistIds([{id:' '}]),/Invalid/);
 assert.throws(()=>projectWishlistIds(Array.from({length:101},(_,i)=>({id:'p'+i}))),/limit/);
});
test('explicit add/remove is idempotent and preserves other device items',()=>{
 const start={revision:7,ids:['a','b']};
 const added=applyWishlistIntent(start,{productId:'c',present:true});
 assert.deepEqual(added,{status:'changed',snapshot:{revision:8,ids:['a','b','c']}});
 assert.equal(applyWishlistIntent(added.snapshot,{productId:'c',present:true}).status,'unchanged');
 const removed=applyWishlistIntent(added.snapshot,{productId:'a',present:false});
 assert.deepEqual(removed.snapshot,{revision:9,ids:['b','c']});
 assert.equal(applyWishlistIntent(removed.snapshot,{productId:'a',present:false}).status,'unchanged');
 assert.deepEqual(start,{revision:7,ids:['a','b']});
});
test('limit refuses addition without discarding existing entries',()=>{
 const snapshot={revision:3,ids:Array.from({length:100},(_,i)=>'p'+i)};
 assert.deepEqual(applyWishlistIntent(snapshot,{productId:'new',present:true}),{status:'limit',snapshot});
 assert.throws(()=>validateWishlistSnapshot({revision:1,ids:['x','x']}),/Invalid/);
});
test('old responses and account-switch responses are ignored',()=>{
 const input={requestOwnerId:'A',activeOwnerId:'A',requestEpoch:3,activeEpoch:3,knownRevision:8,snapshot:{revision:8,ids:['x']}};
 assert.deepEqual(acceptWishlistResponse(input),input.snapshot);
 assert.equal(acceptWishlistResponse({...input,activeOwnerId:'B'}),null);
 assert.equal(acceptWishlistResponse({...input,activeEpoch:4}),null);
 assert.equal(acceptWishlistResponse({...input,snapshot:{revision:7,ids:[]}}),null);
});
