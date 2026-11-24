// Stage88: real signed GoTrue/PostgREST permission and legacy/new admin cutover.
// All activity is confined to disposable localhost Auth/PostgREST.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const {API_URL,ANON_KEY,SERVICE_ROLE_KEY}=process.env;
assert.ok(API_URL&&ANON_KEY&&SERVICE_ROLE_KEY,'Stage88 requires LOCAL Supabase credentials');
const url=new URL(API_URL);
assert.equal(url.protocol,'http:');
assert.ok(['127.0.0.1','localhost'].includes(url.hostname),'Stage88 must never contact Production');
const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const service=createClient(API_URL,SERVICE_ROLE_KEY,opts);
const anon=createClient(API_URL,ANON_KEY,opts);
const signed=token=>createClient(API_URL,ANON_KEY,{
 ...opts,global:{headers:{Authorization:'Bearer '+token}}
});
let checks=0;
const ok=(value,label)=>{assert.ok(value,label);checks++};
const good=(result,label)=>{assert.equal(result.error,null,label+': '+(result.error?.message||''));checks++;return result.data};
const error=(result,label)=>ok(Boolean(result.error),label);
async function user(tag){
 const email='stage88-'+tag+'-'+randomUUID().slice(0,8)+'@example.test';
 const password='Ci-Stage88!'+randomUUID();
 const identity=good(await service.auth.admin.createUser({
  email,password,email_confirm:true
 }),'Create local Auth '+tag);
 const session=good(await createClient(API_URL,ANON_KEY,opts).auth.signInWithPassword({
  email,password
 }),'Sign in as local '+tag);
 ok(Boolean(identity.user?.id&&session.session?.access_token),'JWT issued '+tag);
 return {id:identity.user.id,email,token:session.session.access_token};
}
async function grant(who,permissions,active=true){
 good(await service.from('admin_staff_members').insert({
  user_id:who.id,email:who.email,display_name:'Stage88 '+who.email,
  role:'operator',permissions,is_active:active
 }), 'Trusted server persisted staff grant');
}
async function allowed(who,permission,expected){
 const result=good(await signed(who.token).rpc('has_staff_permission',{
  p_permission:permission
 }),'Signed PostgREST module permission '+permission);
 ok(result===expected,'Server-side '+permission+' must equal '+expected);
}
async function rows(who,table){
 return good(await signed(who.token).from(table).select('*'),
  'Signed RLS read '+table);
}
const [crm,support,orders,visitor,inactive]=await Promise.all(
 ['crm','support','orders','visitor','inactive'].map(user)
);
await grant(crm,{crm:true});
await grant(support,{support:true});
await grant(orders,{orders:true});
await grant(inactive,{support:true},false);
for(const permission of ['crm','support','orders']){
 await allowed(crm,permission,permission==='crm');
 await allowed(support,permission,permission==='support');
 await allowed(orders,permission,permission==='orders');
 await allowed(visitor,permission,false);
 await allowed(inactive,permission,false);
}
const guestRead=await anon.from('messages').select('*');
error(guestRead,'Anonymous role has no direct CRM SELECT grant');
error(await anon.from('support_tickets').select('*'),
 'Anonymous cannot SELECT staff support inbox');
ok((await rows(crm,'messages')).length===2,'CRM staff can read synthetic customer chat');
ok((await rows(crm,'support_tickets')).length===0,
 'CRM-only staff cannot read protected support tickets');
ok((await rows(crm,'support_ticket_messages')).length===0,
 'CRM-only staff cannot read private support messages');
ok((await rows(support,'messages')).length===0,
 'Support-only staff cannot view CRM conversation history');
ok((await rows(support,'support_tickets')).length===1,
 'Support staff can see synthetic support inbox');
ok((await rows(support,'support_ticket_messages')).length===1,
 'Support staff can read support messages');
for(const who of [orders,visitor,inactive]){
 ok((await rows(who,'messages')).length===0,
  'Non-CRM role cannot read customer chat '+who.email);
 ok((await rows(who,'support_tickets')).length===0,
  'Non-support role cannot read ticket inbox '+who.email);
}
const supportUpdate=good(await signed(support.token).from('support_tickets')
 .update({status:'მუშავდება'}).eq('id','STAGE88-TICKET-1').select('id'),
 'Support role can update ticket');
ok(supportUpdate.length===1,'Support role updated exactly one synthetic ticket');
const unauthorized=good(await signed(crm.token).from('support_tickets')
 .update({status:'მოგვარებული'}).eq('id','STAGE88-TICKET-1').select('id'),
 'CRM-only status edit filtered by support RLS');
ok(unauthorized.length===0,'CRM-only cannot change support status');
const crmUpdate=good(await signed(crm.token).from('messages')
 .update({status:'წაკითხული'}).eq('id','STAGE88-CHAT-1').select('id'),
 'CRM role updates customer chat');
ok(crmUpdate.length===1,'CRM update granted');
const supportChatEdit=good(await signed(support.token).from('messages')
 .update({status:'დახურული'}).eq('id','STAGE88-CHAT-1').select('id'),
 'Support-only CRM update is RLS filtered');
ok(supportChatEdit.length===0,'Support cannot edit CRM messages');
const deleteAttempt=good(await signed(support.token).from('messages')
 .delete().eq('id','STAGE88-CHAT-2').select('id'),
 'Support-only CRM deletion filtered');
ok(deleteAttempt.length===0,'Support cannot delete CRM messages');
const crmDelete=good(await signed(crm.token).from('messages')
 .delete().eq('id','STAGE88-CHAT-2').select('id'),
 'CRM-only deletion of synthetic CRM record');
ok(crmDelete.length===1,'CRM delete granted by exact historic policy');
error(await signed(crm.token).from('admin_staff_members').select('*'),
 'Client staff permissions table is server only');
error(await signed(visitor.token).from('admin_staff_members').insert({
 user_id:visitor.id,email:visitor.email,display_name:'Unauthorized self grant',
 role:'manager',permissions:{support:true,crm:true}
}), 'JWT cannot create own staff grants');
// This fixture has already executed local Phase B in Stage79.
// Old clients are not compatible with Phase B, but new projected RPCs are.
error(await signed(orders.token).from('orders').select('*').eq('id','STAGE78-ORDER'),
 'Pre-update old admin raw orders SELECT must fail after Phase B');
const ledger=good(await signed(orders.token).rpc('admin_order_ledger_page',{
 p_offset:0,p_limit:100
}), 'New admin projected orders remain accessible under Phase B');
ok(Array.isArray(ledger)&&ledger.some(row=>row.id==='STAGE78-ORDER'),
 'New admin ledger still lists exact synthetic fixture order');
error(await signed(support.token).rpc('admin_order_ledger_page',{
 p_offset:0,p_limit:10
}), 'Support-only cannot access order ledger');
// Permission changes are persisted server side and observed with the SAME
// existing, previously signed JWT: never rely on stale browser permissions.
good(await service.from('admin_staff_members').update({
 permissions:{crm:true},is_active:true
}).eq('user_id',support.id),'Trusted service changes support staff into CRM-only');
await allowed(support,'support',false);
await allowed(support,'crm',true);
ok((await rows(support,'support_tickets')).length===0,
 'Existing JWT loses support inbox immediately after server permission edit');
ok((await rows(support,'messages')).length===1,
 'Existing JWT gets CRM access only from fresh server permission');
good(await service.from('admin_staff_members').update({is_active:false})
 .eq('user_id',crm.id),'Trusted server revokes CRM staff membership');
await allowed(crm,'crm',false);
ok((await rows(crm,'messages')).length===0,
 'Existing CRM JWT is denied immediately after staff deactivation');
console.log('PASS Stage88: '+checks+
 ' local signed staff CRM/support/orders RLS, role change, revocation and Phase B admin cutover checks.');
