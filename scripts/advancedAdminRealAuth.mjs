// Local Supabase Auth issues actual user JWTs. Never use hosted credentials.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const {API_URL,ANON_KEY,SERVICE_ROLE_KEY}=process.env;
assert.ok(API_URL&&ANON_KEY&&SERVICE_ROLE_KEY,'Local credentials required');
const url=new URL(API_URL);
assert.equal(url.protocol,'http:');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
assert.equal(url.port,'54321');
const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const service=createClient(API_URL,SERVICE_ROLE_KEY,opts);
const good=(r,label)=>{assert.equal(r.error,null,label);return r.data;};
async function user(tag,metadata={}){
 const email='advanced-'+tag+'-'+randomUUID()+'@example.test',password='Local!'+randomUUID();
 const {user}=good(await service.auth.admin.createUser({email,password,email_confirm:true,...metadata}),'Create local user');
 const {session}=good(await createClient(API_URL,ANON_KEY,opts).auth.signInWithPassword({email,password}),'Sign in local user');
 assert.equal(session.user.id,user.id);
 return {id:user.id,email,password,token:session.access_token};
}
async function rpc(name,token,params={}){
 const r=await fetch(API_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:ANON_KEY,Authorization:'Bearer '+(token||ANON_KEY),'Content-Type':'application/json'},body:JSON.stringify(params),signal:AbortSignal.timeout(10000)});
 return {status:r.status,data:await r.json()};
}
async function read(token){
 const r=await rpc('my_marketing_email_consent',token);
 assert.equal(r.status,200);return r.data;
}
const a=await user('a'),b=await user('b',{user_metadata:{role:'admin'},app_metadata:{role:'admin'}});
const denied=r=>assert.ok([401,403].includes(r.status),'Expected permission denial, got '+r.status);
denied(await rpc('my_marketing_email_consent',null));
if(process.argv.includes('--paused')){
 for(const t of [a.token,b.token,SERVICE_ROLE_KEY]){
  const blocked=r=>assert.ok([401,403,404].includes(r.status),'Expected paused RPC denial, got '+r.status);
  blocked(await rpc('my_marketing_email_consent',t));
  for(const opted of [true,false])blocked(await rpc('set_my_marketing_email_consent',t,{p_event:randomUUID(),p_opted_in:opted,p_policy_version:'email-marketing-v1',p_expected_event:null}));
 }
 console.log('PASS actual local Auth and service-role requests cannot read or collect paused consent');
 process.exit(0);
}
for(const t of [a.token,b.token]){
 denied(await rpc('admin_marketing_segments',t));
 denied(await rpc('admin_read_marketing_templates',t,{p_id:null}));
 denied(await rpc('admin_read_supplier_balance',t,{p_supplier:null}));
}
assert.equal((await read(a.token)).status,'not_set');
assert.equal((await read(b.token)).status,'not_set');
const event=randomUUID(),p={p_event:event,p_opted_in:true,p_policy_version:'email-marketing-v1',p_expected_event:null};
const first=await rpc('set_my_marketing_email_consent',a.token,p);
assert.equal(first.status,200);assert.equal(first.data.status,'opted_in');
assert.equal((await read(b.token)).status,'not_set');
const cross=await rpc('set_my_marketing_email_consent',b.token,p);
assert.equal(cross.status,400);assert.equal(cross.data.code,'22023');
assert.equal((await read(b.token)).status,'not_set');
const newEmail='advanced-changed-'+randomUUID()+'@example.test';
good(await service.auth.admin.updateUserById(a.id,{email:newEmail,email_confirm:true}),'Change confirmed local email');
const {session}=good(await createClient(API_URL,ANON_KEY,opts).auth.signInWithPassword({email:newEmail,password:a.password}),'Sign in changed local email');
const fresh=session.access_token;
assert.equal(session.user.id,a.id);
assert.equal((await read(fresh)).status,'reconfirmation_required');
const oldReplay=await rpc('set_my_marketing_email_consent',fresh,p);
assert.equal(oldReplay.status,200);assert.equal(oldReplay.data.idempotent_replay,true);assert.equal(oldReplay.data.status,'reconfirmation_required');
const w=randomUUID();
const withdrawn=await rpc('set_my_marketing_email_consent',fresh,{...p,p_event:w,p_opted_in:false});
assert.equal(withdrawn.status,200);assert.equal(withdrawn.data.status,'withdrawn');
const stale=await rpc('set_my_marketing_email_consent',fresh,{...p,p_event:randomUUID(),p_expected_event:event});
assert.equal(stale.status,409);assert.equal(stale.data.code,'PT409');
const renew=await rpc('set_my_marketing_email_consent',fresh,{...p,p_event:randomUUID(),p_expected_event:w});
assert.equal(renew.status,200);assert.equal(renew.data.status,'opted_in');
console.log('PASS actual local Supabase Auth: customer isolation, non-owner admin claims denied, email change, withdrawal, stale consent and explicit renewal');
