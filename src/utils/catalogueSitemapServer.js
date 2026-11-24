// Server-only, anonymous published catalogue reader. Never forwards request
// cookies, authorization, host, query parameters or staff credentials.
import { buildCatalogueSitemap, productPath, categoryPath } from './catalogueSeo.js';
export const CATALOGUE_ORIGIN='https://geostore.vercel.app';
const PAGE_SIZE=500;
const MAX_ROWS=49999;
export const safeConfig=({url,key}={})=>{
 if(url!=='https://xmtnszxtnfxnrojionoa.supabase.co'||typeof key!=='string'||key.split('.').length!==3)throw Error('Invalid public catalogue configuration');
 let claims;try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString('utf8'));}catch{throw Error('Invalid public catalogue configuration');}
 if(claims.role!=='anon'||claims.ref!=='xmtnszxtnfxnrojionoa')throw Error('Invalid public catalogue configuration');
 return {url,key};
};
export async function fetchPublishedCatalogue(config,fetchImpl=fetch){
 const {url,key}=safeConfig(config);
 const rows=[],seen=new Set();
 const signal=AbortSignal.timeout(12000);
 let total=null;
 do{
  const endpoint=new URL(url+'/rest/v1/products');
  endpoint.searchParams.set('select','id,category');
  endpoint.searchParams.set('order','id.asc');
  endpoint.searchParams.set('limit',String(PAGE_SIZE));
  endpoint.searchParams.set('offset',String(rows.length));
  const response=await fetchImpl(endpoint.href,{method:'GET',redirect:'error',cache:'no-store',signal,headers:{apikey:key,Authorization:'Bearer '+key,'Accept-Profile':'public',Accept:'application/json',Prefer:'count=exact'}});
  if(!response.ok)throw Error('Public catalogue unavailable');
  const range=response.headers.get('content-range')||'';
  const match=/^(?:(\d+)-(\d+)|\*)\/(\d+)$/.exec(range);
  if(!match)throw Error('Catalogue count unavailable');
  const nextTotal=Number(match[3]);
  if(!Number.isSafeInteger(nextTotal)||nextTotal<0||nextTotal>MAX_ROWS||(total!==null&&total!==nextTotal))throw Error('Catalogue count changed or exceeded limit');
  total=nextTotal;
  const batch=await response.json();
  if(!Array.isArray(batch)||batch.length>PAGE_SIZE)throw Error('Invalid catalogue page');
  if(total===0){if(batch.length||rows.length||match[1]!==undefined)throw Error('Invalid empty catalogue range');return [];}
  if(!batch.length||Number(match[1])!==rows.length||Number(match[2])!==rows.length+batch.length-1||rows.length+batch.length>total)throw Error('Incomplete catalogue page');
  for(const row of batch){
   if(!row||typeof row.id!=='string'||!productPath(row.id)||seen.has(row.id)||row.is_published===false||row.isPublished===false)throw Error('Invalid published catalogue row');
   if(row.category!=null&&typeof row.category!=='string')throw Error('Invalid catalogue category');
   seen.add(row.id);
   rows.push({id:row.id,category:row.category});
  }
 }while(rows.length<total);
 return rows;
}
export function createSitemapHandler(loadRows){
 return async function sitemap(req,res){
  const method=req.method;
  if(method!=='GET'&&method!=='HEAD'){
   res.setHeader('Allow','GET, HEAD');res.setHeader('Cache-Control','no-store');res.statusCode=405;return res.end('Method not allowed');
  }
  try{
   const snapshot=await loadRows();
   const xml=Array.isArray(snapshot)?buildCatalogueSitemap(CATALOGUE_ORIGIN,snapshot):buildCatalogueSitemap(CATALOGUE_ORIGIN,snapshot.products,snapshot.categories);
   res.statusCode=200;res.setHeader('Content-Type','application/xml; charset=utf-8');
   res.setHeader('Cache-Control','public, max-age=0, s-maxage=300');
   res.setHeader('X-Content-Type-Options','nosniff');
   return res.end(method==='HEAD'?undefined:xml);
  }catch{
   // Never cache a partial or falsely empty sitemap on upstream failure.
   res.statusCode=503;res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('Retry-After','60');
   return res.end(method==='HEAD'?undefined:'Sitemap temporarily unavailable');
  }
 };
}

export async function fetchPublishedCategories(config,fetchImpl=fetch){
 const {url,key}=safeConfig(config);
 const endpoint=new URL(url+'/rest/v1/storefront_config');
 endpoint.searchParams.set('config_key','eq.storefront');
 endpoint.searchParams.set('select','categories:published_config->categories');
 endpoint.searchParams.set('limit','2');
 const r=await fetchImpl(endpoint.href,{method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{apikey:key,Authorization:'Bearer '+key,'Accept-Profile':'public',Accept:'application/json'}});
 if(!r.ok)throw Error('Published category configuration unavailable');
 const rows=await r.json();
 if(!Array.isArray(rows)||rows.length>1)throw Error('Invalid category configuration');
 if(rows.length===0)return [];
 const categories=rows[0]?.categories;
 if(!Array.isArray(categories)||categories.length>5000)throw Error('Invalid published categories');
 // Only category identifiers, parent relation and names are needed.
 return categories.map(c=>typeof c==='string'?c:{id:c?.id,name:c?.name,parentId:c?.parentId}).filter(c=>typeof c==='string'||typeof c.name==='string');
}
