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
assert.equal(stale.status,409);
assert.equal(stale.data?.code,'PT409');
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
const edit=await rpc('admin_save_marketing_campaign',ownerToken,{...params,p_request:randomUUID(),p_revision:'1',p_operation:'edit',p_name:'HTTP campaign updated'});
assert.equal(edit.revision,'2');
const staleEdit=await call('/rpc/admin_save_marketing_campaign',ownerToken,{...params,p_request:randomUUID(),p_revision:'1',p_operation:'edit'});
assert.equal(staleEdit.status,409);assert.equal(staleEdit.data?.code,'PT409');
const staleCheck=await call('/rpc/admin_check_marketing_campaign',ownerToken,{p_id:campaign,p_revision:'1',p_request:randomUUID()});
assert.equal(staleCheck.status,409);assert.equal(staleCheck.data?.code,'PT409');
assert.equal((await rpc('admin_read_marketing_preflights',ownerToken,{p_id:campaign,p_request:checkId})).current_revision,'2');
await denyRpc('admin_read_marketing_preflights',customerToken,{p_id:campaign,p_request:checkId});
await denied('/marketing_email_consent_events?select=*',ownerToken);
await denied('/marketing_campaigns?select=*',ownerToken);
console.log('PASS local signed JWT / PostgREST boundary: owner/customer/anon, invalid claims and signature, stale consent, blocked campaign, private tables');

// Real HTTP purchase, receipt, payment and correction lifecycle.
const supplier=(await ok('/admin_suppliers?select=id,name',ownerToken))[0].id;
const po=randomUUID();
const create={p_id:po,p_supplier:supplier,p_lines:[{product_id:'http-base',quantity:5,unit_cost:4.25}]};
for(const t of [null,customerToken,forgedRole,metadataOnly])await denyRpc('admin_create_purchase',t,create);
const draft=await rpc('admin_create_purchase',ownerToken,create);
assert.equal(draft.status,'draft');assert.equal(draft.revision,1);
const lines=await ok('/admin_purchase_lines?select=id&purchase_id=eq.'+po,ownerToken);
assert.equal(lines.length,1);
assert.deepEqual(await ok('/admin_purchase_lines?select=id&purchase_id=eq.'+po,customerToken),[]);
assert.deepEqual(await ok('/admin_purchase_orders?select=id&id=eq.'+po,customerToken),[]);
const transition={p_id:po,p_revision:1,p_action:'approve'};
await denyRpc('admin_transition_purchase',customerToken,transition);
const approved=await rpc('admin_transition_purchase',ownerToken,transition);
assert.equal(approved.status,'approved');assert.equal(approved.revision,2);
async function conflict(name,params){
 const r=await call('/rpc/'+name,ownerToken,params);
 assert.equal(r.status,409,name+' status');assert.equal(r.data?.code,'PT409',name+' code');
}
await conflict('admin_transition_purchase',{...transition,p_action:'cancel'});
const receipt={p_id:po,p_line:lines[0].id,p_receipt:randomUUID(),p_revision:2,p_quantity:2};
await denyRpc('admin_receive_purchase',customerToken,receipt);
const received=await rpc('admin_receive_purchase',ownerToken,receipt);
assert.equal(received.stock_before,10);assert.equal(received.stock_after,12);
assert.equal(received.idempotent_replay,false);
assert.equal((await rpc('admin_receive_purchase',ownerToken,receipt)).idempotent_replay,true);
await conflict('admin_receive_purchase',{...receipt,p_receipt:randomUUID()});
const payment={p_id:po,p_payment:randomUUID(),p_revision:3,p_amount_tetri:'300',p_method:'cash',p_reference:'http-payment-001'};
await denyRpc('admin_record_purchase_payment',forgedRole,payment);
assert.equal((await rpc('admin_record_purchase_payment',ownerToken,payment)).idempotent_replay,false);
assert.equal((await rpc('admin_record_purchase_payment',ownerToken,payment)).idempotent_replay,true);
await conflict('admin_record_purchase_payment',{...payment,p_payment:randomUUID(),p_reference:'http-payment-stale'});
const read=()=>rpc('admin_read_purchase_payments',ownerToken,{p_id:po});
const paid=await read();
assert.equal(paid.received_tetri,'850');assert.equal(paid.paid_tetri,'300');assert.equal(paid.balance_tetri,'550');assert.equal(paid.payment_count,'1');assert.equal(paid.revision,'4');
await denyRpc('admin_read_purchase_payments',customerToken,{p_id:po});
const correction={p_id:po,p_payment:payment.p_payment,p_correction:randomUUID(),p_revision:4,p_reason:'Fixture duplicate entry'};
await denyRpc('admin_correct_purchase_payment',customerToken,correction);
await conflict('admin_correct_purchase_payment',{...correction,p_revision:3});
assert.equal((await rpc('admin_correct_purchase_payment',ownerToken,correction)).idempotent_replay,false);
assert.equal((await rpc('admin_correct_purchase_payment',ownerToken,correction)).idempotent_replay,true);
const corrected=await read();
assert.equal(corrected.paid_tetri,'0');assert.equal(corrected.balance_tetri,'850');assert.equal(corrected.payment_count,'1');assert.equal(corrected.correction_count,'1');assert.equal(corrected.revision,'5');
assert.equal(corrected.payments[0].correction.id,correction.p_correction);
const finalBalance=await rpc('admin_read_supplier_balance',ownerToken,{p_supplier:supplier});
assert.equal(finalBalance.purchase_count,'1');assert.equal(finalBalance.balance_tetri,'850');
assert.equal((await ok('/admin_purchase_receipts?select=id&purchase_id=eq.'+po,ownerToken)).length,1);
assert.deepEqual(await ok('/admin_purchase_receipts?select=id&purchase_id=eq.'+po,customerToken),[]);
console.log('PASS signed HTTP purchase lifecycle: access, stale conflicts, receipt/payment/correction replay and exact balance');

// Template lifecycle and concurrent edits over the real HTTP boundary.
const template=randomUUID();
const templateFields={name:'HTTP reusable template',category:'promotion',segment:'all',subject:'Offer',body:'Fixture plain text'};
const templateCreate={p_id:template,p_request:randomUUID(),p_revision:'0',p_operation:'create',p_fields:templateFields};
for(const t of [null,customerToken,forgedRole,metadataOnly,wrongSignature,expired]){
 await denyRpc('admin_save_marketing_template',t,templateCreate);
 await denyRpc('admin_read_marketing_templates',t,{p_id:template});
}
const templateSave=p=>rpc('admin_save_marketing_template',ownerToken,p);
const templateRead=()=>rpc('admin_read_marketing_templates',ownerToken,{p_id:template});
const firstTemplate=await templateSave(templateCreate);
assert.equal(firstTemplate.id,template);assert.equal(firstTemplate.revision,'1');
assert.equal(firstTemplate.idempotent_replay,false);
assert.equal((await templateSave(templateCreate)).idempotent_replay,true);
const invalidTemplate=await call('/rpc/admin_save_marketing_template',ownerToken,{...templateCreate,p_fields:{...templateFields,body:'Changed replay'}});
assert.equal(invalidTemplate.status,400);assert.equal(invalidTemplate.data?.code,'22023');
const edits=['Concurrent A','Concurrent B'].map(subject=>({...templateCreate,p_request:randomUUID(),p_revision:'1',p_operation:'edit',p_fields:{...templateFields,subject}}));
const results=await Promise.all(edits.map(p=>call('/rpc/admin_save_marketing_template',ownerToken,p)));
assert.deepEqual(results.map(r=>r.status).sort((a,b)=>a-b),[200,409]);
const winner=results.findIndex(r=>r.status===200),loser=1-winner;
assert.equal(results[loser].data?.code,'PT409');
assert.equal(results[winner].data.revision,'2');
assert.equal(results[winner].data.request_id,edits[winner].p_request);
assert.equal((await templateSave(edits[winner])).idempotent_replay,true);
let currentTemplate=await templateRead();
assert.equal(currentTemplate.total,'1');assert.equal(currentTemplate.templates[0].revision,'2');
assert.equal(currentTemplate.templates[0].subject,edits[winner].p_fields.subject);
const archiveTemplate={p_id:template,p_request:randomUUID(),p_revision:'2',p_operation:'archive',p_fields:{}};
const archivedTemplate=await templateSave(archiveTemplate);
assert.equal(archivedTemplate.revision,'3');assert.equal(archivedTemplate.archived,true);
assert.equal((await templateSave(archiveTemplate)).idempotent_replay,true);
const afterArchive=await call('/rpc/admin_save_marketing_template',ownerToken,{...edits[winner],p_request:randomUUID(),p_revision:'3'});
assert.equal(afterArchive.status,400);assert.equal(afterArchive.data?.code,'22023');
currentTemplate=await templateRead();
assert.equal(currentTemplate.templates[0].revision,'3');assert.equal(currentTemplate.templates[0].archived,true);
assert.equal(currentTemplate.templates[0].subject,edits[winner].p_fields.subject);
// Old exact replay returns historical acknowledgement without reverting the current row.
assert.equal((await templateSave(templateCreate)).revision,'1');
assert.equal((await templateRead()).templates[0].revision,'3');
await denied('/marketing_template_versions?select=*',ownerToken);
const independentCampaign=await rpc('admin_read_marketing_campaigns',ownerToken,{p_id:campaign});
assert.equal(independentCampaign.campaigns[0].revision,'2');
assert.equal(independentCampaign.campaigns[0].subject,'Offer');
assert.equal(independentCampaign.delivery_enabled,false);
console.log('PASS signed HTTP template lifecycle: permissions, concurrent edit conflict, immutable archive, replay and campaign independence');

// Signed HTTP variant receipt with the actual product guard and aggregate trigger.
const variantOrder=randomUUID();
await rpc('admin_create_purchase',ownerToken,{p_id:variantOrder,p_supplier:supplier,p_lines:[{product_id:'http-variant',variant_id:'v',quantity:3,unit_cost:9}]});
const variantLines=await ok('/admin_purchase_lines?select=id,variant_id&purchase_id=eq.'+variantOrder,ownerToken);
assert.equal(variantLines.length,1);assert.equal(variantLines[0].variant_id,'v');
await rpc('admin_transition_purchase',ownerToken,{p_id:variantOrder,p_revision:1,p_action:'approve'});
const variantReceipt={p_id:variantOrder,p_line:variantLines[0].id,p_receipt:randomUUID(),p_revision:2,p_quantity:3};
const variantAck=await rpc('admin_receive_purchase',ownerToken,variantReceipt);
assert.equal(variantAck.stock_before,2);assert.equal(variantAck.stock_after,5);assert.equal(variantAck.idempotent_replay,false);
assert.equal((await rpc('admin_receive_purchase',ownerToken,variantReceipt)).idempotent_replay,true);
assert.equal((await rpc('admin_read_purchase_payments',ownerToken,{p_id:variantOrder})).received_tetri,'2700');
console.log('PASS signed variant receipt with real guard and aggregate trigger');
