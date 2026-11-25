import {recentSystemWarnings} from './systemMonitoringWarnings.js';
export const HISTORY_PAGE_SIZE=20;
export function summarizeSystemHistory(rows,now=Date.now()){
 const total=rows.reduce((sum,r)=>sum+r.count,0);
 const byCode=new Map();
 for(const r of rows)byCode.set(r.code,(byCode.get(r.code)||0)+r.count);
 return {total,types:byCode.size,warningTypes:recentSystemWarnings(rows,now).length,
  byCode:[...byCode].map(([code,count])=>({code,count})).sort((a,b)=>b.count-a.count||a.code.localeCompare(b.code))};
}
export function pageSystemHistory(rows,page){
 const pages=Math.max(1,Math.ceil(rows.length/HISTORY_PAGE_SIZE));
 const current=Number.isInteger(page)?Math.min(pages,Math.max(1,page)):1;
 return {page:current,pages,rows:rows.slice((current-1)*HISTORY_PAGE_SIZE,current*HISTORY_PAGE_SIZE)};
}
