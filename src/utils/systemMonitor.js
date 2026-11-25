// Bounded, in-memory diagnostics. No raw exceptions, URLs, user IDs, tokens,
// browser fingerprints, storage or network transmission.
export const SYSTEM_EVENT_CODES=Object.freeze([
 'browser_runtime_error','browser_resource_error','browser_unhandled_rejection',
 'react_root_render_error','react_admin_render_error'
]);
const allowed=new Set(SYSTEM_EVENT_CODES);
const MINUTE=60000, MAX_BUCKETS=30, MAX_COUNT=1000;
export function createSystemMonitor({now=Date.now}={}){
 const buckets=new Map();
 let latest=0;
 function record(code){
  if(typeof code!=='string'||!allowed.has(code))return false;
  let value;
  try{value=now();}catch{return false;}
  if(!Number.isSafeInteger(value)||value<0)return false;
  // Clamp backwards clock movement so stale entries cannot evade retention.
  const minute=Math.max(latest,Math.floor(value/MINUTE)*MINUTE);
  latest=minute;
  for(const [key,row] of buckets)if(minute-row.minute>=30*MINUTE)buckets.delete(key);
  const key=code+':'+minute;
  const row=buckets.get(key);
  if(row){row.count=Math.min(MAX_COUNT,row.count+1);return true;}
  if(buckets.size>=MAX_BUCKETS)buckets.delete(buckets.keys().next().value);
  buckets.set(key,{code,minute,count:1});
  return true;
 }
 function snapshot(){
  let value;try{value=now();}catch{return [];}
  if(!Number.isSafeInteger(value)||value<0)return [];
  const minute=Math.max(latest,Math.floor(value/MINUTE)*MINUTE);
  return Array.from(buckets.values()).filter(row=>minute-row.minute<30*MINUTE).map(row=>({...row}));
 }
 return {record,snapshot,clear:()=>{buckets.clear();latest=0;}};
}
export const systemMonitor=createSystemMonitor();
export function installBrowserDiagnostics(target,monitor=systemMonitor){
 if(!target||typeof target.addEventListener!=='function'||typeof target.removeEventListener!=='function')return ()=>{};
 const record=code=>{try{monitor.record(code);}catch{/* Diagnostics never interfere with application behavior. */}};
 const error=event=>record(event?.target===target?'browser_runtime_error':'browser_resource_error');
 const rejection=()=>record('browser_unhandled_rejection');
 target.addEventListener('error',error,true);
 target.addEventListener('unhandledrejection',rejection);
 return ()=>{
  target.removeEventListener('error',error,true);
  target.removeEventListener('unhandledrejection',rejection);
 };
}
