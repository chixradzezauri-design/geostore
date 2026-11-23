// Stage85: signed checkout plus all eight real order trigger behaviors, local only.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
const {API_URL,ANON_KEY}=process.env;
assert.ok(API_URL&&ANON_KEY,'Local Supabase keys required');
const target=new URL(API_URL);
assert.equal(target.protocol,'http:');
assert.ok(['127.0.0.1','localhost'].includes(target.hostname),
 'Never send Stage85 SQL or signed requests to a remote Supabase instance');
let checks=0;
const ok=(bool,msg)=>{assert.ok(bool,msg);checks++};
const sql=s=>execFileSync('psql',['-h','127.0.0.1','-p','54322','-U','postgres',
 '-d','postgres','-X','-A','-t','-v','ON_ERROR_STOP=1','-c',s],{
 encoding:'utf8',timeout:30000,env:{...process.env,PGPASSWORD:'postgres'}
}).trim();
const count=s=>Number(sql(s));
const fails=(s,msg)=>{
 try{sql(s)}catch(e){ok(/ERROR:/.test(String(e.stderr||e)),msg);return}
 assert.fail('Stage85 rejected update was accepted: '+msg);
};
const funcs=JSON.parse(sql(
 "SELECT jsonb_object_agg(p.proname,md5(pg_get_functiondef(p.oid)))::text"+
 " FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private'"+
 " AND p.proname IN ('guard_order_status_transition','prevent_cancellation_after_dispatch',"+
 "'record_order_notification','reject_unpublished_products_in_new_orders')"
));
const expected={
 guard_order_status_transition:'1d9416404461fe1a62cfd48c6360fdd3',
 prevent_cancellation_after_dispatch:'9d76f0e24a34ba8838eebe032fad80fe',
 record_order_notification:'32a3405eecdb3731a9d53305ea61d405',
 reject_unpublished_products_in_new_orders:'83728cba6f42d3c645d7da353a508d0e'
};
for(const [name,hash] of Object.entries(expected))
 ok(funcs[name]===hash,'Compiled source differs from read-only effective Production: '+name);
const triggerHash=JSON.parse(sql(
 "SELECT jsonb_object_agg(t.tgname,md5(pg_get_triggerdef(t.oid)))::text"+
 " FROM pg_trigger t WHERE t.tgrelid='public.orders'::regclass AND NOT t.tgisinternal"
));
const names={
 orders_guard_status_transition:'01650b9479acbecb4a74260e8011be60',
 prevent_cancellation_after_dispatch:'682e1db2c45a4f7aa4ab4cfe80a5cc56',
 orders_record_notification_after_insert:'93a7d463be9be0f727e51fec88f01ab2',
 orders_record_notification_after_status_update:'175e39d569346a415f921487dcf02112',
 reject_unpublished_products_in_new_orders:'36d0286796dc2a750e913c4107028d07'
};
for(const [name,hash] of Object.entries(names))
 ok(triggerHash[name]===hash,'Trigger DDL differs from Production catalog: '+name);
ok(Object.keys(triggerHash).length===8,
 'All eight current Production order triggers installed in disposable CI');
const owned='STAGE80-CUSTOMER-001',guest='STAGE80-BASE-001',cancel='STAGE80-VARIANTS-001';
ok(count("SELECT count(*) FROM public.order_notifications n JOIN public.orders o ON o.id=n.order_id"+
 " WHERE o.id='"+owned+"' AND n.event_key='created:ახალი'"+
 " AND n.recipient_user_id=o.user_id AND n.recipient_user_id IS NOT NULL")===1,
 'Real signed customer checkout emitted one UUID-owned creation notification');
ok(count("SELECT count(*) FROM public.order_notifications WHERE order_id IN ('"+
 guest+"','"+cancel+"')")===0,
 'Guest order events never impersonate a user or generate owner notifications');
sql("UPDATE public.orders SET status='მუშავდება' WHERE id='"+owned+"'");
ok(count("SELECT count(*) FROM public.order_notifications WHERE order_id='"+owned+"'")===2,
 'First customer status change emitted exactly one new notification');
ok(count("SELECT count(*) FROM public.orders WHERE id='"+owned+"' AND status_changed_at IS NOT NULL")===1,
 'Status-changing order timestamp tracked by original before-update trigger');
sql("UPDATE public.orders SET status='მუშავდება' WHERE id='"+owned+"'");
ok(count("SELECT count(*) FROM public.order_notifications WHERE order_id='"+owned+"'")===2,
 'Repeated status did not duplicate a customer notification');
sql("UPDATE public.orders SET status='გაგზავნილი' WHERE id='"+guest+"'");
fails("UPDATE public.orders SET status='გაუქმებული' WHERE id='"+guest+"'",
 'Shipped order cannot be canceled to mint a duplicate stock refund');
ok(count("SELECT count(*) FROM public.orders WHERE id='"+guest+"' AND status='გაგზავნილი'")===1,
 'Dispatched order status unchanged after rejected cancellation');
sql("UPDATE public.orders SET status='დასრულებული' WHERE id='"+guest+"'");
fails("UPDATE public.orders SET status='ახალი' WHERE id='"+guest+"'",
 'Completed order cannot regress to a new order');
ok(count("SELECT count(*) FROM public.orders WHERE id='"+guest+"' AND status='დასრულებული'")===1,
 'Completed order remains final after blocked status regression');
fails("UPDATE public.orders SET status='ახალი',stock_restored_at=NULL,"+
 "stock_deducted_at=now() WHERE id='"+cancel+"'",
 'Canceled order cannot reactivate through a direct table update');
ok(count("SELECT count(*) FROM public.orders WHERE id='"+cancel+"' AND status='გაუქმებული'")===1,
 'Unauthorized cancellation reactivation rejected atomically');
const beforeOrders=count("SELECT count(*) FROM public.orders WHERE id LIKE 'STAGE85-%'");
const beforeStock=count("SELECT stock FROM public.products WHERE id='STAGE80-BASE'");
const beforeLedger=count("SELECT count(*) FROM private.inventory_movements WHERE product_id='STAGE80-BASE'");
sql("UPDATE public.products SET is_published=false WHERE id='STAGE80-BASE'");
const anon=createClient(API_URL,ANON_KEY,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
});
const result=await anon.rpc('create_order_with_stock',{p_order:{
 id:'STAGE85-UNPUBLISHED',customer_name:'Synthetic hidden product attempt',
 phone:'+995555123456',address:'Disposable CI data only',
 user_email:'guest',customer_email:'stage85@example.test',delivery_region:'tbilisi',
 items:[{id:'STAGE80-BASE',quantity:1}]
}});
ok(result.error?.code==='23514',
 'Unpublished product rejected by authentic Production BEFORE INSERT trigger: '+JSON.stringify(result.error));
ok(count("SELECT count(*) FROM public.orders WHERE id LIKE 'STAGE85-%'")===beforeOrders,
 'Rejected unpublished-product checkout creates no phantom order');
ok(count("SELECT stock FROM public.products WHERE id='STAGE80-BASE'")===beforeStock,
 'Unpublished checkout rolls back stock deduction');
ok(count("SELECT count(*) FROM private.inventory_movements WHERE product_id='STAGE80-BASE'")===beforeLedger,
 'Unpublished checkout rolls back all inventory ledger activity');
sql("UPDATE public.products SET is_published=true WHERE id='STAGE80-BASE'");
ok(count("SELECT count(*) FROM public.order_notifications WHERE order_id='"+owned+"'")===2,
 'Rejected guest checkout and status denials never create extra owner notifications');
console.log('PASS Stage85: '+checks+
 ' all-eight-order-trigger source/DDL parity, owner notification, status protection and unpublished checkout rollback checks (signed local Auth/PostgREST).');
