/* GEOSTORE: offline fallback only. No application shell, API, images,
   authenticated responses, user data, or runtime assets cached. */
const CACHE='geostore-offline-v1';
const OFFLINE='/offline.html';
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const response=await fetch(OFFLINE,{cache:'reload',credentials:'omit',redirect:'error'});
  if(!response.ok||!/^text\/html\b/i.test(response.headers.get('content-type')||''))throw Error('Offline page unavailable');
  const html=await response.clone().text();
  if(!html.includes('<title>GEOSTORE — Offline</title>')||html.length>16000)throw Error('Unexpected offline page');
  const cache=await caches.open(CACHE);await cache.put(OFFLINE,response);
 })());
 // No skipWaiting: existing tabs finish using their current release.
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith('geostore-offline-')&&name!==CACHE)await caches.delete(name);
 })());
 // No clients.claim: do not take over an in-progress checkout or admin session.
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||request.mode!=='navigate')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||url.search||url.hash)return;
 if(url.pathname!=='/'&&!/^\/(?:product|category)\/[^/]+$/.test(url.pathname))return;
 event.respondWith((async()=>{
  try{return await fetch(request);}
  catch(error){
   const fallback=await (await caches.open(CACHE)).match(OFFLINE);
   if(fallback)return fallback;
   throw error;
  }
 })());
});
