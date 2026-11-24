import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePaymentGEL,normalizePayment,verifyPaymentSnapshot,verifyPaymentAcknowledgement,paymentOperationConfirmed} from '../src/utils/adminPurchasePayments.js';
import {createAdminPurchaseApi} from '../src/utils/adminPurchaseApi.js';
const id='10000000-0000-4000-8000-000000000001',paymentId='20000000-0000-4000-8000-000000000001';
const payment={amount_tetri:'100',method:'cash',reference:'receipt-1'};
const order={id,status:'partial',revision:3,admin_purchase_lines:[{unit_cost:4.25,received_quantity:2}]};
const operation={type:'payment',orderId:id,order,paymentId,payment};
const record={...payment,id:paymentId,purchase_id:id,recorded_revision:'4',recorded_at:'2026-11-24T12:00:00Z'};
const snapshot={purchase_id:id,revision:'4',received_tetri:'850',paid_tetri:'100',balance_tetri:'750',payment_count:'1',has_more:false,payments:[record]};
test('parse exact positive amounts, reject fractional tetri and unsafe reference',()=>{
 assert.equal(parsePaymentGEL('0.01'),'1');assert.equal(parsePaymentGEL('1000000000000000.01'),'100000000000000001');
 for(const x of ['','0','1.001','-1','1e3','50000000000000000.01'])assert.equal(parsePaymentGEL(x),null);
 assert.deepEqual(normalizePayment(payment),payment);assert.equal(normalizePayment({...payment,reference:'a\nb'}),null);
});
test('verify exact revision and totals including immutable history',()=>{
 const after={...order,revision:4};
 assert.equal(verifyPaymentSnapshot(snapshot,after),snapshot);
 assert.throws(()=>verifyPaymentSnapshot(snapshot,order));
 assert.throws(()=>verifyPaymentSnapshot({...snapshot,balance_tetri:'751'},after));
 assert.throws(()=>verifyPaymentSnapshot({...snapshot,paid_tetri:'200',balance_tetri:'650'},after));
 assert.throws(()=>verifyPaymentSnapshot({...snapshot,payments:[]},after));
 assert.equal(paymentOperationConfirmed(snapshot,operation),true);
 assert.equal(paymentOperationConfirmed(snapshot,{...operation,payment:{...payment,reference:'wrong'}}),false);
 assert.throws(()=>verifyPaymentAcknowledgement({...record,idempotent_replay:false,amount_tetri:'101'},operation));
});
test('payment API preserves UUID, decimal string and original revision; guards owner',async()=>{
 const owner='1060de3d-d28a-45f8-9a64-5e0368cffc4b';let calls=0;
 const config={loadSession:async()=>({data:{session:{user:{id:owner,app_metadata:{role:'admin'}},access_token:'fixture'}}}),expectedUserId:owner,supabaseUrl:'https://fixture.invalid',apiKey:'fixture',fetchImpl:async(url,opts)=>{
  calls++;
  if(url.endsWith('/admin_record_purchase_payment')){assert.deepEqual(JSON.parse(opts.body),{p_id:id,p_payment:paymentId,p_revision:3,p_amount_tetri:'100',p_method:'cash',p_reference:'receipt-1'});return {ok:true,json:async()=>({...record,idempotent_replay:true})};}
  assert.deepEqual(JSON.parse(opts.body),{p_id:id});return {ok:true,json:async()=>snapshot};
 }};
 const api=createAdminPurchaseApi(config);
 assert.equal((await api.recordPayment(operation)).idempotent_replay,true);
 assert.equal(await api.payments({...order,revision:4}),snapshot);
 await assert.rejects(createAdminPurchaseApi({...config,expectedUserId:'other'}).recordPayment(operation));assert.equal(calls,2);
});
