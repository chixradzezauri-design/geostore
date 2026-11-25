import {customerOrderProgress} from './customerOrderProgress.js';

const monthFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tbilisi',year:'numeric',month:'2-digit'});
export function purchaseMonth(value){
 if(typeof value!=='string'||!value.trim())return null;
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return null;
 const parts=monthFormat.formatToParts(date);
 return parts.find(x=>x.type==='year').value+'-'+parts.find(x=>x.type==='month').value;
}
function monthKeys(now){
 const key=purchaseMonth(new Date(now).toISOString());
 const [year,month]=key.split('-').map(Number);
 return Array.from({length:6},(_,i)=>new Date(Date.UTC(year,month-1-5+i,15)).toISOString().slice(0,7));
}
export function customerPurchaseStatistics(orders,{period='all',now=Date.now()}={}){
 const months=monthKeys(Number.isFinite(now)&&Math.abs(now)<=8.64e15?now:Date.now());
 const monthSet=new Set(period==='month'?months.slice(-1):months);
 const bins=new Map(months.map(key=>[key,{key,count:0,cents:0}]));
 const seen=new Set();
 const stats={total:0,completed:0,pending:0,cancelled:0,unknown:0,completedCents:0,pricedCompleted:0};
 for(const order of Array.isArray(orders)?orders:[]){
  if(typeof order?.id!=='string'||!order.id.trim()||seen.has(order.id))continue;
  seen.add(order.id);
  const month=purchaseMonth(order.created_at);
  const status=customerOrderProgress(order.status);
  const kind=status.kind==='cancelled'?'cancelled':status.kind!=='active'?'unknown':status.index===3?'completed':'pending';
  const price=typeof order.totalGEL==='number'?Math.round(order.totalGEL*100):NaN;
  const validPrice=Number.isSafeInteger(price)&&price>=0;
  if(kind==='completed'&&bins.has(month)){
   const bin=bins.get(month);
   bin.count++;
   if(validPrice&&Number.isSafeInteger(bin.cents+price))bin.cents+=price;
  }
  if(period!=='all'&&!monthSet.has(month))continue;
  stats.total++;stats[kind]++;
  if(kind==='completed'&&validPrice&&Number.isSafeInteger(stats.completedCents+price)){
   stats.completedCents+=price;
   stats.pricedCompleted++;
  }
 }
 const totalGEL=stats.completedCents/100;
 const averageGEL=stats.pricedCompleted?Math.round(stats.completedCents/stats.pricedCompleted)/100:null;
 return {...stats,totalGEL,averageGEL,months:[...bins.values()].map(({key,count,cents})=>({key,count,totalGEL:cents/100}))};
}
