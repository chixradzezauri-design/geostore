// Stage80: authentic versioned stock transaction over signed local Supabase HTTP.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
const {API_URL,ANON_KEY,SERVICE_ROLE_KEY}=process.env;
assert.ok(API_URL&&ANON_KEY&&SERVICE_ROLE_KEY,'Local credentials required');
const target=new URL(API_URL);
assert.ok(target.protocol==='http:'&&['localhost','127.0.0.1'].includes(target.hostname),
  'Stage80 refuses all remote Supabase APIs');
const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const anon=createClient(API_URL,ANON_KEY,opts);
const privileged=createClient(API_URL,SERVICE_ROLE_KEY,opts);
const signed=token=>createClient(API_URL,ANON_KEY,{...opts,
 global:{headers:{Authorization:'Bearer '+token}}});
let checks=0;
const ok=(v,msg)=>{assert.ok(v,msg);checks++};
const success=(r,msg)=>{assert.equal(r.error,null,msg+': '+(r.error?.message||''));checks++;return r.data};
const denied=(r,msg)=>ok(Boolean(r.error),msg);
async function rpc(client,name,args){
 let last;
 for(let k=0;k<12;k++){
  last=await client.rpc(name,args);
  if(last.error?.code!=='PGRST202')return last;
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 return last;
}
const runSql=query=>execFileSync('psql',['-h','127.0.0.1','-p','54322',
 '-U','postgres','-d','postgres','-X','-A','-t','-v','ON_ERROR_STOP=1','-c',query],
 {encoding:'utf8',timeout:30000,env:{...process.env,PGPASSWORD:'postgres'}}).trim();
const metrics={
 red:"SELECT (x->>'stock')::int FROM public.products p,jsonb_array_elements(p.variants) x WHERE p.id='STAGE80-SHOE' AND x->>'id'='red-s'",
 blue:"SELECT (x->>'stock')::int FROM public.products p,jsonb_array_elements(p.variants) x WHERE p.id='STAGE80-SHOE' AND x->>'id'='blue-m'",
 parent:"SELECT stock FROM public.products WHERE id='STAGE80-SHOE'",
 base:"SELECT stock FROM public.products WHERE id='STAGE80-BASE'",
 movements:"SELECT count(*) FROM private.inventory_movements WHERE related_order_id='STAGE80-VARIANTS-001' AND reason='order_deduction'",
 restored:"SELECT count(*) FROM private.inventory_movements WHERE related_order_id='STAGE80-VARIANTS-001' AND reason='order_cancellation'",
 delta:"SELECT coalesce(sum(quantity_delta),0) FROM private.inventory_movements WHERE related_order_id='STAGE80-VARIANTS-001'",
 orders:"SELECT count(*) FROM public.orders WHERE id LIKE 'STAGE80-%'",
 total:"SELECT total_gel FROM public.orders WHERE id='STAGE80-VARIANTS-001'",
 status:"SELECT status FROM public.orders WHERE id='STAGE80-VARIANTS-001'",
 purchaseCost:"SELECT items->0->>'purchase_cost' FROM public.orders WHERE id='STAGE80-VARIANTS-001'"
};
const val=k=>runSql(metrics[k]);
const num=k=>Number(val(k));
async function makeUser(name){
 const email='stage80-'+name+'-'+randomUUID().slice(0,8)+'@example.test';
 const password='CiLocal-8!'+randomUUID();
 const created=success(await privileged.auth.admin.createUser({
  email,password,email_confirm:true}),'Create synthetic '+name);
 const separate=createClient(API_URL,ANON_KEY,opts);
 const session=success(await separate.auth.signInWithPassword({email,password}),
  'Signed GoTrue login '+name);
 ok(Boolean(session.session?.access_token),'Issued signed JWT for '+name);
 return {id:created.user.id,email,token:session.session.access_token};
}
const [customer,ordersStaff,outsider]=await Promise.all(
 ['customer','staff','outsider'].map(makeUser));
success(await privileged.from('admin_staff_members').insert({
 user_id:ordersStaff.id,email:ordersStaff.email,role:'operator',
 display_name:'Stage80 Orders Operator',permissions:{orders:true},is_active:true
}),'Create protected CI-only staff grant');
const costKeys=['purchase_cost','purchaseCost','cost_price','costPrice','vendor',
 'unit_cost','unitCost','cost','supplier','supplier_name','margin','profit'];
const redacted=row=>costKeys.every(key=>!(key in row));
const request={
 id:'STAGE80-VARIANTS-001',customer_name:'Synthetic Stage80 Guest',
 phone:'+995555123456',address:'CI-only location 80',
 user_email:'guest',delivery_region:'tbilisi',
 items:[
  {id:'STAGE80-SHOE',quantity:1,custom_variant_id:'red-s',
   selected_size:'S',selected_color:'Red'},
  {id:'STAGE80-SHOE',quantity:1,custom_variant_id:'red-s',
   selected_size:'S',selected_color:'Red',gift_wrap:true},
  {id:'STAGE80-SHOE',quantity:2,custom_variant_id:'blue-m',
   selected_size:'M',selected_color:'Blue'}
 ]
};
const receipt=success(await rpc(anon,'create_order_with_stock',{p_order:request}),
 'Signed-gateway guest uses authentic private checkout');
ok(receipt.stock_deducted===true&&receipt.subtotal_gel===525&&
 receipt.total_gel===530&&receipt.delivery_gel===5,
 'Real variants and addon prices total 530 GEL');
ok(receipt.items.length===3&&receipt.items.every(redacted),
 'All three real checkout lines hide internal finance');
ok(receipt.items.filter(x=>x.customVariantId==='red-s').length===2&&
 receipt.items.filter(x=>x.customVariantId==='blue-m').length===1,
 'Variant size/color and duplicate customization line preserved');
ok(num('red')===1&&num('blue')===0&&num('parent')===0,
 'Actual inventory decremented only affected variants');
ok(num('movements')===2&&num('delta')===-4,
 'Exact versioned ledger trigger recorded two variant deduction deltas');
ok(num('orders')===1&&num('total')===530&&val('purchaseCost')==='52',
 'Single persisted order retains original cost and total');
const replay=success(await rpc(anon,'create_order_with_stock',{p_order:request}),
 'Idempotent guest replay with genuine stock transaction');
ok(replay.idempotent_replay===true&&replay.total_gel===530&&
 replay.items.every(redacted),'Stored replay never exposes finance data');
ok(num('movements')===2&&num('delta')===-4&&num('orders')===1,
 'Replay neither double-deducted nor created a second order');
denied(await rpc(anon,'create_order_with_stock',{p_order:{
 ...request,id:'STAGE80-BAD-SIZE',items:[{id:'STAGE80-SHOE',quantity:1,
 custom_variant_id:'red-s',selected_size:'M',selected_color:'Red'}]}}),
 'Mismatched size is rejected by real checkout');
denied(await rpc(anon,'create_order_with_stock',{p_order:{
 ...request,id:'STAGE80-OVERSELL',items:[{id:'STAGE80-SHOE',quantity:1,
 custom_variant_id:'blue-m',selected_size:'M',selected_color:'Blue'}]}}),
 'Depleted blue variant cannot oversell');
ok(num('orders')===1&&num('movements')===2,
 'Rejected requests leave order and movement counts unchanged');
const base={id:'STAGE80-BASE-001',customer_name:'Stage80 Guest',
 phone:'+995555123456',address:'Synthetic CI-only address',
 user_email:'guest',delivery_region:'tbilisi',coupon_code:'STAGE80TEN',
 items:[{id:'STAGE80-BASE',quantity:2}]};
const coupon=success(await rpc(anon,'create_order_with_stock',{p_order:base}),
 'Real server-side coupon pricing and stock transaction');
ok(coupon.total_gel===185&&coupon.subtotal_gel===200&&
 coupon.discount_gel===20&&coupon.delivery_gel===5,
 '10-percent coupon and delivery charged by server');
ok(num('base')===3&&num('orders')===2,
 'Real base stock decremented with order insertion');
denied(await rpc(signed(customer.token),'create_order_with_stock',{p_order:{
 ...base,id:'STAGE80-OTHER-EMAIL',user_email:'wrong@example.test'}}),
 'Cannot spoof other shopper email despite signed JWT');
const ownerOrder={...base,id:'STAGE80-CUSTOMER-001',coupon_code:'',
 user_email:customer.email,customer_email:customer.email,
 items:[{id:'STAGE80-BASE',quantity:1}]};
const ownerReceipt=success(await rpc(signed(customer.token),'create_order_with_stock',
 {p_order:ownerOrder}),'Real authenticated checkout with server stock');
ok(ownerReceipt.total_gel===105&&ownerReceipt.items.every(redacted),
 'Customer receipt safe and delivery charged');
ok(num('base')===2&&num('orders')===3,
 'Authenticated checkout deducts exactly one unit');
const ownHistory=success(await rpc(signed(customer.token),'get_my_orders',{}),
 'Real signed customer order-history read');
ok(ownHistory.some(x=>x.id===ownerOrder.id)&&
 !ownHistory.some(x=>x.id===request.id),
 'Signed buyer sees own checkout, never guest order');
denied(await rpc(signed(outsider.token),'admin_update_order_status',
 {p_order_id:request.id,p_new_status:'გაუქმებული'}),
 'Unauthorized signed account cannot cancel others orders');
const canceled=success(await rpc(signed(ordersStaff.token),'admin_update_order_status',
 {p_order_id:request.id,p_new_status:'გაუქმებული'}),
 'Authorized operator uses original private staff cancellation');
ok(canceled.status==='გაუქმებული','Cancellation status persisted');
const repeat=success(await rpc(signed(ordersStaff.token),'admin_update_order_status',
 {p_order_id:request.id,p_new_status:'გაუქმებული'}),
 'Repeat cancellation idempotent');
ok(repeat.status==='გაუქმებული','Repeat cancellation returns same status');
ok(num('red')===3&&num('blue')===2&&num('parent')===0,
 'Original stock restored exactly once to two custom variants');
ok(num('restored')===2&&num('delta')===0&&num('orders')===3&&
 num('total')===530&&val('purchaseCost')==='52'&&val('status')==='გაუქმებული',
 'Inventory audit balanced and finance history unchanged');
const ledger=success(await rpc(signed(ordersStaff.token),'admin_order_ledger_page',
 {p_offset:0,p_limit:50}),'Signed staff ledger after real cancellation');
const latest=ledger.find(x=>x.id===request.id);
ok(latest?.status==='გაუქმებული'&&latest.items.every(redacted),
 'Authorized staff sees canceled order without purchase cost leakage');
console.log('PASS Stage80: '+checks+
 ' genuine signed Auth/PostgREST private checkout, stock, variant, coupon, cancellation and audit checks.');
