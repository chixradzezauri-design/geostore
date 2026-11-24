import { georgianBusinessDay } from './businessPeriodComparison.js';
import { getFinancialOrderEventDate } from './financeOrderReconciliation.js';
const DAY=86400000;
const isDelivered=order=>['დასრულებული','ჩაბარებულია','delivered','completed','доставлен','завершён','завершен'].includes(String(order?.status||'').trim().toLowerCase());
const cents=value=>{
  if(typeof value==='string'&&/^\d+(?:\.\d{1,2})?$/.test(value.trim()))value=Number(value);
  if(typeof value!=='number'||!Number.isFinite(value)||value<0)return null;
  const n=Math.round(value*100);
  return Number.isSafeInteger(n)&&Math.abs(value*100-n)<1e-5?n:null;
};
const bucket=()=>({orders:0,revenue:0,discount:0,subtotal:0,delivery:0});
function add(b,amounts){
  if(!['revenue','discount','subtotal','delivery'].every(k=>Number.isSafeInteger(b[k]+amounts[k])))return false;
  b.orders++;for(const k of ['revenue','discount','subtotal','delivery'])b[k]+=amounts[k];return true;
}
const summarize=b=>({orders:b.orders,revenue:b.revenue/100,discount:b.discount/100,subtotal:b.subtotal/100,delivery:b.delivery/100,averageOrder:b.orders?b.revenue/b.orders/100:null});
// This is coupon-associated turnover, not incremental revenue, conversion,
// profit or advertising ROI. Never infer campaign membership from product IDs.
export function analyzeBusinessCampaigns({orders,verified=false,days=30,now=new Date()}={}){
  if(!verified||!Array.isArray(orders)||![30,90,365].includes(days)||!(now instanceof Date)||!Number.isFinite(now.getTime()))return null;
  const end=georgianBusinessDay(now.toISOString());
  if(end===null)return null;
  const start=end-days*DAY;
  let deliveredOrders=0,missingDates=0,legacyDates=0,missingBreakdown=0,mismatch=0,unattributedDiscount=0,zeroDiscountCode=0,overflow=false;
  const withCoupon=bucket(),withoutRecordedCoupon=bucket(),codes=new Map();
  for(const order of orders){
    if(!isDelivered(order))continue;
    const day=georgianBusinessDay(getFinancialOrderEventDate(order,true));
    if(day===null){missingDates++;continue;}
    if(day<start||day>=end)continue;
    deliveredOrders++;
    if(!(order.status_changed_at||order.statusChangedAt))legacyDates++;
    const b=order.checkoutBreakdown;
    if(!b||typeof b!=='object'||Array.isArray(b)){missingBreakdown++;continue;}
    const raw=Object.prototype.hasOwnProperty.call(order,'rawTotalGEL')?order.rawTotalGEL:order.totalGEL??order.total_gel;
    const revenue=cents(raw),subtotal=cents(b.subtotalGEL),discount=cents(b.discountGEL),delivery=cents(b.deliveryGEL);
    if([revenue,subtotal,discount,delivery].some(v=>v===null)||discount>subtotal||!Number.isSafeInteger(subtotal-discount+delivery)||revenue!==subtotal-discount+delivery){mismatch++;continue;}
    const rawCode=b.couponCode;
    if(rawCode!==undefined&&rawCode!==null&&typeof rawCode!=='string'){mismatch++;continue;}
    const code=typeof rawCode==='string'?rawCode.trim().toUpperCase():'';
    if(code.length>64||/\s/.test(code)){mismatch++;continue;}
    const amounts={revenue,subtotal,discount,delivery};
    if(discount>0&&!code){unattributedDiscount++;continue;}
    if(code&&discount===0){zeroDiscountCode++;continue;}
    if(!code){if(!add(withoutRecordedCoupon,amounts))overflow=true;continue;}
    const entry=codes.get(code)||bucket();
    if(!add(withCoupon,amounts)||!add(entry,amounts)){overflow=true;continue;}
    codes.set(code,entry);
  }
  if(missingDates||overflow)return {status:'data-quality',missingDates,overflow};
  const classifiedOrders=withCoupon.orders+withoutRecordedCoupon.orders;
  const unknownOrders=deliveredOrders-classifiedOrders;
  const byCode=[...codes.entries()].map(([code,entry])=>({code,...summarize(entry)})).sort((a,b)=>b.orders-a.orders||b.revenue-a.revenue||a.code.localeCompare(b.code));
  return {status:'ready',days,from:new Date(start).toISOString().slice(0,10),to:new Date(end-DAY).toISOString().slice(0,10),
    deliveredOrders,classifiedOrders,unknownOrders,legacyDates,missingBreakdown,mismatch,unattributedDiscount,zeroDiscountCode,
    withCoupon:summarize(withCoupon),withoutRecordedCoupon:summarize(withoutRecordedCoupon),
    couponShare:classifiedOrders?withCoupon.orders/classifiedOrders*100:null,
    byCode};
}
