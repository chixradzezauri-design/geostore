// Stage89: real signed Auth + live-source support RPCs; local synthetic data only.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
const {API_URL,ANON_KEY,SERVICE_ROLE_KEY}=process.env;
assert.ok(API_URL&&ANON_KEY&&SERVICE_ROLE_KEY);
const url=new URL(API_URL);
assert.equal(url.protocol,'http:');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname),'Local disposable Supabase only');
const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const service=createClient(API_URL,SERVICE_ROLE_KEY,opts);
const guest=createClient(API_URL,ANON_KEY,opts);
const signed=token=>createClient(API_URL,ANON_KEY,{...opts,global:{headers:{Authorization:'Bearer '+token}}});
let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++};
const good=(r,m)=>{assert.equal(r.error,null,m+': '+(r.error?.message||''));checks++;return r.data};
const denied=(r,m)=>ok(r.error?.code==='42501',m+' '+JSON.stringify(r.error));
const sql=q=>execFileSync('psql',['-h','127.0.0.1','-p','54322','-U','postgres','-d','postgres','-X','-At','-v','ON_ERROR_STOP=1','-c',q],{encoding:'utf8',timeout:30000,env:{...process.env,PGPASSWORD:'postgres'}}).trim();
const manifest=JSON.parse(readFileSync(new URL('../release/stage89-support-rpc-fingerprints.json',import.meta.url),'utf8'));
const actual=JSON.parse(sql("SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'signature',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')','md5',md5(pg_get_functiondef(p.oid)),'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'auth',has_function_privilege('authenticated',p.oid,'EXECUTE')) ORDER BY n.nspname,p.proname)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.proname IN ('get_support_ticket_messages','get_support_ticket_status','mark_support_ticket_messages_read','add_support_ticket_message_idempotent','get_my_support_tickets_page')"));
ok(actual.length===10,'All ten Production support function definitions installed');
for(const f of manifest){
 const observed=actual.find(x=>x.signature===f.signature);
 assert.deepEqual(observed,f,'Live-source function or EXECUTE grant mismatch: '+f.signature);checks++;
}
async function user(tag){
 const email='stage89-'+tag+'-'+randomUUID()+'@example.test',password='Ci-Stage89!'+randomUUID();
 const created=good(await service.auth.admin.createUser({email,password,email_confirm:true}),'Create synthetic '+tag);
 const login=good(await createClient(API_URL,ANON_KEY,opts).auth.signInWithPassword({email,password}),'Sign in '+tag);
 return {id:created.user.id,email,api:signed(login.session.access_token)};
}
const [owner,other,staff]=await Promise.all(['owner','other','staff'].map(user));
good(await service.from('admin_staff_members').insert({user_id:staff.id,email:staff.email,display_name:'CI support',role:'operator',permissions:{support:true},is_active:true}),'Grant support permission');
const owned='t-'+randomBytes(16).toString('hex'),anonymous='t-'+randomBytes(16).toString('hex');
const token=randomBytes(32).toString('hex');
good(await service.from('support_tickets').insert([
 {id:owned,customer_name:'Synthetic owner',email:owner.email,customer_user_id:owner.id,subject:'Owned ticket'},
 {id:anonymous,customer_name:'Synthetic guest',email:'guest@example.test',subject:'Guest ticket',access_token_hash:createHash('sha256').update(token).digest('hex')}
]),'Seed isolated account and guest ticket fixtures');
const args=(id,access=null)=>({p_ticket_id:id,p_access_token:access});
const reply=(client,id,message,access=null,request=randomUUID())=>client.rpc('add_support_ticket_message_idempotent',{...args(id,access),p_message:message,p_request_id:request});
const read=(client,id,access=null)=>client.rpc('get_support_ticket_messages',args(id,access));
const status=(client,id,access=null)=>client.rpc('get_support_ticket_status',args(id,access));
const mark=(client,id,access=null)=>client.rpc('mark_support_ticket_messages_read',args(id,access));
const first=good(await reply(owner.api,owned,'Owned request'),'Owner sends message');
ok(first.sender_role==='customer'&&!first.idempotent_replay,'Owner message has customer role');
for(const client of [other.api,guest]){
 denied(await read(client,owned),'Outsider cannot read owned ticket');
 denied(await status(client,owned),'Outsider cannot see owned status');
 denied(await reply(client,owned,'Unauthorized'),'Outsider cannot reply to owned ticket');
 denied(await mark(client,owned),'Outsider cannot alter read receipts');
}
for(const wrong of [null,'invalid','f'.repeat(64)]){
 denied(await read(guest,anonymous,wrong),'Invalid guest token cannot read');
 denied(await reply(guest,anonymous,'Unauthorized',wrong),'Invalid guest token cannot reply');
 denied(await status(guest,anonymous,wrong),'Invalid guest token cannot see status');
 denied(await mark(guest,anonymous,wrong),'Invalid guest token cannot mark read');
}
const request=randomUUID();
const g1=good(await reply(guest,anonymous,'Guest message',token,request),'Valid guest token sends reply');
const g2=good(await reply(guest,anonymous,'Guest message',token,request),'Replay identical guest request');
ok(g1.message_id===g2.message_id&&g2.idempotent_replay===true,'Guest retry does not duplicate message');
ok(Boolean((await reply(guest,anonymous,'Conflicting content',token,request)).error),'Conflicting idempotent payload denied');
ok(good(await read(guest,anonymous,token),'Guest token reads own thread').length===1,'Exactly one guest message');
ok(good(await status(guest,anonymous,token),'Valid guest status').length===1,'Guest status available');
const history=good(await owner.api.rpc('get_my_support_tickets_page',{p_limit:50}),'Owner ticket history');
ok(history.some(x=>x.ticket_id===owned)&&!history.some(x=>x.ticket_id===anonymous),'Account history excludes guest ticket');
ok(good(await other.api.rpc('get_my_support_tickets_page',{p_limit:50}),'Other account history').length===0,'Other account has no foreign tickets');
ok(Boolean((await guest.rpc('get_my_support_tickets_page',{p_limit:50})).error),'Anon history denied');
ok(good(await mark(staff.api,owned),'Support marks customer message read')===1,'Exactly one staff read receipt');
const response=good(await reply(staff.api,owned,'Support reply'),'Authorized support staff reply');
ok(response.sender_role==='admin','Support reply has staff role');
ok(good(await status(owner.api,owned),'Owner sees response status')[0].status==='მუშავდება','Staff reply sets in-progress, not resolved');
ok(good(await read(owner.api,owned),'Owner reads two messages').length===2,'Owner gets original and staff reply');
ok(good(await mark(owner.api,owned),'Owner marks staff message read')===1,'One customer read receipt');
ok(good(await mark(owner.api,owned),'Owner repeats read receipt')===0,'Read receipts idempotent');
good(await service.from('admin_staff_members').update({is_active:false}).eq('user_id',staff.id),'Deactivate support staff');
denied(await read(staff.api,owned),'Previously signed staff token loses read after deactivation');
denied(await reply(staff.api,owned,'Revoked staff reply'),'Previously signed staff token loses write');
console.log('PASS Stage89: '+checks+' live-source signed/guest support RPC, ownership, token, receipt and replay checks.');
