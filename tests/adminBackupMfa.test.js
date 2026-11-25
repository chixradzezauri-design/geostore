import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminBackupMfa} from '../src/utils/adminBackupMfa.js';
import {OWNER_ADMIN_ACCESS} from '../src/utils/adminAccess.js';
const owner='1060de3d-d28a-45f8-9a64-5e0368cffc4b',primary='00000000-0000-4000-8000-000000000001',backup='00000000-0000-4000-8000-000000000002',challenge='00000000-0000-4000-8000-000000000003';
function fixture(){
 const ctx={ownerId:owner,epoch:1,adminEligible:true,authLoading:false},calls=[];
 const factors=[{id:primary,status:'verified',friendly_name:'Primary'}];
 const mfa={getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2',nextLevel:'aal2'}}),listFactors:async()=>({data:{all:factors,totp:factors.filter(f=>f.status==='verified')}}),
 enroll:async()=>{calls.push('enroll');factors.push({id:backup,status:'unverified'});return {data:{id:backup,totp:{secret:'ABCDEFGHIJKLMNOP'}}};},
 challenge:async({factorId})=>{calls.push(factorId);return {data:{id:challenge}};},verify:async()=>{calls.push('verify');factors[1].status='verified';return {data:{}};}};
 const opts={enabled:true,client:{auth:{getUser:async()=>({data:{user:{id:owner,app_metadata:{role:'admin'}}}}),mfa},rpc:async()=>({data:OWNER_ADMIN_ACCESS})},getContext:()=>ctx,runAuthExclusive:fn=>fn()};
 return {ctx,calls,factors,mfa,opts,transport:createAdminBackupMfa(opts)};
}
test('AAL2 and effective server role are required before adding a factor',async()=>{const f=fixture();f.mfa.getAuthenticatorAssuranceLevel=async()=>({data:{currentLevel:'aal1',nextLevel:'aal2'}});assert.equal((await f.transport.begin()).status,'blocked');assert.deepEqual(f.calls,[]);});
test('existing device retained; new device must verify and appear in fresh list',async()=>{const f=fixture();assert.equal((await f.transport.begin()).status,'setup');assert.equal((await f.transport.begin()).status,'unfinished');const r=await f.transport.verify('012345');assert.equal(r.status,'ready');assert.deepEqual(r.verified.map(x=>x.id),[primary,backup]);assert.deepEqual(f.calls,['enroll',backup,'verify']);});
test('existing unverified enrollment blocks duplicate creation',async()=>{const f=fixture();f.factors.push({id:backup,status:'unverified'});assert.equal((await f.transport.begin()).status,'unfinished');assert.deepEqual(f.calls,[]);});
test('account epoch change prevents pending factor verification',async()=>{const f=fixture();await f.transport.begin();f.ctx.epoch++;assert.equal((await f.transport.verify('123456')).status,'invalid');assert.deepEqual(f.calls,['enroll']);});
test('disabled, missing privilege or no existing verified factor never enrolls',async()=>{const f=fixture();assert.equal((await createAdminBackupMfa({...f.opts,enabled:false}).begin()).status,'disabled');f.opts.client.rpc=async()=>({data:{is_admin:false,is_staff:false}});assert.equal((await f.transport.begin()).status,'blocked');assert.deepEqual(f.calls,[]);});
