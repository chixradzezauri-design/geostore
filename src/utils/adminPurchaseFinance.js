import {verifyPurchaseRows,normalizePurchaseLines} from './adminPurchaseApi.js';

// Exact integer tetri; BigInt prevents rounding/overflow for aggregated large orders.
const cents=value=>BigInt(Math.round(value*100));
const blank=()=>({draft:0n,committed:0n,received:0n,outstanding:0n,cancelled:0n,count:0});
export function formatPurchaseTetri(value){
 if(typeof value!=='bigint'||value<0n)return '—';
 const whole=(value/100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ');
 return whole+'.'+(value%100n).toString().padStart(2,'0')+' ₾';
}
export function purchaseDraftTetri(lines){
 const normalized=normalizePurchaseLines(lines);
 return normalized?normalized.reduce((sum,line)=>sum+cents(line.unit_cost)*BigInt(line.quantity),0n):null;
}
export function summarizePurchaseFinance(orders){
 // Do not silently treat a damaged or partial nested receipt history as zero.
 const verified=verifyPurchaseRows(orders),total=blank(),suppliers=new Map(),byOrder=new Map();
 for(const order of verified){
  const row=blank();row.count=1;
  const planned=order.admin_purchase_lines.reduce((sum,line)=>sum+cents(line.unit_cost)*BigInt(line.quantity),0n);
  const received=order.admin_purchase_lines.reduce((sum,line)=>sum+cents(line.unit_cost)*BigInt(line.received_quantity),0n);
  if(order.status==='draft')row.draft=planned;
  else if(order.status==='cancelled')row.cancelled=planned;
  else {row.committed=planned;row.received=received;row.outstanding=planned-received;}
  const supplier=suppliers.get(order.supplier_id)||{id:order.supplier_id,name:order.supplier_name,...blank()};
  if(supplier.name!==order.supplier_name)throw Error('მომწოდებლის ისტორიული სახელი არ ემთხვევა.');
  for(const key of ['draft','committed','received','outstanding','cancelled','count']){supplier[key]+=row[key];total[key]+=row[key];}
  suppliers.set(order.supplier_id,supplier);byOrder.set(order.id,row);
 }
 return {total,suppliers:[...suppliers.values()].sort((a,b)=>a.received===b.received?a.name.localeCompare(b.name,'ka'):a.received>b.received?-1:1),byOrder};
}
