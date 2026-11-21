import test from 'node:test';
import assert from 'node:assert/strict';
import { AdminOrderLedgerAccessError, getAuthenticatedAdminOrderHeaders, requireAdminOrderPermission, hasVerifiedAdminOrderLedgerRows } from '../src/utils/adminOrderLedgerSafety.js';

const session = (id='owner',token='token') => ({ data:{ session:{user:{id},access_token:token}},error:null });
test('order ledger authentication is pinned to mounted principal', async () => {
  const x=await getAuthenticatedAdminOrderHeaders({loadSession:async()=>session(),apiKey:'public',expectedUserId:'owner'});
  assert.equal(x.headers.Authorization,'Bearer token');
  for(const args of [
    {expectedUserId:null,loadSession:async()=>session()},
    {expectedUserId:'owner',loadSession:async()=>session('other')},
    {expectedUserId:'owner',loadSession:async()=>({data:{session:null}})},
    {expectedUserId:'owner',loadSession:async()=>session('owner','')}
  ]) await assert.rejects(getAuthenticatedAdminOrderHeaders({...args,apiKey:'public'}),err=>err instanceof AdminOrderLedgerAccessError);
});
test('same owner token rotation accepted, different user refused', async () => {
  assert.equal((await getAuthenticatedAdminOrderHeaders({loadSession:async()=>session('owner','rotated'),apiKey:'public',expectedUserId:'owner'})).headers.Authorization,'Bearer rotated');
  await assert.rejects(getAuthenticatedAdminOrderHeaders({loadSession:async()=>session('staff'),apiKey:'public',expectedUserId:'owner'}),err=>err instanceof AdminOrderLedgerAccessError);
});
test('live order permission RPC uses correct server permission', async () => {
  let call;
  const ok=await requireAdminOrderPermission({supabaseUrl:'https://db.supabase.co',headers:{Authorization:'Bearer token'},fetchImpl:async(url,options)=>{call={url,options};return {ok:true,json:async()=>true}}});
  assert.equal(ok,true);assert.match(call.url,/rpc\/has_staff_permission$/);assert.equal(call.options.method,'POST');assert.deepEqual(JSON.parse(call.options.body),{p_permission:'orders'});
});
test('RLS success but revoked or malformed permission never verifies zero orders', async () => {
  for(const denied of [false,null,[],{},1,'true']){
    await assert.rejects(requireAdminOrderPermission({supabaseUrl:'https://db.supabase.co',headers:{Authorization:'Bearer token'},fetchImpl:async()=>({ok:true,json:async()=>denied})}),err=>err instanceof AdminOrderLedgerAccessError);
  }
  await assert.rejects(requireAdminOrderPermission({supabaseUrl:'https://db.supabase.co',headers:{Authorization:'Bearer token'},fetchImpl:async()=>({ok:false,status:503})}),/HTTP 503/);
});
test('duplicate, missing or malformed order identities cannot verify complete ledger',()=>{
  assert.equal(hasVerifiedAdminOrderLedgerRows([]),true);
  assert.equal(hasVerifiedAdminOrderLedgerRows([{id:'a'},{id:'b'}]),true);
  assert.equal(hasVerifiedAdminOrderLedgerRows([{id:'a'},{id:'a'}]),false);
  assert.equal(hasVerifiedAdminOrderLedgerRows([{id:null}]),false);
  assert.equal(hasVerifiedAdminOrderLedgerRows([null]),false);
});
