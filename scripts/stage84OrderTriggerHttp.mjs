// Stage84: 3 additional real Production order triggers on signed HTTP checkout.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
const {API_URL,ANON_KEY}=process.env;
assert.ok(API_URL&&ANON_KEY,'Stage84 local credentials required');
const host=new URL(API_URL);
assert.equal(host.protocol,'http:');
assert.ok(['127.0.0.1','localhost'].includes(host.hostname),
 'Stage84 must not contact Production');
let checks=0;
const ok=(condition,message)=>{assert.ok(condition,message);checks++};
const psql=sql=>execFileSync('psql',['-h','127.0.0.1','-p','54322',
 '-U','postgres','-d','postgres','-X','-A','-t','-v','ON_ERROR_STOP=1','-c',sql],{
 encoding:'utf8',timeout:30000,env:{...process.env,PGPASSWORD:'postgres'}
}).trim();
const count=q=>Number(psql(q));
const signatures=JSON.parse(psql(
 "SELECT jsonb_build_object("+
 "'owner',md5(pg_get_functiondef('private.bind_order_to_auth_user()'::regprocedure)),"+
 "'email',md5(pg_get_functiondef('private.require_valid_guest_checkout_email()'::regprocedure)),"+
 "'timestamp',md5(pg_get_functiondef('private.set_order_status_changed_at()'::regprocedure)))::text"
));
ok(signatures.owner==='05ce287ad79d503487ecb04de243ff7d',
 'Authenticated owner-binding original SQL equals effective Production definition');
ok(signatures.email==='8054195435f9246d9be2a04aadb27804',
 'Guest-email original SQL equals effective Production definition');
ok(signatures.timestamp==='760ff7476bfcfcf7007a07df49f6e262',
 'Status-change timestamp original SQL equals effective Production definition');
ok(count("SELECT count(*) FROM public.orders o JOIN auth.users u ON o.user_id=u.id "+
 "WHERE o.id='STAGE80-CUSTOMER-001' AND lower(o.user_email)=lower(u.email)")===1,
 'Signed customer checkout stores immutable auth UUID, not client-supplied ID');
ok(count("SELECT count(*) FROM public.orders WHERE id IN "+
 "('STAGE80-VARIANTS-001','STAGE80-BASE-001') AND user_id IS NULL")===2,
 'Two valid guest checkouts never impersonate registered users');
ok(count("SELECT count(*) FROM public.orders WHERE id='STAGE80-VARIANTS-001' "+
 "AND status='გაუქმებული' AND status_changed_at IS NOT NULL")===1,
 'Real signed staff cancellation records status transition timestamp');
ok(count("SELECT count(*) FROM public.orders WHERE id='STAGE80-CUSTOMER-001' "+
 "AND status='ახალი' AND status_changed_at IS NULL")===1,
 'Unchanged authenticated order has no invented status-transition timestamp');
const beforeOrder=count("SELECT count(*) FROM public.orders WHERE id LIKE 'STAGE84-%'");
const beforeStock=count("SELECT stock FROM public.products WHERE id='STAGE80-BASE'");
const beforeEvents=count("SELECT count(*) FROM private.inventory_movements WHERE product_id='STAGE80-BASE'");
const anon=createClient(API_URL,ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function attempt(id,email){
 const p_order={
  id,customer_name:'Stage84 synthetic guest',phone:'+995555123456',
  address:'CI-only checkout',user_email:'guest',delivery_region:'tbilisi',
  items:[{id:'STAGE80-BASE',quantity:1}]
 };
 if(email!==undefined)p_order.customer_email=email;
 const result=await anon.rpc('create_order_with_stock',{p_order});
 ok(result.error?.code==='22023','Guest missing/malformed email must fail at real SQL trigger: '+id+' got '+JSON.stringify(result.error));
}
await attempt('STAGE84-NO-EMAIL');
await attempt('STAGE84-BAD-EMAIL','bad-email');
ok(count("SELECT count(*) FROM public.orders WHERE id LIKE 'STAGE84-%'")===beforeOrder,
 'Rejected guest checkouts create no phantom order records');
ok(count("SELECT stock FROM public.products WHERE id='STAGE80-BASE'")===beforeStock,
 'Rejected guest checkouts roll back all stock deduction');
ok(count("SELECT count(*) FROM private.inventory_movements WHERE product_id='STAGE80-BASE'")===beforeEvents,
 'Rejected guest checkouts cannot leak phantom stock movement records');
console.log('PASS Stage84: '+checks+
 ' real signed checkout ownership/email/status trigger compatibility checks on localhost.');
