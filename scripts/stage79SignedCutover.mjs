// Stage79: live signed GoTrue/Auth -> HTTP/PostgREST cutover on localhost only.
// The private checkout transaction in this fixture is a mock, NOT real stock logic.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';

const {API_URL, ANON_KEY, SERVICE_ROLE_KEY}=process.env;
assert.ok(API_URL && ANON_KEY && SERVICE_ROLE_KEY, 'Local API credentials required');
const target=new URL(API_URL);
assert.equal(target.protocol,'http:');
assert.ok(['localhost','127.0.0.1'].includes(target.hostname),
  'Only disposable localhost Supabase is allowed');
const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const anon=createClient(API_URL,ANON_KEY,opts);
const admin=createClient(API_URL,SERVICE_ROLE_KEY,opts);
const authed=token=>createClient(API_URL,ANON_KEY,{...opts,
  global:{headers:{Authorization:'Bearer '+token}}});
let n=0;
function ok(value,message){assert.ok(value,message);n++;}
function success(result,message){assert.equal(result.error,null,message+': '+
  (result.error?.message||''));n++;return result.data;}
function denied(result,message){ok(Boolean(result.error),message);}
async function rpc(client,name,args){
  let r;
  for(let i=0;i<12;i++){
    r=await client.rpc(name,args);
    if(r.error?.code!=='PGRST202')return r;
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  return r;
}
async function user(name){
  const email='stage79-'+name+'-'+randomUUID().slice(0,8)+'@example.test';
  const password='CiLocal-7!'+randomUUID();
  const created=success(await admin.auth.admin.createUser({
    email,password,email_confirm:true}),'Create disposable user '+name);
  const signed=success(await anon.auth.signInWithPassword({email,password}),
    'GoTrue signed sign-in '+name);
  ok(Boolean(signed.session?.access_token),'JWT issued '+name);
  return {id:created.user.id,email,token:signed.session.access_token};
}
async function grant(person,permissions){
  success(await admin.from('admin_staff_members').insert({
    user_id:person.id,email:person.email,display_name:'CI '+person.email.split('-')[1],
    role:'operator',permissions,is_active:true
  }),'Server-only permission grant');
}
const [customerA,customerB,ordersOnly,finance,products]=await Promise.all(
  ['customer-a','customer-b','orders','finance','products'].map(user));
await grant(ordersOnly,{orders:true});
await grant(finance,{orders:true,expenses:true});
await grant(products,{products:true});
const aliases=['purchase_cost','purchaseCost','cost_price','costPrice','vendor',
  'unit_cost','unitCost','cost','supplier','supplier_name','supplierName',
  'margin','profit'];
const hasNoCosts=item=>aliases.every(key=>!(key in item));
const guestOrder={id:'STAGE79-CHECKOUT-GUEST',customer_name:'Synthetic Guest',
  phone:'+995599123456',address:'CI only address 123',
  items:[{id:'ci-product',quantity:1}]};
const checkout=success(await rpc(anon,'create_order_with_stock',{p_order:guestOrder}),
  'Guest HTTP Phase A checkout');
ok(checkout.order_id===guestOrder.id && checkout.total_gel===140,
  'Phase A receipt preserves total and reference');
ok(hasNoCosts(checkout.items[0]),'Guest receipt redacts cost/vendor aliases');
const replay=success(await rpc(anon,'create_order_with_stock',{p_order:guestOrder}),
  'Guest HTTP idempotent checkout');
ok(replay.idempotent_replay===true && hasNoCosts(replay.items[0]),
  'Idempotent replay remains cost-redacted');
denied(await rpc(anon,'create_order_with_stock',
  {p_order:{...guestOrder,phone:'123',id:'STAGE79-INVALID'}}),
  'Guest malformed phone denied at public wrapper');
const authenticatedCheckout=success(await rpc(authed(customerA.token),
  'create_order_with_stock',{p_order:{...guestOrder,id:'STAGE79-AUTH-CHECKOUT'}}),
  'Signed customer checkout');
ok(hasNoCosts(authenticatedCheckout.items[0]),'Authenticated receipt cost redacted');

const sourceItem={id:'ci-product',price:140,quantity:1,selectedSize:'M',
  purchase_cost:40,purchaseCost:41,cost_price:42,costPrice:43,vendor:'hidden'};
success(await admin.from('orders').insert([
  {id:'STAGE79-CUSTOMER-A',user_id:customerA.id,total_gel:140,
    status:'ახალი',items:[sourceItem]},
  {id:'STAGE79-CUSTOMER-B',user_id:customerB.id,total_gel:140,
    status:'მუშავდება',items:[sourceItem]}
]),'Create synthetic customer ownership fixtures');
denied(await rpc(anon,'get_my_orders',{}),'Anon cannot call customer history');
const hA=success(await rpc(authed(customerA.token),'get_my_orders',{}),
  'Customer A signed order history');
const hB=success(await rpc(authed(customerB.token),'get_my_orders',{}),
  'Customer B signed order history');
ok(hA.length===1 && hA[0].id==='STAGE79-CUSTOMER-A',
  'Customer A sees only A');
ok(hB.length===1 && hB[0].id==='STAGE79-CUSTOMER-B',
  'Customer B sees only B');
ok(hA[0].items[0].selectedSize==='M' && hasNoCosts(hA[0].items[0]) &&
  hasNoCosts(hB[0].items[0]),
  'History preserves options but redacts costs');
const oldOrders=success(await authed(ordersOnly.token).from('orders')
  .select('*').eq('id','STAGE78-ORDER'),'Phase A old admin raw SELECT');
ok(oldOrders.length===1,'Legacy old frontend remains compatible during Phase A');
const phaseALedger=success(await rpc(authed(ordersOnly.token),
  'admin_order_ledger_page',{p_offset:0,p_limit:10}),'Phase A signed order ledger');
ok(hasNoCosts(phaseALedger.find(x=>x.id==='STAGE78-ORDER').items[0]),
  'Phase A orders-only projection redacted');
console.log('PASS Stage79 Phase A signed HTTP checks before local Phase B');

const localDir=fileURLToPath(new URL('../tests/stage78-supabase/',import.meta.url));
execFileSync('psql',['-h','127.0.0.1','-p','54322','-U','postgres',
  '-d','postgres','-v','ON_ERROR_STOP=1','-f','stage79-phase-b.sql'],{
  cwd:localDir,env:{...process.env,PGPASSWORD:'postgres'},
  stdio:['ignore','pipe','pipe'],encoding:'utf8',timeout:30000
});
n++;
denied(await authed(ordersOnly.token).from('orders')
  .select('*').eq('id','STAGE78-ORDER'),
  'Phase B obsolete cost-bearing SELECT * denied');
const safe=success(await authed(ordersOnly.token).from('orders')
  .select('id,status').eq('id','STAGE78-ORDER'),
  'Phase B safe order columns remain accessible');
ok(safe.length===1 && safe[0].id==='STAGE78-ORDER',
  'Phase B safe order metadata intact');
const post=success(await rpc(authed(ordersOnly.token),'admin_order_ledger_page',
  {p_offset:0,p_limit:10}),'Phase B orders-only projected ledger');
ok(hasNoCosts(post.find(x=>x.id==='STAGE78-ORDER').items[0]),
  'Phase B orders-only projections remain cost-redacted');
const financeData=success(await rpc(authed(finance.token),'admin_order_ledger_page',
  {p_offset:0,p_limit:10}),'Phase B finance authorized projected ledger');
ok(financeData.find(x=>x.id==='STAGE78-ORDER').items[0].purchase_cost===40,
  'Finance role still receives authorized costs');
const refs=success(await rpc(authed(products.token),'admin_order_image_refs_page',
  {p_offset:0,p_limit:10}),'Phase B products-only image scan');
ok(refs.some(row=>row.items.some(item=>item.image==='ci-image.png')),
  'Products image references survive raw order read revocation');
const hAfter=success(await rpc(authed(customerA.token),'get_my_orders',{}),
  'Phase B signed customer history');
ok(hAfter.length===1 && hAfter[0].id==='STAGE79-CUSTOMER-A',
  'Order history survives Phase B');
const receiptAfter=success(await rpc(anon,'create_order_with_stock',
  {p_order:{...guestOrder,id:'STAGE79-AFTER-B'}}),
  'Phase B still permits guest checkout');
ok(receiptAfter.total_gel===140 && hasNoCosts(receiptAfter.items[0]),
  'Guest checkout still cost-redacted after Phase B');
console.log('PASS Stage79: '+n+' signed Auth/PostgREST checkout, history and Phase A->B HTTP checks (local only).');
