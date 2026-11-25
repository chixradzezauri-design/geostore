import {previewFlashSaleWindow} from './adminFlashSalePlanning.js';
import {previewFlashPrices,selectedFlashRows} from './adminFlashPricePreview.js';
const validSelection=ids=>Array.isArray(ids)&&ids.length>=1&&ids.length<=500&&ids.every(id=>typeof id==='string'&&id.trim()&&id.length<=200)&&new Set(ids).size===ids.length;
export function buildFlashScheduleRequest(form,plannedStart,now=Date.now(),products){
 const percent=Number(form?.discountPercent),category=String(form?.category??'').trim(),duration=Number(form?.durationHours);
 const window=previewFlashSaleWindow(duration,plannedStart,now);
 if(!plannedStart||!window||window.startsAt<now+60000||window.startsAt>now+180*86400000||
 !/^\d+(?:\.\d{1,2})?$/.test(String(form?.discountPercent??'').trim())||!Number.isFinite(percent)||percent<=0||percent>=100||!category||category.length>200)return null;
 const selected=Array.isArray(form?.selectedIds);
 if(selected&&(!validSelection(form.selectedIds)||!selectedFlashRows(previewFlashPrices(products,form,true),form.selectedIds)))return null;
 return {p_category:category,p_discount_percent:percent,p_duration_hours:duration,p_starts_at:new Date(window.startsAt).toISOString(),...(selected?{p_product_ids:[...form.selectedIds]}:{})};
}
export function validateFlashScheduleRows(data){
 if(!Array.isArray(data)||data.length>100)throw Error('აქციების სიის პასუხი არასწორია.');
 const ids=new Set();
 for(const row of data){
  if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id)||typeof row.category!=='string'||
   !['pending','started','cancelled','skipped'].includes(row.status)||!Number.isFinite(Date.parse(row.starts_at))||
   !(Date.parse(row.ends_at)>Date.parse(row.starts_at))||!Number.isFinite(Number(row.discount_percent))||
   !(Number(row.discount_percent)>0&&Number(row.discount_percent)<100)||
   !Number.isInteger(row.updated_count)||row.updated_count<0||
   (row.product_ids!=null&&(!validSelection(row.product_ids)||row.updated_count>row.product_ids.length)))throw Error('აქციის ჩანაწერი არასწორია.');
  ids.add(row.id);
 }
 return [...data].sort((a,b)=>Number(b.status==='pending')-Number(a.status==='pending')||
  (a.status==='pending'?Date.parse(a.starts_at)-Date.parse(b.starts_at):Date.parse(b.starts_at)-Date.parse(a.starts_at)));
}
export function flashScheduleStatus(row,now=Date.now()){
 if(row.status==='started')return Date.parse(row.ends_at)<=now?'ვადა გასულია':'გაშვებული';
 if(row.status==='pending')return Date.parse(row.starts_at)<=now?'გაშვების მოლოდინში':'დაგეგმილი';
 return row.status==='cancelled'?'გაუქმებული':'გამოტოვებული';
}

// Counts describe only returned schedule records, never sales or revenue attribution.
export function summarizeFlashSchedule(rows,now=Date.now()){
 const totals={pending:0,active:0,ended:0,cancelled:0,skipped:0,productUpdates:0};
 for(const row of rows){
  if(row.status==='started'){
   totals[Date.parse(row.ends_at)<=now?'ended':'active']++;
   totals.productUpdates+=row.updated_count;
  }else if(['pending','cancelled','skipped'].includes(row.status))totals[row.status]++;
 }
 return totals;
}
export function filterFlashSchedule(rows,filter='all',query='',now=Date.now()){
 const needle=String(query).trim().toLocaleLowerCase('ka-GE');
 return rows.filter(row=>{
  const status=row.status==='started'?(Date.parse(row.ends_at)<=now?'ended':'active'):row.status;
  return (filter==='all'||filter===status)&&(needle===''||row.category.toLocaleLowerCase('ka-GE').includes(needle));
 });
}
