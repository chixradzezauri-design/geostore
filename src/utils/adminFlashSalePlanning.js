// Read-only planning and status helpers. Never write prices or schedule RPCs here.
const HOUR = 3600000;
export const FLASH_SALE_HOURS = Object.freeze([1,3,6,12,24,48]);
const timestamp = value => value == null || value === '' ? NaN : Date.parse(value);
export function classifyAdminFlashSales(products, now = Date.now()) {
  const activeProducts=[], upcomingProducts=[];
  for(const p of Array.isArray(products)?products:[]){
    if(!p || (Array.isArray(p.variants)&&p.variants.length))continue;
    const end=timestamp(p.flashSaleEndsAt ?? p.flash_sale_ends_at);
    const rawStart=p.flashSaleStartedAt ?? p.flash_sale_started_at;
    const start=timestamp(rawStart);
    const old=Number(p.oldPriceGEL ?? p.old_price_gel);
    const price=Number(p.priceGEL ?? p.price_gel);
    if(!Number.isFinite(end)||end<=now||!Number.isFinite(old)||!Number.isFinite(price)||price<0||old<=price)continue;
    if(rawStart && (!Number.isFinite(start)||start>=end))continue;
    if(Number.isFinite(start)&&start>now)upcomingProducts.push(p);else activeProducts.push(p);
  }
  const endOf=p=>timestamp(p.flashSaleEndsAt ?? p.flash_sale_ends_at);
  const startOf=p=>timestamp(p.flashSaleStartedAt ?? p.flash_sale_started_at);
  activeProducts.sort((a,b)=>endOf(a)-endOf(b));
  upcomingProducts.sort((a,b)=>startOf(a)-startOf(b));
  return {count:activeProducts.length,activeProducts,upcomingProducts,nextStartsAt:upcomingProducts.length?startOf(upcomingProducts[0]):null,nextEndsAt:activeProducts.length?endOf(activeProducts[0]):null,expiringCount:activeProducts.filter(p=>endOf(p)-now<=24*HOUR).length};
}
export function previewFlashSaleWindow(durationHours, plannedStart, now=Date.now()){
  const duration=Number(durationHours);
  if(!FLASH_SALE_HOURS.includes(duration)||!Number.isFinite(now))return null;
  // Date/time entry is explicitly Georgian time, not browser-local time.
  if(plannedStart && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(plannedStart))return null;
  const start=plannedStart?Date.parse(plannedStart+':00+04:00'):now;
  if(!Number.isFinite(start)||start<now)return null;
  if(plannedStart && new Date(start+4*HOUR).toISOString().slice(0,16)!==plannedStart)return null;
  return {startsAt:start,endsAt:start+duration*HOUR,planningOnly:Boolean(plannedStart)};
}
export function formatFlashSaleTime(value){
  return new Intl.DateTimeFormat('ka-GE',{timeZone:'Asia/Tbilisi',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(value);
}
