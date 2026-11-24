import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketingApi,verifyConsent,verifySegments,MARKETING_POLICY,segmentKeys} from '../src/utils/marketingConsentApi.js';
const id='10000000-0000-4000-8000-000000000001',event='20000000-0000-4000-8000-000000000001',owner='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
const base={status:'not_set',policy_version:MARKETING_POLICY,event_id:null,recorded_at:null,can_opt_in:true};
const withdrawn={...base,status:'withdrawn',event_id:event,recorded_at:'2026-11-24T12:00:00Z'};
test('consent state is explicit, never assumes opt-in',()=>{assert.equal(verifyConsent(base),base);assert.throws(()=>verifyConsent({...base,status:'opted_in'}));assert.throws(()=>verifyConsent({...withdrawn,status:'opted_in',can_opt_in:false}));});
const segments=Object.fromEntries(segmentKeys.map(k=>[k,{accounts:'0',consent_candidates:'0'}]));
const data={as_of:'2026-11-24T12:00:00Z',timezone:'Asia/Tbilisi',new_days:30,inactive_days:90,segments:{...segments,all:{accounts:'2',consent_candidates:'1'},no_purchase:{accounts:'1',consent_candidates:'1'},repeat:{accounts:'1',consent_candidates:'0'}}};
test('segment scope and exact partition counts validated',()=>{assert.equal(verifySegments(data),data);assert.throws(()=>verifySegments({...data,segments:{...data.segments,vip:{accounts:'1',consent_candidates:'2'}}}));assert.throws(()=>verifySegments({...data,segments:{...data.segments,repeat:{accounts:'0',consent_candidates:'0'}}}));});
const cfg=(who,fetchImpl,role)=>({expectedUserId:who,loadSession:async()=>({data:{session:{user:{id:who,app_metadata:{role}},access_token:'fixture'}}}),supabaseUrl:'https://fixture.invalid',apiKey:'fixture',fetchImpl});
test('customer withdrawal binds authenticated identity and exact event; owner aggregate protected',async()=>{
 let calls=0;const api=createMarketingApi(cfg(id,async(url,opts)=>{calls++;assert.match(url,/set_my_marketing_email_consent$/);assert.deepEqual(JSON.parse(opts.body),{p_event:event,p_opted_in:false,p_policy_version:MARKETING_POLICY,p_expected_event:null});return {ok:true,json:async()=>({...withdrawn,acknowledged_event_id:event,idempotent_replay:false})};}));
 assert.equal((await api.setConsent(event,false,null)).status,'withdrawn');await assert.rejects(api.segments());assert.equal(calls,1);
 const admin=createMarketingApi(cfg(owner,async()=>({ok:true,json:async()=>data}),'admin'));assert.equal(await admin.segments(),data);
 await assert.rejects(createMarketingApi({...cfg(id,async()=>{throw Error('unexpected network');}),expectedUserId:owner}).readConsent());
});

test('new opt-in requires explicit last observed event; withdrawal needs no version',async()=>{let calls=0;const api=createMarketingApi(cfg(id,async(url,opts)=>{calls++;const body=JSON.parse(opts.body);assert.equal(body.p_expected_event,event);assert.equal(body.p_opted_in,true);return {ok:true,json:async()=>({...withdrawn,status:'opted_in',acknowledged_event_id:event,idempotent_replay:false})};}));await assert.rejects(api.setConsent(event,true));await assert.rejects(api.setConsent(event,false,event));assert.equal((await api.setConsent(event,true,event)).status,'opted_in');assert.equal(calls,1);});


test('consent revision conflict requires exact HTTP and SQL code and never retries',async()=>{for(const [status,body,conflict] of [[409,{code:'PT409'},true],[409,{code:'23505'},false],[500,{code:'PT409'},false],[409,null,false]]){let calls=0;const api=createMarketingApi(cfg(id,async()=>{calls++;return {ok:false,status,json:async()=>body};}));await assert.rejects(api.setConsent(event,true,null),err=>(err.code==='PT409')===conflict);assert.equal(calls,1);}});
