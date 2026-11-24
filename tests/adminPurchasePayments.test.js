import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePaymentGEL,normalizePayment,verifyPaymentSnapshot,verifyPaymentAcknowledgement,paymentOperationConfirmed,validCorrectionReason,verifyCorrectionAcknowledgement,correctionOperationConfirmed,verifySupplierBalance} from '../src/utils/adminPurchasePayments.js';
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

test('corrected payments retain original evidence but are excluded from net paid',()=>{
 const correction={id:'30000000-0000-4000-8000-000000000001',reason:'Duplicate record',recorded_at:'2026-11-24T12:01:00Z',recorded_revision:'5'};
 const corrected={...snapshot,revision:'5',paid_tetri:'0',balance_tetri:'850',correction_count:'1',payments:[{...record,correction}]};
 assert.equal(verifyPaymentSnapshot(corrected,{...order,revision:5}),corrected);
 assert.throws(()=>verifyPaymentSnapshot({...corrected,correction_count:'0'},{...order,revision:5}));
 assert.throws(()=>verifyPaymentSnapshot({...corrected,paid_tetri:'100',balance_tetri:'750'},{...order,revision:5}));
});

test('correction confirmation binds original payment, reason, exact amount and revision',()=>{
 const c={id:'30000000-0000-4000-8000-000000000001',reason:'Duplicate record',recorded_at:'2026-11-24T12:01:00Z',recorded_revision:'5'};
 const op={order:{...order,revision:4},orderId:id,paymentId,correctionId:c.id,amountTetri:'100',reason:c.reason};
 const ack={...c,purchase_id:id,payment_id:paymentId,amount_tetri:'100',idempotent_replay:true};
 assert.equal(verifyCorrectionAcknowledgement(ack,op),ack);
 assert.throws(()=>verifyCorrectionAcknowledgement({...ack,amount_tetri:'101'},op));
 assert.equal(correctionOperationConfirmed({...snapshot,payments:[{...record,correction:c}]},op),true);
 assert.equal(correctionOperationConfirmed(snapshot,op),false);
 assert.equal(validCorrectionReason('bad'),false);assert.equal(validCorrectionReason('Duplicate record'),true);
});
test('aggregate balance validates scope and exact decimal totals larger than per-order bounds',()=>{
 const data={supplier_id:null,purchase_count:'1001',received_tetri:'10000000000000000000000',paid_tetri:'9999999999999999999999',balance_tetri:'1'};
 assert.equal(verifySupplierBalance(data,null),data);
 assert.throws(()=>verifySupplierBalance(data,id));
 assert.throws(()=>verifySupplierBalance({...data,balance_tetri:'2'},null));
 assert.throws(()=>verifySupplierBalance({...data,paid_tetri:1},null));
});
test('correction and aggregate API use exact owner RPC arguments',async()=>{
 const owner='1060de3d-d28a-45f8-9a64-5e0368cffc4b',correctionId='30000000-0000-4000-8000-000000000001';
 const op={order:{...order,revision:4},orderId:id,paymentId,correctionId,amountTetri:'100',reason:'Duplicate record'};
 const config={loadSession:async()=>({data:{session:{user:{id:owner,app_metadata:{role:'admin'}},access_token:'fixture'}}}),expectedUserId:owner,supabaseUrl:'https://fixture.invalid',apiKey:'fixture',fetchImpl:async(url,opts)=>{
 if(url.endsWith('/admin_correct_purchase_payment')){assert.deepEqual(JSON.parse(opts.body),{p_id:id,p_payment:paymentId,p_correction:correctionId,p_revision:4,p_reason:op.reason});return {ok:true,json:async()=>({id:correctionId,purchase_id:id,payment_id:paymentId,amount_tetri:'100',reason:op.reason,recorded_revision:'5',recorded_at:'2026-11-24T12:01:00Z',idempotent_replay:false})};}
 assert.deepEqual(JSON.parse(opts.body),{p_supplier:null});return {ok:true,json:async()=>({supplier_id:null,purchase_count:'1',received_tetri:'850',paid_tetri:'0',balance_tetri:'850'})};
 }};
 const api=createAdminPurchaseApi(config);
 assert.equal((await api.correctPayment(op)).id,correctionId);
 assert.equal((await api.supplierBalance()).balance_tetri,'850');
 await assert.rejects(createAdminPurchaseApi({...config,expectedUserId:'other'}).correctPayment(op));
});
