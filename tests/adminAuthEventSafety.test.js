import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeferredAuthResolution,advanceMfaScope,isMfaScopeCurrent} from '../src/utils/adminAuthEventSafety.js';
test('auth resolution is a separate task; only latest pending event executes',()=>{
 const tasks=[];const seen=[];
 const d=createDeferredAuthResolution({scheduleTask:fn=>{tasks.push(fn);return tasks.length;},cancelTask:()=>{}});
 d.schedule(()=>seen.push('old'));d.schedule(()=>seen.push('new'));
 assert.deepEqual(seen,[]);tasks[0]();tasks[1]();assert.deepEqual(seen,['new']);
 d.schedule(()=>seen.push('signed out'));d.cancel();tasks[2]();assert.deepEqual(seen,['new']);
});
test('recovery remains blocked across user updates and token refresh',()=>{
 let scope=advanceMfaScope({epoch:0},'owner','PASSWORD_RECOVERY');
 for(const event of ['USER_UPDATED','TOKEN_REFRESHED','SIGNED_IN']){
  assert.equal(scope.recovery,true);assert.equal(isMfaScopeCurrent(scope,scope),false);
  scope=advanceMfaScope(scope,'owner',event);
 }
 scope=advanceMfaScope(scope,null,'SIGNED_OUT');scope=advanceMfaScope(scope,'owner','SIGNED_IN');
 assert.equal(scope.recovery,false);assert.equal(isMfaScopeCurrent(scope,scope),true);
});
test('same owner with rotated epoch and other account cannot accept old result',()=>{
 const old=advanceMfaScope({epoch:0},'owner','SIGNED_IN');
 assert.equal(isMfaScopeCurrent(old,advanceMfaScope(old,'owner','TOKEN_REFRESHED')),false);
 assert.equal(isMfaScopeCurrent(old,advanceMfaScope(old,'other','SIGNED_IN')),false);
 assert.equal(isMfaScopeCurrent(old,advanceMfaScope(old,null,'SIGNED_OUT')),false);
});
