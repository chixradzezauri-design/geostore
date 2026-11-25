import test from 'node:test';
import assert from 'node:assert/strict';
import {ADMIN_MFA_ROLLOUT_ENABLED,createAdminAuthCoordinator} from '../src/utils/adminAuthCoordinator.js';
test('staged flag remains disabled and missing Web Locks fails closed',async()=>{
 assert.equal(ADMIN_MFA_ROLLOUT_ENABLED,false);
 await assert.rejects(createAdminAuthCoordinator()(()=>true),/coordination unavailable/);
});
test('exclusive auth actions serialize and release after a failure',async()=>{
 let tail=Promise.resolve();const events=[];
 const locks={request(name,options,fn){assert.equal(name,'geostore:admin-auth:v1');assert.equal(options.mode,'exclusive');const next=tail.then(fn);tail=next.catch(()=>{});return next;}};
 const run=createAdminAuthCoordinator({locks});
 let finish;const first=run(async()=>{events.push('start');await new Promise(r=>{finish=r;});events.push('end');throw Error('fixture');});
 const second=run(async()=>{events.push('second');return true;});
 while(!finish)await Promise.resolve();
 assert.deepEqual(events,['start']);finish();await assert.rejects(first,/fixture/);assert.equal(await second,true);assert.deepEqual(events,['start','end','second']);
});
