const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const limit=5000000000000000000n;
export const paymentMethods={bank_transfer:'საბანკო გადარიცხვა',cash:'ნაღდი',other:'სხვა'};
const methodValid=v=>typeof v==='string'&&Object.hasOwn(paymentMethods,v);
const referenceValid=v=>typeof v==='string'&&v===v.trim()&&v.length>=1&&v.length<=120&&!/[\u0000-\u001f\u007f-\u009f]/.test(v);
const decimal=v=>typeof v==='string'&&/^(0|[1-9]\d{0,18})$/.test(v)&&BigInt(v)<=limit;
export function parsePaymentGEL(value){
 if(typeof value!=='string'||!/^\d{1,17}(?:\.\d{1,2})?$/.test(value))return null;
 const [whole,fraction='']=value.split('.'),n=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 return n>0n&&n<=limit?n.toString():null;
}
export function normalizePayment(payment){
 if(!decimal(payment?.amount_tetri)||payment.amount_tetri==='0'||!methodValid(payment.method)||!referenceValid(payment.reference))return null;
 return {amount_tetri:payment.amount_tetri,method:payment.method,reference:payment.reference};
}
function verifyRecord(record,purchaseId){
 if(!uuid(record?.id)||record.purchase_id!==purchaseId||!normalizePayment(record)||!decimal(record.recorded_revision)||BigInt(record.recorded_revision)<2n||!Number.isFinite(Date.parse(record.recorded_at)))throw Error('გადახდის ჩანაწერი ვერ დადასტურდა.');
 return record;
}
export function verifyPaymentSnapshot(data,order){
 if(!order||!uuid(order.id)||!Number.isSafeInteger(order.revision)||data?.purchase_id!==order.id||data.revision!==String(order.revision)||!['received_tetri','paid_tetri','balance_tetri','payment_count'].every(k=>decimal(data[k]))||typeof data.has_more!=='boolean'||!Array.isArray(data.payments))throw Error('გადახდის ისტორია შეიცვალა ან ვერ დადასტურდა.');
 const received=order.admin_purchase_lines.reduce((sum,l)=>sum+BigInt(Math.round(l.unit_cost*100))*BigInt(l.received_quantity),0n);
 const paid=BigInt(data.paid_tetri),count=BigInt(data.payment_count);
 if(received!==BigInt(data.received_tetri)||paid+BigInt(data.balance_tetri)!==received||data.has_more!==(count>100n)||BigInt(data.payments.length)!==(count>100n?100n:count))throw Error('გადახდის ჯამები არ ემთხვევა შესყიდვას.');
 const ids=new Set(),refs=new Set(),revisions=new Set(),correctionIds=new Set();let sum=0n,corrected=0n;
 const correctionCount=data.correction_count??'0';
 if(!decimal(correctionCount)||BigInt(correctionCount)>count)throw Error('კორექტირების რაოდენობა არასწორია.');
 for(const record of data.payments){
  verifyRecord(record,order.id);const ref=record.reference.toLowerCase();
  if(ids.has(record.id)||refs.has(ref)||revisions.has(record.recorded_revision)||BigInt(record.recorded_revision)>BigInt(order.revision))throw Error('გადახდის დუბლირებული ან შეცვლილი ჩანაწერი.');
  ids.add(record.id);refs.add(ref);revisions.add(record.recorded_revision);
  const c=record.correction;
  if(c!=null){
   if(!uuid(c.id)||correctionIds.has(c.id)||typeof c.reason!=='string'||c.reason.trim()!==c.reason||c.reason.length<5||c.reason.length>300||!decimal(c.recorded_revision)||BigInt(c.recorded_revision)<=BigInt(record.recorded_revision)||BigInt(c.recorded_revision)>BigInt(order.revision)||revisions.has(c.recorded_revision)||!Number.isFinite(Date.parse(c.recorded_at)))throw Error('კორექტირების ისტორია ვერ დადასტურდა.');
   correctionIds.add(c.id);revisions.add(c.recorded_revision);corrected++;
  }else sum+=BigInt(record.amount_tetri);
 }
 if(corrected>BigInt(correctionCount)||(!data.has_more&&corrected!==BigInt(correctionCount))||sum>paid||(!data.has_more&&sum!==paid))throw Error('გადახდის ისტორია არასრულია.');
 return data;
}
export function paymentMatches(record,operation){
 return record?.id===operation?.paymentId&&record.purchase_id===operation.orderId&&record.amount_tetri===operation.payment.amount_tetri&&record.method===operation.payment.method&&record.reference===operation.payment.reference&&record.recorded_revision===String(operation.order.revision+1);
}
export function verifyPaymentAcknowledgement(data,operation){
 verifyRecord(data,operation.orderId);
 if(!paymentMatches(data,operation)||typeof data.idempotent_replay!=='boolean')throw Error('გადახდის დადასტურება არ ემთხვევა მოთხოვნას.');
 return data;
}
export function paymentOperationConfirmed(snapshot,operation){
 return !!snapshot&&snapshot.purchase_id===operation.orderId&&snapshot.payments.some(p=>paymentMatches(p,operation));
}

export function validCorrectionReason(reason){
 return typeof reason==='string'&&reason===reason.trim()&&reason.length>=5&&reason.length<=300&&!/[\u0000-\u001f\u007f-\u009f]/.test(reason);
}
export function verifyCorrectionAcknowledgement(data,op){
 if(!uuid(data?.id)||data.id!==op.correctionId||data.purchase_id!==op.orderId||data.payment_id!==op.paymentId||data.amount_tetri!==op.amountTetri||data.reason!==op.reason||data.recorded_revision!==String(op.order.revision+1)||!Number.isFinite(Date.parse(data.recorded_at))||typeof data.idempotent_replay!=='boolean')throw Error('კორექტირების პასუხი ვერ დადასტურდა.');
 return data;
}
export function correctionOperationConfirmed(snapshot,op){
 return snapshot?.purchase_id===op.orderId&&snapshot.payments.some(p=>p.id===op.paymentId&&p.amount_tetri===op.amountTetri&&p.correction?.id===op.correctionId&&p.correction.reason===op.reason&&p.correction.recorded_revision===String(op.order.revision+1));
}
const aggregateDecimal=v=>typeof v==='string'&&/^(0|[1-9]\d{0,127})$/.test(v);
export function verifySupplierBalance(data,supplierId){
 if(!data||(supplierId!==null&&!uuid(supplierId))||data.supplier_id!==supplierId||!['purchase_count','received_tetri','paid_tetri','balance_tetri'].every(k=>aggregateDecimal(data[k]))||BigInt(data.paid_tetri)+BigInt(data.balance_tetri)!==BigInt(data.received_tetri)||(data.purchase_count==='0'&&data.received_tetri!=='0'))throw Error('მომწოდებლის საერთო ბალანსი ვერ დადასტურდა.');
 return data;
}
