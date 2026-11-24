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
