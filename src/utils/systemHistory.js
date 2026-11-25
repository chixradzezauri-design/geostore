// Candidate owner-only history reader. No raw exception text is rendered.
// Enable only with reviewed server release and actual AAL2 integration.
export const SYSTEM_HISTORY_ENABLED=false;
const codes=new Set(["browser_runtime_error","browser_resource_error","browser_unhandled_rejection","react_root_render_error","react_admin_render_error","catalogue_upstream_error","catalogue_render_error","sitemap_upstream_error"]);
export function normalizeSystemHistory(rows){
 if(!Array.isArray(rows)||rows.length>1344)return null;
 const seen=new Set(),out=[];
 for(const row of rows){
  if(!row||typeof row!=='object'||Object.keys(row).length!==3||!codes.has(row.code)||!Number.isInteger(row.observations)||row.observations<1||row.observations>1000000||typeof row.hour_at!=='string'||row.hour_at.length>40)return null;
  const date=Date.parse(row.hour_at);
  if(!Number.isFinite(date)||date%3600000!==0)return null;
  const key=date+':'+row.code;
  if(seen.has(key))return null;seen.add(key);
  out.push({hourAt:date,code:row.code,count:row.observations});
 }
 return out.sort((a,b)=>b.hourAt-a.hourAt||a.code.localeCompare(b.code));
}
export function createSystemHistoryReader({enabled=false,client,getContext}={}){
 return async function read(hours){
  if(enabled!==true)return {status:'disabled'};
  const scope=()=>{try{const c=getContext();return c?.isOwner===true&&typeof c.ownerId==='string'&&Number.isSafeInteger(c.epoch)?{ownerId:c.ownerId,epoch:c.epoch}:null;}catch{return null;}};
  const start=scope();if(!start||![24,168].includes(hours))return {status:'blocked'};
  const active=()=>{const c=scope();return c?.ownerId===start.ownerId&&c?.epoch===start.epoch;};
  try{
   const u=await client.auth.getUser();
   if(!active())return {status:'inactive'};
   if(u?.error||u?.data?.user?.id!==start.ownerId)return {status:'blocked'};
   const r=await client.rpc('read_system_error_history',{p_hours:hours});
   if(!active())return {status:'inactive'};
   const rows=normalizeSystemHistory(r?.data);
   return r?.error||rows===null?{status:'blocked'}:{status:'ready',rows};
  }catch{return {status:active()?'blocked':'inactive'};}
 };
}
