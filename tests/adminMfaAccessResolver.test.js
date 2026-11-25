import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminMfaAccessResolver,normalizeMfaEffectiveAccess} from '../src/utils/adminMfaAccessResolver.js';
import {EMPTY_ADMIN_ACCESS,OWNER_ADMIN_ACCESS} from '../src/utils/adminAccess.js';
const owner={id:'1060de3d-d28a-45f8-9a64-5e0368cffc4b',app_metadata:{role:'admin'}};
const staff={id:'00000000-0000-4000-8000-000000000001'};
function fixture({user=owner,eligible=true,level={currentLevel:'aal1',nextLevel:'aal2'},payload=OWNER_ADMIN_ACCESS}={}){
 const context={ownerId:user.id,epoch:1,authLoading:false},calls=[];
 const client={auth:{getUser:async()=>({data:{user}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:level})}},rpc:async name=>{calls.push(name);return {data:name==='admin_mfa_eligible'?eligible:payload};}};
 const opts={enabled:true,client,getContext:()=>context,runAuthExclusive:fn=>fn()};
 return {context,calls,client,opts,resolve:createAdminMfaAccessResolver(opts)};
}
test('AAL1 eligibility never enables admin access',async()=>{
 const f=fixture();assert.deepEqual(await f.resolve(),{status:'challenge-required',eligible:true,access:EMPTY_ADMIN_ACCESS});assert.deepEqual(f.calls,['admin_mfa_eligible']);
});
test('owner requires actual server authorization after AAL2, not metadata alone',async()=>{
 const f=fixture({level:{currentLevel:'aal2',nextLevel:'aal2'},payload:EMPTY_ADMIN_ACCESS});
 assert.equal((await f.resolve()).status,'blocked');assert.equal(normalizeMfaEffectiveAccess(null,owner),EMPTY_ADMIN_ACCESS);
 const g=fixture({level:{currentLevel:'aal2',nextLevel:'aal2'}});assert.equal((await g.resolve()).access,OWNER_ADMIN_ACCESS);
});
test('noneligible customer never requests admin permissions',async()=>{
 const f=fixture({user:staff,eligible:false});assert.equal((await f.resolve()).status,'not-eligible');assert.deepEqual(f.calls,['admin_mfa_eligible']);
});
test('staff stays scoped even at AAL2',async()=>{
 const f=fixture({user:staff,level:{currentLevel:'aal2',nextLevel:'aal2'},payload:{is_admin:false,is_staff:true,role:'operator',permissions:{orders:true,expenses:'true'}}});
 const r=await f.resolve();assert.equal(r.status,'authorized');assert.equal(r.access.permissions.orders,true);assert.equal(r.access.permissions.expenses,false);assert.equal(normalizeMfaEffectiveAccess(OWNER_ADMIN_ACCESS,staff),EMPTY_ADMIN_ACCESS);
});
test('late effective access response after epoch change is discarded',async()=>{
 const f=fixture({level:{currentLevel:'aal2',nextLevel:'aal2'}});f.client.rpc=async name=>{if(name==='admin_mfa_eligible')return {data:true};f.context.epoch++;return {data:OWNER_ADMIN_ACCESS};};
 assert.equal((await f.resolve()).status,'inactive');
});
test('disabled and missing coordinator never contact backend',async()=>{
 const f=fixture();assert.equal((await createAdminMfaAccessResolver({...f.opts,enabled:false})()).status,'disabled');assert.equal((await createAdminMfaAccessResolver({...f.opts,runAuthExclusive:null})()).status,'blocked');assert.equal(f.calls.length,0);
});
