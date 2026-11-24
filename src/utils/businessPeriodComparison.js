import { getFinancialOrderEventDate } from './financeOrderReconciliation.js';

// Compare complete Georgian calendar days, not partial today or device-local time.
const DAY = 86400000;
const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tbilisi', year: 'numeric', month: '2-digit', day: '2-digit' });
const calendarDay = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.getTime() : null;
};
const dayOfInstant = date => {
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(dateFormatter.formatToParts(date).map(({type,value})=>[type,value]));
  return calendarDay(Number(parts.year),Number(parts.month),Number(parts.day));
};
export function georgianBusinessDay(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return calendarDay(+iso[1],+iso[2],+iso[3]);
  const local = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(raw);
  if (local) return calendarDay(+local[3],+local[2],+local[1]);
  // Reject ambiguous time strings and impossible calendar dates.
  const timestamp = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.exec(raw);
  if (!timestamp || calendarDay(+timestamp[1],+timestamp[2],+timestamp[3]) === null) return null;
  return dayOfInstant(new Date(raw));
}
const delivered = order => ['დასრულებული','ჩაბარებულია','delivered','completed','доставлен','завершён','завершен'].includes(String(order?.status || '').trim().toLowerCase());
const cents = value => {
  if (typeof value === 'string' && /^\d+(?:\.\d{1,2})?$/.test(value.trim())) value = Number(value);
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const amount = Math.round(value*100);
  return Number.isSafeInteger(amount) && Math.abs(value*100-amount)<1e-5 ? amount : null;
};
const range = (from,to) => ({from:new Date(from).toISOString().slice(0,10),to:new Date(to-DAY).toISOString().slice(0,10),orders:0,revenueCents:0,missingTotals:0,legacyDates:0});
const delta = (current,previous) => current === null || previous === null || previous === 0 ? null : (current-previous)/previous*100;
export function compareBusinessPeriods({ orders, verified = false, days = 30, now = new Date() } = {}) {
  if (!verified || !Array.isArray(orders) || ![7,30,90].includes(days) || !(now instanceof Date)) return null;
  const end = dayOfInstant(now);
  if (end === null) return null;
  const split=end-days*DAY, start=split-days*DAY;
  const current=range(split,end), previous=range(start,split);
  let missingDates=0;
  for (const order of orders) {
    if (!delivered(order)) continue;
    const day=georgianBusinessDay(getFinancialOrderEventDate(order,true));
    if (day===null) { missingDates++; continue; }
    const target=day>=split && day<end ? current : day>=start && day<split ? previous : null;
    if (!target) continue;
    target.orders++;
    if (!(order.status_changed_at || order.statusChangedAt)) target.legacyDates++;
    const raw=Object.prototype.hasOwnProperty.call(order,'rawTotalGEL') ? order.rawTotalGEL : order.totalGEL ?? order.total_gel;
    const value=cents(raw);
    if (value===null || !Number.isSafeInteger(target.revenueCents+value)) target.missingTotals++;
    else target.revenueCents+=value;
  }
  const summarize = ({revenueCents,...period}) => {
    const revenue = missingDates || period.missingTotals ? null : revenueCents/100;
    return {...period, orders: missingDates ? null : period.orders, revenue,
      averageOrder: revenue===null || !period.orders ? null : revenue/period.orders};
  };
  const a=summarize(current), b=summarize(previous);
  return {days,current:a,previous:b,missingDates,
    change:{revenue:delta(a.revenue,b.revenue),orders:delta(a.orders,b.orders),averageOrder:delta(a.averageOrder,b.averageOrder)}};
}

// Transparent baseline, not a trained model or a statistical confidence interval.
// Four consecutive complete 7-day windows; include zero-sale days/weeks.
export function forecastBusinessSales({ orders, verified = false, horizon = 7, now = new Date() } = {}) {
  if (!verified || !Array.isArray(orders)) return {status:'unverified'};
  if (![7,30].includes(horizon) || !(now instanceof Date)) return {status:'invalid'};
  const end=dayOfInstant(now);
  if (end===null) return {status:'invalid'};
  const start=end-28*DAY;
  const weeks=Array.from({length:4},()=>({orders:0,revenueCents:0}));
  let earliest=null, missingDates=0, missingTotals=0, legacyDates=0;
  for (const order of orders) {
    if (!delivered(order)) continue;
    const day=georgianBusinessDay(getFinancialOrderEventDate(order,true));
    if (day===null) { missingDates++; continue; }
    if (day>=end) continue;
    earliest=earliest===null?day:Math.min(earliest,day);
    if (day<start) continue;
    const week=weeks[Math.floor((day-start)/(7*DAY))];
    week.orders++;
    if (!(order.status_changed_at || order.statusChangedAt)) legacyDates++;
    const raw=Object.prototype.hasOwnProperty.call(order,'rawTotalGEL')?order.rawTotalGEL:order.totalGEL??order.total_gel;
    const value=cents(raw);
    if (value===null || !Number.isSafeInteger(week.revenueCents+value)) missingTotals++;
    else week.revenueCents+=value;
  }
  const observedOrders=weeks.reduce((sum,week)=>sum+week.orders,0);
  const activeWeeks=weeks.filter(week=>week.orders>0).length;
  const detail={observedOrders,activeWeeks,missingDates,missingTotals,legacyDates};
  if (missingDates || missingTotals || legacyDates) return {status:'data-quality',...detail};
  // Require evidence of history spanning the training window, and avoid
  // forecasting from a handful of orders concentrated in one or two weeks.
  if (earliest===null || earliest>start || observedOrders<12 || activeWeeks<3) return {status:'insufficient',...detail};
  const totalCents=weeks.reduce((sum,week)=>sum+week.revenueCents,0);
  if (!Number.isSafeInteger(totalCents)) return {status:'data-quality',...detail,missingTotals:missingTotals+1};
  const factor=horizon/7;
  const project=values=>({
    low:Math.min(...values)*factor,
    baseline:values.reduce((sum,value)=>sum+value,0)/4*factor,
    high:Math.max(...values)*factor
  });
  const revenue=project(weeks.map(week=>week.revenueCents/100));
  const projectedOrders=project(weeks.map(week=>week.orders));
  if (!Object.values(revenue).every(value=>Number.isFinite(value)&&value<=Number.MAX_SAFE_INTEGER/100)) return {status:'data-quality',...detail,missingTotals:missingTotals+1};
  return {status:'ready',...detail,horizon,
    historyFrom:new Date(start).toISOString().slice(0,10),
    historyTo:new Date(end-DAY).toISOString().slice(0,10),
    forecastFrom:new Date(end).toISOString().slice(0,10),
    forecastTo:new Date(end+(horizon-1)*DAY).toISOString().slice(0,10),
    revenue,orders:projectedOrders};
}
