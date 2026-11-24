// Real local PostgREST HTTP boundary, synthetic identities and isolated DB only.
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
const secret=process.env.ADVANCED_HTTP_JWT_SECRET;
assert.ok(secret?.length>=32,'Missing ephemeral fixture JWT key');
const host='http://127.0.0.1:3300';
const owner='1060de3d-d28a-45f8-9a64-5e0368cffc4b',customer='10000000-0000-4000-8000-000000000001';
const now=Math.floor(Date.now()/1000);
const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
function token(sub,claims={},key=secret){
 const payload=b64({role:'authenticated',sub,exp:now+300,...claims});
 const body=b64({alg:'HS256',typ:'JWT'})+'.'+payload;
 return body+'.'+createHmac('sha256',key).update(body).digest('base64url');
}
const ownerToken=token(owner,{app_metadata:{role:'admin'}}),customerToken=token(customer),
 forgedRole=token(customer,{app_metadata:{role:'admin'},user_metadata:{role:'admin'}}),
 metadataOnly=token(owner,{user_metadata:{role:'admin'}}),
 wrongSignature=token(owner,{app_metadata:{role:'admin'}},'invalid-fixture-signature-key-not-the-real-key'),
 expired=token(owner,{app_metadata:{role:'admin'},exp:now-120});
async function call(path,t,body){
 const r=await fetch(host+path,{method:body===undefined?'GET':'POST',headers:{...(t?{Authorization:'Bearer '+t}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
 const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{data=raw;}
 return {status:r.status,data};
}
async function ok(path,t,body){
 const r=await call(path,t,body);assert.ok(r.status>=200&&r.status<300,path+' unexpected '+r.status+' '+JSON.stringify(r.data));return r.data;
}
async function denied(path,t,body){
 const r=await call(path,t,body);assert.ok([401,403,404].includes(r.status),path+' expected denial, got '+r.status);
}
for(let i=0;i<40;i++){
 try{const r=await fetch(host+'/',{signal:AbortSignal.timeout(1000)});if(r.ok)break;}catch{}
 if(i===39)throw Error('Local PostgREST unavailable');
 await new Promise(r=>setTimeout(r,500));
}
const rpc=(name,t,body={})=>ok('/rpc/'+name,t,body);
const denyRpc=(name,t,body={})=>denied('/rpc/'+name,t,body);
const segments=await rpc('admin_marketing_segments',ownerToken);
assert.equal(segments.segments.all.consent_candidates,'1');
for(const t of [null,customerToken,forgedRole,metadataOnly,wrongSignature,expired])await denyRpc('admin_marketing_segments',t);
const balance=await rpc('admin_read_supplier_balance',ownerToken,{p_supplier:null});
assert.equal(balance.purchase_count,'0');
await denyRpc('admin_read_supplier_balance',customerToken,{p_supplier:null});
await denied('/admin_suppliers?select=id',null);
assert.deepEqual(await ok('/admin_suppliers?select=id',customerToken),[]);
await ok('/admin_suppliers',ownerToken,{name:'HTTP fixture supplier',commission:5,is_active:true});
assert.equal((await ok('/admin_suppliers?select=id,name',ownerToken)).length,1);
assert.deepEqual(await ok('/admin_suppliers?select=id',customerToken),[]);
await denied('/admin_suppliers',customerToken,{name:'Forbidden fixture supplier',commission:5,is_active:true});
await denyRpc('my_marketing_email_consent',null);
const consent=await rpc('my_marketing_email_consent',customerToken);
assert.equal(consent.status,'opted_in');
const w=randomUUID();
const withdrawn=await rpc('set_my_marketing_email_consent',customerToken,{p_event:w,p_opted_in:false,p_policy_version:'email-marketing-v1',p_expected_event:null});
assert.equal(withdrawn.status,'withdrawn');
assert.equal(withdrawn.acknowledged_event_id,w);
const stale=await call('/rpc/set_my_marketing_email_consent',customerToken,{p_event:randomUUID(),p_opted_in:true,p_policy_version:'email-marketing-v1',p_expected_event:consent.event_id});
assert.equal(stale.data?.code,'40001');
assert.equal((await rpc('my_marketing_email_consent',customerToken)).status,'withdrawn');
assert.equal((await rpc('admin_marketing_segments',ownerToken)).segments.all.consent_candidates,'0');
const renewed=await rpc('set_my_marketing_email_consent',customerToken,{p_event:randomUUID(),p_opted_in:true,p_policy_version:'email-marketing-v1',p_expected_event:w});
assert.equal(renewed.status,'opted_in');
const campaign=randomUUID(),request=randomUUID();
const params={p_id:campaign,p_request:request,p_revision:'0',p_operation:'create',p_name:'HTTP campaign',p_segment:'all',p_subject:'Offer',p_body:'Fixture text',p_planned_at:null};
await denyRpc('admin_save_marketing_campaign',forgedRole,params);
const saved=await rpc('admin_save_marketing_campaign',ownerToken,params);
assert.equal(saved.id,campaign);
assert.equal(saved.revision,'1');
const checkId=randomUUID();
const checked=await rpc('admin_check_marketing_campaign',ownerToken,{p_id:campaign,p_revision:'1',p_request:checkId});
assert.equal(checked.delivery_enabled,false);
assert.equal(checked.is_send_authorization,false);
const history=await rpc('admin_read_marketing_preflights',ownerToken,{p_id:campaign,p_request:checkId});
assert.equal(history.checks[0].request_id,checkId);
assert.equal(history.delivery_enabled,false);
await denyRpc('admin_read_marketing_preflights',customerToken,{p_id:campaign,p_request:checkId});
await denied('/marketing_email_consent_events?select=*',ownerToken);
await denied('/marketing_campaigns?select=*',ownerToken);
console.log('PASS local signed JWT / PostgREST boundary: owner/customer/anon, invalid claims and signature, stale consent, blocked campaign, private tables');
