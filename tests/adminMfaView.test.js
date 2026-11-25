import test from 'node:test';
import assert from 'node:assert/strict';
import {initialMfaView,normalizeMfaCode,reduceMfaResult} from '../src/utils/adminMfaView.js';
const scope={ownerId:'00000000-0000-4000-8000-000000000001',epoch:1},id='00000000-0000-4000-8000-000000000002';
const secret='ABCDEFGHIJKLMNOP';
test('OTP input preserves leading zeros and allows only six digits',()=>{assert.equal(normalizeMfaCode('0 123-4567'),'012345');});
test('only matching enrollment scope exposes temporary secret',()=>{
 const result={status:'enrollment-pending',factorId:id,secret,...scope};
 assert.equal(reduceMfaResult(initialMfaView(),result,scope).secret,secret);
 assert.equal(reduceMfaResult(initialMfaView(),result,{...scope,epoch:2}).secret,'');
 assert.equal(reduceMfaResult(initialMfaView(),{status:'enrollment-pending'},scope).stage,'blocked');
});
test('verified and inactive responses clear secret and never authorize access',()=>{
 const view={...initialMfaView(),stage:'enroll',factorId:id,secret};
 for(const status of ['verified','recheck-required','refresh-required','inactive','disabled']){
  const next=reduceMfaResult(view,{status},scope);assert.equal(next.secret,'');assert.equal(next.factorId,'');assert.equal(next.authorized,undefined);
 }
});
test('invalid code retains current challenge for manual retry',()=>{
 const view={...initialMfaView(),stage:'challenge',factorId:id};
 assert.deepEqual(reduceMfaResult(view,{status:'verification-failed'},scope),{...view,notice:'verification-failed'});
});
test('empty or invalid factor list fails closed',()=>{
 assert.equal(reduceMfaResult(initialMfaView(),{status:'challenge-required',factors:[{id:'bad'}]},scope).stage,'blocked');
 assert.equal(reduceMfaResult(initialMfaView(),{status:'challenge-required',factors:[{id,label:'Backup'}]},scope).factorId,id);
});
