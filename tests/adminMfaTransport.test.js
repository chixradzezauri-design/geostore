import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAdminMfa,createAdminMfaTransport} from '../src/utils/adminMfaTransport.js';
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',F='00000000-0000-4000-8000-000000000003',C='00000000-0000-4000-8000-000000000004';
function fixture(){
 const ctx={ownerId:A,epoch:1,adminEligible:true,authLoading:false},calls=[];
 const level={currentLevel:'aal1',nextLevel:'aal2'};
 const mfa={
  getAuthenticatorAssuranceLevel:async()=>({data:level}),
  listFactors:async()=>({data:{totp:[{id:F,status:'verified',friendly_name:'Device'},{id:B,status:'unverified'}]}}),
  enroll:async args=>{calls.push(['enroll',args]);return {data:{id:F,totp:{secret:'FIXTURE-ONLY'}}};},
  challenge:async args=>{calls.push(['challenge',args]);return {data:{id:C}};},
  verify:async args=>{calls.push(['verify',args]);return {data:{}};}
 };
 const options={enabled:true,client:{auth:{getUser:async()=>({data:{user:{id:A}}}),mfa}},getContext:()=>ctx,runAuthExclusive:fn=>fn()};
 return {ctx,level,calls,mfa,options,transport:createAdminMfaTransport(options)};
}
test('assurance classification fails closed on unknown or downgraded session',()=>{
 assert.equal(classifyAdminMfa({currentLevel:'aal1',nextLevel:'aal1'}),'enrollment-required');
 assert.equal(classifyAdminMfa({currentLevel:'aal1',nextLevel:'aal2'}),'challenge-required');
 assert.equal(classifyAdminMfa({currentLevel:'aal2',nextLevel:'aal2'}),'verified');
 assert.equal(classifyAdminMfa({currentLevel:'aal2',nextLevel:'aal1'}),'refresh-required');
 assert.equal(classifyAdminMfa(null),'blocked');
});
test('disabled or missing shared auth coordinator never initiates MFA',async()=>{
 const f=fixture();
 assert.equal((await createAdminMfaTransport({...f.options,enabled:false}).inspect()).status,'disabled');
 assert.equal((await createAdminMfaTransport({...f.options,runAuthExclusive:null}).inspect()).status,'blocked');
 f.ctx.adminEligible=false;assert.equal((await f.transport.inspect()).status,'inactive');assert.equal(f.calls.length,0);
});
test('inspect lists verified factors only; wrong owner is rejected',async()=>{
 const f=fixture();
 assert.deepEqual(await f.transport.inspect(),{status:'challenge-required',factors:[{id:F,label:'Device'}]});
 f.ctx.ownerId=B;assert.equal((await f.transport.inspect()).status,'inactive');
});
test('challenge uses verified factor and six digit code; no direct privilege grant',async()=>{
 const f=fixture();
 assert.equal((await f.transport.verify(B,'123456')).status,'invalid');
 assert.equal((await f.transport.verify(F,'12345')).status,'invalid');
 assert.equal(f.calls.length,0);
 assert.deepEqual(await f.transport.verify(F,'012345'),{status:'recheck-required'});
 assert.deepEqual(f.calls,[['challenge',{factorId:F}],['verify',{factorId:F,challengeId:C,code:'012345'}]]);
});
test('enrollment secret only returned once, new factor verified by same account',async()=>{
 const f=fixture();f.level.nextLevel='aal1';
 const e=await f.transport.beginEnrollment();
 assert.equal(e.status,'enrollment-pending');assert.equal(e.secret,'FIXTURE-ONLY');
 assert.deepEqual(await f.transport.beginEnrollment(),{status:'enrollment-pending'});
 assert.equal((await f.transport.verify(F,'123456')).status,'recheck-required');
});
test('account switch during challenge prevents verification',async()=>{
 const f=fixture();let finish;
 f.mfa.challenge=()=>new Promise(r=>{finish=r;});
 const pending=f.transport.verify(F,'123456');
 while(!finish)await Promise.resolve();
 f.ctx.ownerId=B;finish({data:{id:C}});
 assert.deepEqual(await pending,{status:'inactive'});
 assert.equal(f.calls.length,0);
});
test('failed OTP cannot grant access',async()=>{
 const f=fixture();f.mfa.verify=async()=>({error:{message:'invalid code'}});
 assert.deepEqual(await f.transport.verify(F,'123456'),{status:'verification-failed'});
});
