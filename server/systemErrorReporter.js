// Server only. Never import from the browser entry. No user payloads or URLs.
const allowed=new Set(['catalogue_upstream_error','catalogue_render_error','sitemap_upstream_error']);
const endpoint='https://xmtnszxtnfxnrojionoa.supabase.co/rest/v1/rpc/record_system_error';
export function createServerErrorReporter({enabled=false,secret,fetchImpl=globalThis.fetch,now=Date.now}={}){
 const last=new Map();let busy=false;
 return async function report(code){
  if(enabled!==true||typeof secret!=='string'||!/^sb_secret_[A-Za-z0-9_-]{16,200}$/.test(secret)||!allowed.has(code))return false;
  let time;try{time=now();}catch{return false;}
  if(!Number.isFinite(time)||busy||(last.has(code)&&time-last.get(code)<60000))return false;
  last.set(code,time);busy=true;
  try{
   // New Supabase secret API key goes in apikey, not Authorization.
   const r=await fetchImpl(endpoint,{method:'POST',headers:{apikey:secret,'Content-Type':'application/json'},body:JSON.stringify({p_code:code,p_count:1}),signal:AbortSignal.timeout(750),redirect:'error',cache:'no-store'});
   return r?.ok===true;
  }catch{return false;}finally{busy=false;}
 };
}
export const reportServerError=createServerErrorReporter({
 enabled:process.env.GEOSTORE_SYSTEM_MONITOR_ENABLED==='true',
 secret:process.env.GEOSTORE_MONITOR_SUPABASE_SECRET
});
