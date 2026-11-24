import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requireProjectionReady} from '../scripts/stage90ProjectionReady.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Stage90 reproduces true pre-A then all reviewed SQL files in order in disposable CI',()=>{
 const code=read('scripts/stage90ReleaseSequence.mjs');
 const fixture=read('tests/stage78-supabase/stage90-pre-a-fixture.sql');
 const wf=read('.github/workflows/stage78-free-supabase-auth-postgrest.yml');
 assert.match(fixture,/TEST FIXTURE ONLY/);
 const manifest=JSON.parse(read('release/stage72-production-history-baseline.json'));
 let last=-1;
 for(const f of manifest.phasedSources){const next=code.indexOf(f.file);assert.ok(next>last);last=next;}
 for(const term of ['fetchVerifiedAdminOrderLedger','localhost','preserved()','idempotent_replay','Before A:','After B:'])assert.ok(code.includes(term),term);
 assert.match(wf,/stage90-pre-a-fixture.sql[\s\S]*stage90ReleaseSequence.mjs/);
});

test('Release readiness waits only for a missing schema-cache RPC then succeeds with a real array',async()=>{
 let calls=0,pauses=0;
 const data=await requireProjectionReady(async()=>++calls<3?{error:{code:'PGRST202'}}:{data:[{id:'synthetic'}],error:null},{attempts:3,pause:async()=>{pauses++}});
 assert.deepEqual(data,[{id:'synthetic'}]);assert.equal(calls,3);assert.equal(pauses,2);
});
test('Release readiness fails closed on timeout, access denial, network failure and invalid data',async()=>{
 let calls=0;
 await assert.rejects(requireProjectionReady(async()=>{calls++;return {error:{code:'PGRST202'}}},{attempts:2,pause:async()=>{}}),/not ready/);
 assert.equal(calls,2);
 calls=0;
 await assert.rejects(requireProjectionReady(async()=>{calls++;return {error:{code:'42501'}}},{pause:async()=>assert.fail('permission errors must not retry')}),/42501/);
 assert.equal(calls,1);
 await assert.rejects(requireProjectionReady(async()=>({data:{}})),/invalid response/);
 await assert.rejects(requireProjectionReady(async()=>{throw Error('network unavailable')}),/network unavailable/);
});
