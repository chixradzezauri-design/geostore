import { georgianBusinessDay } from './businessPeriodComparison.js';
import { getFinancialOrderEventDate } from './financeOrderReconciliation.js';
const DAY=86400000;
const isDelivered=order=>['დასრულებული','ჩაბარებულია','delivered','completed','доставлен','завершён','завершен'].includes(String(order?.status||'').trim().toLowerCase());
const accountKey=order=>{
  const id=order?.user_id;
  return typeof id==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())?id.trim().toLowerCase():null;
};
const quantityOf=value=>{
  if(typeof value==='string'&&/^\d+$/.test(value.trim())) value=Number(value);
  return Number.isSafeInteger(value)&&value>0?value:null;
};
// Aggregates only, no personal identifiers returned. Categories use historical
// order line snapshots, never today's mutable catalog or inferred preferences.
export function analyzeBusinessCustomers({orders,verified=false,days=30,now=new Date()}={}){
  if(!verified||!Array.isArray(orders)||![30,90,365].includes(days)||!(now instanceof Date)||!Number.isFinite(now.getTime()))return null;
  const end=georgianBusinessDay(now.toISOString());
  if(end===null)return null;
  const start=end-days*DAY;
  const accounts=new Map(),categories=new Map();
  let deliveredOrders=0,unlinkedOrders=0,missingDates=0,legacyDates=0,missingLines=0,unknownCategoryUnits=0,knownUnits=0,invalidQuantityLines=0;
  for(const order of orders){
    if(!isDelivered(order))continue;
    const day=georgianBusinessDay(getFinancialOrderEventDate(order,true));
    if(day===null){missingDates++;continue;}
    if(day>=end)continue;
    const key=accountKey(order), inPeriod=day>=start;
    if(key){
      const account=accounts.get(key)||{firstDay:day,periodOrders:0};
      account.firstDay=Math.min(account.firstDay,day);
      if(inPeriod)account.periodOrders++;
      accounts.set(key,account);
    }
    if(!inPeriod)continue;
    deliveredOrders++;
    if(!key)unlinkedOrders++;
    if(!(order.status_changed_at||order.statusChangedAt))legacyDates++;
    if(!Array.isArray(order.items)||order.items.length===0){missingLines++;continue;}
    const seenCategories=new Set();
    for(const item of order.items){
      const qty=quantityOf(item?.quantity);
      if(qty===null){invalidQuantityLines++;continue;}
      const category=typeof item?.category==='string'?item.category.trim():'';
      if(!category){unknownCategoryUnits+=qty;continue;}
      const entry=categories.get(category)||{category,units:0,orders:0};
      entry.units+=qty;
      if(!seenCategories.has(category)){entry.orders++;seenCategories.add(category);}
      categories.set(category,entry);knownUnits+=qty;
    }
  }
  if(missingDates)return {status:'data-quality',missingDates};
  const active=[...accounts.values()].filter(account=>account.periodOrders>0);
  const returning=active.filter(account=>account.firstDay<start).length;
  const repeatInPeriod=active.filter(account=>account.periodOrders>1).length;
  const categoryRows=[...categories.values()].sort((a,b)=>b.units-a.units||a.category.localeCompare(b.category,'ka'));
  const registeredOrders=deliveredOrders-unlinkedOrders;
  return {status:'ready',days,from:new Date(start).toISOString().slice(0,10),to:new Date(end-DAY).toISOString().slice(0,10),
    deliveredOrders,registeredOrders,unlinkedOrders,activeAccounts:active.length,
    firstObservedAccounts:active.length-returning,returningAccounts:returning,repeatInPeriod,
    returningRate:active.length?returning/active.length*100:null,
    repeatRate:active.length?repeatInPeriod/active.length*100:null,
    knownUnits,unknownCategoryUnits,missingLines,invalidQuantityLines,legacyDates,
    categories:categoryRows};
}
