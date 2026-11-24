// Stage90: actual pre-A definitions -> A1 -> A2 -> A3 -> old/new client -> B.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {fetchVerifiedAdminOrderLedger} from '../src/utils/adminOrderLedgerSafety.js';
const {API_URL,ANON_KEY,SERVICE_ROLE_KEY}=process.env;
assert.ok(API_URL&&ANON_KEY&&SERVICE_ROLE_KEY);
const target=new URL(API_URL);
assert.ok(target.protocol==='http:'&&['127.0.0.1','localhost'].includes(target.hostname),'Disposable localhost only');
const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const service=createClient(API_URL,SERVICE_ROLE_KEY,opts);
const anon=createClient(API_URL,ANON_KEY,opts);
const signed=t=>createClient(API_URL,ANON_KEY,{...opts,global:{headers:{Authorization:'Bearer '+t}}});
let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++};
const good=(r,m)=>{assert.equal(r.error,null,m+': '+(r.error?.message||''));checks++;return r.data};
const pg=['-h','127.0.0.1','-p','54322','-U','postgres','-d','postgres','-X','-At','-v','ON_ERROR_STOP=1'];
const env={...process.env,PGPASSWORD:'postgres'};
const sql=q=>execFileSync('psql',[...pg,'-c',q],{encoding:'utf8',timeout:30000,env}).trim();
const root=fileURLToPath(new URL('../supabase/migrations/',import.meta.url));
const apply=file=>{execFileSync('psql',[...pg,'-f',root+file],{encoding:'utf8',timeout:30000,env});sql("NOTIFY pgrst, 'reload schema'");checks++};
const files=[
 '20261121170000_strip_private_costs_from_checkout_rpc.sql',
 '20261121190000_redact_alternate_costs_from_order_history.sql',
 '20261121210000_scope_admin_order_ledger_permissions.sql',
 '20261121213000_revoke_legacy_order_snapshot_reads.sql'
];
async function user(tag){
 const email='stage90-'+tag+'-'+randomUUID()+'@example.test',password='Ci-Stage90!'+randomUUID();
 const u=good(await service.auth.admin.createUser({email,password,email_confirm:true}),'Synthetic account '+tag);
 const s=good(await createClient(API_URL,ANON_KEY,opts).auth.signInWithPassword({email,password}),'Real signed JWT '+tag);
 return {id:u.user.id,email,token:s.session.access_token,api:signed(s.session.access_token)};
}
async function grant(u,permissions){good(await service.from('admin_staff_members').insert({user_id:u.id,email:u.email,display_name:'CI Stage90',role:'operator',permissions,is_active:true}),'Server grants');}
const [customer,staff,finance,products]=await Promise.all(['customer','staff','finance','products'].map(user));
await grant(staff,{orders:true});await grant(finance,{orders:true,expenses:true});await grant(products,{products:true});
for(const [sig,md5] of Object.entries({
 'private.get_my_orders()':'657fb245cd52e10607ec273eb8ef0c56',
 'public.get_my_orders()':'7d1c08d7bd75a99ff54dce2dd1b8e700',
 'public.create_order_with_stock(jsonb)':'eb98f58ecf5c0cbf2b67201d9a77dd1a',
 'private.create_order_with_stock(jsonb)':'cbd5624b31d24281f1e2088b08523b90'
})){ok(sql("SELECT md5(pg_get_functiondef('"+sig+"'::regprocedure))")===md5,'Actual pre-A function parity '+sig);}
ok(sql("SELECT to_regprocedure('public.admin_order_ledger_page(integer,integer)') IS NULL")==='t','Before A: projection absent');
const oldRead=()=>staff.api.from('orders').select('*').eq('id','STAGE78-ORDER');
const raw=good(await oldRead(),'Before A: old frontend still works');
ok(raw[0].items[0].purchase_cost===40,'Known pre-A finance exposure reproduced only on synthetic data');
const id='STAGE90-CHECKOUT-'+randomUUID().slice(0,8);
const request={id,customer_name:'Synthetic buyer',phone:'+995555123456',address:'Synthetic CI address',user_email:customer.email,customer_email:customer.email,delivery_region:'tbilisi',items:[{id:'STAGE80-BASE',quantity:1}]};
const checkout=()=>customer.api.rpc('create_order_with_stock',{p_order:request});
const previous=good(await checkout(),'Real checkout under original Production wrapper');
ok(previous.total_gel===105&&previous.items[0].purchase_cost===40,'Old receipt price and cost shape');
const stock=sql("SELECT stock FROM public.products WHERE id='STAGE80-BASE'");
const ledger=sql("SELECT count(*) FROM private.inventory_movements WHERE related_order_id='"+id+"'");
const orders=sql("SELECT count(*) FROM public.orders WHERE id='"+id+"'");
const preserved=()=>ok(sql("SELECT stock FROM public.products WHERE id='STAGE80-BASE'")===stock&&sql("SELECT count(*) FROM private.inventory_movements WHERE related_order_id='"+id+"'")===ledger&&sql("SELECT count(*) FROM public.orders WHERE id='"+id+"'")===orders,'No duplicate stock/order/ledger effects');
apply(files[0]);
const replay=good(await checkout(),'After A1: old order replay through redacted wrapper');
ok(replay.total_gel===previous.total_gel&&replay.idempotent_replay===true&&!('purchase_cost' in replay.items[0]),'A1 preserves price and filters existing receipt');
preserved();
ok(good(await oldRead(),'Old frontend after A1').length===1,'A1 legacy reads intact');
apply(files[1]);
const history=good(await customer.api.rpc('get_my_orders',{}),'After A2: signed customer history');
ok(history.some(x=>x.id===id&&!('purchase_cost' in x.items[0]))&&history.every(x=>x.id===id),'A2 ownership and redaction');
ok(good(await oldRead(),'Old frontend after A2').length===1,'A2 legacy reads intact');
apply(files[2]);
ok(good(await oldRead(),'Old frontend after A3').length===1,'A3 legacy reads intact');
async function projection(who){
 return fetchVerifiedAdminOrderLedger({apiKey:ANON_KEY,expectedUserId:who.id,supabaseUrl:API_URL,
  fetchImpl:fetch,isCurrent:()=>true,pageSize:2,maxRows:100,
  loadSession:async()=>({data:{session:{user:{id:who.id},access_token:who.token}},error:null})});
}
async function verifyNew(){
 const rows=await projection(staff);checks++;
 ok(rows.some(x=>x.id===id&&!('purchase_cost' in x.items[0])),'Actual new frontend loader signed and cost redacted');
 const fr=await projection(finance);checks++;
 ok(fr.some(x=>x.id===id&&x.items[0].purchase_cost===40),'Actual new frontend finance scope preserved');
 const refs=good(await products.api.rpc('admin_order_image_refs_page',{p_offset:0,p_limit:100}),'New products image refs');
 ok(refs.every(x=>Object.keys(x).join(',')==='items'),'Only projected image references');
 ok(Boolean((await anon.rpc('admin_order_ledger_page',{p_offset:0,p_limit:10})).error),'Anonymous ledger denied');
}
await verifyNew();
preserved();
// This is ONLY local simulation of verified frontend READY, not a deployment.
apply(files[3]);
ok(Boolean((await oldRead()).error),'After B: legacy raw order read denied as expected');
await verifyNew();
const last=good(await checkout(),'After B: real checkout idempotent replay');
ok(last.idempotent_replay===true&&last.total_gel===105&&!('purchase_cost' in last.items[0]),'After B customer receipt remains safe');
preserved();
ok(sql("SELECT md5(pg_get_functiondef('private.create_order_with_stock(jsonb)'::regprocedure))")==='cbd5624b31d24281f1e2088b08523b90','Stock writer unchanged across all four migrations');
console.log('PASS Stage90: '+checks+' exact pre-A to A1/A2/A3/new frontend loader/B signed checkout and cutover checks (localhost only).');
