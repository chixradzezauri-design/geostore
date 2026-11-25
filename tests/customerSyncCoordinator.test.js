import test from 'node:test';
import assert from 'node:assert/strict';
import {createCustomerSyncCoordinator} from '../src/utils/customerSyncCoordinator.js';
import {createCustomerSyncTransport} from '../src/utils/customerSyncTransport.js';
import {readPendingSync} from '../src/utils/customerSyncJournal.js';
import {getCustomerSyncStatus} from '../src/utils/customerSyncStatus.js';
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
const base={revision:2,ids:['p1']},intent={productId:'p2',present:true};
function fixture(){
 const map=new Map(),held=new Set(),ctx={ownerId:A,epoch:1,authLoading:false,snapshot:base};
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const locks={request:async(key,opts,fn)=>{
  assert.deepEqual(opts,{mode:'exclusive',ifAvailable:true});
  if(held.has(key))return fn(null);
  held.add(key);try{return await fn({name:key});}finally{held.delete(key);}
 }};
 let online=true,calls=[],remote=base;
 const client={rpc:async(name,args)=>{
  calls.push([name,args]);
  if(name==='customer_wishlist_read')return {data:remote};
  remote={revision:3,ids:['p1','p2']};
  return {data:{status:'changed',snapshot:remote}};
 }};
 const getContext=()=>ctx;
 const transport=createCustomerSyncTransport({client,enabled:true,getContext});
 const options={enabled:true,locks,storage,transport,getContext,isOnline:()=>online};
 return {ctx,storage,locks,calls,options,client,setOnline:v=>online=v,setRemote:v=>remote=v,coordinator:createCustomerSyncCoordinator(options)};
}
test('disabled or unsupported browser never touches journal or network',async()=>{
 const f=fixture();
 assert.equal((await createCustomerSyncCoordinator({...f.options,enabled:false}).enqueue('wishlist',base,intent)).status,'disabled');
 assert.equal((await createCustomerSyncCoordinator({...f.options,locks:null}).enqueue('wishlist',base,intent)).status,'unsupported');
 assert.equal(readPendingSync(f.storage,A,'wishlist').status,'empty');assert.equal(f.calls.length,0);
});
test('offline intent is durable and exact-base reconnect uses original revision',async()=>{
 const f=fixture();f.setOnline(false);
 assert.equal((await f.coordinator.enqueue('wishlist',base,intent)).status,'offline');
 assert.equal((await f.coordinator.reconnect('wishlist')).status,'offline');assert.equal(f.calls.length,0);
 f.setOnline(true);
 assert.equal((await f.coordinator.reconnect('wishlist')).status,'changed');
 assert.equal(f.calls[1][1].p_expected_revision,2);
 assert.equal(readPendingSync(f.storage,A,'wishlist').status,'empty');
});
test('cross-tab lock stops concurrent write and preserves pending intent',async()=>{
 const f=fixture();await f.coordinator.enqueue('wishlist',base,intent);
 let finish;const transport={...f.options.transport,readWishlist:()=>new Promise(r=>{finish=r;})};
 const one=createCustomerSyncCoordinator({...f.options,transport});
 const pending=one.reconnect('wishlist');
 assert.equal((await f.coordinator.enqueue('wishlist',base,intent)).status,'busy');
 finish({status:'ready',snapshot:base,ownerId:A,epoch:1});
 assert.equal((await pending).status,'changed');
});
test('changed remote snapshot requires review, never silently rebases',async()=>{
 const f=fixture();await f.coordinator.enqueue('wishlist',base,intent);
 f.setRemote({revision:3,ids:[]});
 assert.equal((await f.coordinator.reconnect('wishlist')).status,'review');
 assert.equal(f.calls.length,1);
 assert.equal(readPendingSync(f.storage,A,'wishlist').status,'pending');
});
test('transport guard refuses newer UI base even after reconnect read',async()=>{
 const f=fixture();await f.coordinator.enqueue('wishlist',base,intent);
 f.ctx.snapshot={revision:3,ids:['p1','p3']};
 // Mock the read delivery just before UI advanced; the real mutation guard still runs.
 const c=createCustomerSyncCoordinator({...f.options,transport:{...f.options.transport,readWishlist:async()=>({status:'ready',snapshot:base,ownerId:A,epoch:1})}});
 assert.equal((await c.reconnect('wishlist')).status,'review');
 assert.equal(f.calls.length,0);assert.equal(readPendingSync(f.storage,A,'wishlist').entry.state,'uncertain');
});
test('switching accounts during RPC never clears the original pending journal',async()=>{
 const f=fixture();await f.coordinator.enqueue('wishlist',base,intent);
 let finish;const transport={...f.options.transport,readWishlist:()=>new Promise(r=>{finish=r;})};
 const c=createCustomerSyncCoordinator({...f.options,transport});
 const pending=c.reconnect('wishlist');f.ctx.ownerId=B;
 finish({status:'ready',snapshot:base,ownerId:A,epoch:1});
 assert.equal((await pending).status,'inactive');
 assert.equal(readPendingSync(f.storage,A,'wishlist').status,'pending');
 assert.equal(readPendingSync(f.storage,B,'wishlist').status,'empty');
});
test('status copy is localized and unknown failures never claim success',()=>{
 assert.equal(getCustomerSyncStatus('conflict','en').attention,true);
 assert.equal(getCustomerSyncStatus('offline','ka').attention,false);
 assert.equal(getCustomerSyncStatus('bogus','ru').attention,true);
});
