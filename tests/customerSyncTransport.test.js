import test from 'node:test';
import assert from 'node:assert/strict';
import {createCustomerSyncTransport} from '../src/utils/customerSyncTransport.js';
const A='00000000-0000-4000-8000-000000000001', B='00000000-0000-4000-8000-000000000002';
const fixture=(rpc,enabled=true)=>{
 const context={ownerId:A,epoch:1,authLoading:false,snapshot:{revision:2,ids:['p1']}};
 return {context,transport:createCustomerSyncTransport({enabled,client:{rpc},getContext:()=>context})};
};
test('disabled and unresolved auth perform zero network calls',async()=>{
 let calls=0;const rpc=()=>{calls++;};
 assert.deepEqual(await fixture(rpc,false).transport.readWishlist(),{status:'disabled'});
 const f=fixture(rpc);f.context.authLoading=true;
 assert.deepEqual(await f.transport.readWishlist(),{status:'inactive'});
 assert.equal(calls,0);
});
test('wishlist explicit membership sends only approved RPC arguments',async()=>{
 const f=fixture(async(name,args)=>{
  assert.equal(name,'customer_wishlist_change');
  assert.deepEqual(args,{p_expected_owner:A,p_expected_revision:2,p_product_id:'p2',p_present:true});
  return {data:{status:'changed',snapshot:{revision:3,ids:['p1','p2']}},error:null};
 });
 assert.deepEqual(await f.transport.changeWishlist({productId:'p2',present:true,secret:'do not send'}),{status:'changed',snapshot:{revision:3,ids:['p1','p2']},ownerId:A,epoch:1});
});
test('cart sends only normalized intent, no price or private metadata',async()=>{
 const line={productId:'p1',size:null,color:null,variantId:null,giftWrap:false,vipWarranty:false,quantity:2};
 const f=fixture(async(name,args)=>{
  assert.equal(name,'customer_cart_change');
  assert.deepEqual(args,{p_expected_owner:A,p_expected_revision:2,p_action:'set',p_line:line});
  return {data:{status:'accepted',snapshot:{revision:3,lines:[line]}},error:null};
 });
 f.context.snapshot={revision:2,lines:[]};
 assert.equal((await f.transport.changeCart({type:'set',line:{...line,price:1}})).status,'accepted');
});
test('account switch and same-account new epoch discard delayed responses',async()=>{
 let finish;const f=fixture(()=>new Promise(r=>{finish=r;}));
 const p=f.transport.readWishlist();f.context.ownerId=B;
 finish({data:{revision:3,ids:['p2']}});assert.deepEqual(await p,{status:'inactive'});
 f.context.ownerId=A;const q=f.transport.readWishlist();f.context.epoch++;
 finish({data:{revision:3,ids:['p2']}});assert.deepEqual(await q,{status:'inactive'});
});
test('network failure keeps state unchanged and does not retry',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;throw Error('offline');});
 assert.deepEqual(await f.transport.changeWishlist({productId:'p2',present:true}),{status:'uncertain'});
 assert.equal(calls,1);assert.deepEqual(f.context.snapshot,{revision:2,ids:['p1']});
});
test('conflict is surfaced once, no blind rebase; equal-revision mismatch is rejected',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return {data:{status:'conflict',snapshot:{revision:4,ids:[]}}};});
 assert.equal((await f.transport.changeWishlist({productId:'p2',present:true})).status,'conflict');
 assert.equal(calls,1);
 const g=fixture(async()=>({data:{revision:2,ids:['unexpected']}}));
 assert.equal((await g.transport.readWishlist()).status,'invalid-response');
});
test('concurrent requests blocked and stale snapshots rejected',async()=>{
 let finish;const f=fixture(()=>new Promise(r=>{finish=r;}));
 const p=f.transport.readWishlist();
 assert.deepEqual(await f.transport.readWishlist(),{status:'busy'});
 f.context.snapshot={revision:5,ids:['new']};
 finish({data:{revision:3,ids:[]}});assert.deepEqual(await p,{status:'stale'});
});
