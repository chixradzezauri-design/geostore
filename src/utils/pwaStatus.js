// Observe connectivity hints and waiting updates, never activate or reload.
export function subscribePwaStatus(target,onChange){
 if(!target||typeof onChange!=='function')return ()=>{};
 let active=true,registration=null,installing=null,generation=0;
 const sw=target.navigator?.serviceWorker;
 const emit=()=>{if(active)onChange({offline:target.navigator?.onLine===false,
  updateWaiting:Boolean(sw?.controller&&registration?.waiting)});};
 function observeInstalling(){
  installing?.removeEventListener?.('statechange',emit);
  installing=registration?.installing||null;
  installing?.addEventListener?.('statechange',emit);
  emit();
 }
 function detachRegistration(){
  registration?.removeEventListener?.('updatefound',observeInstalling);
  installing?.removeEventListener?.('statechange',emit);
  registration=null;installing=null;
 }
 async function readRegistration(){
  const g=++generation;
  if(typeof sw?.getRegistration!=='function')return;
  try{
   const r=await sw.getRegistration('/');
   if(!active||g!==generation)return;
   detachRegistration();registration=r||null;
   registration?.addEventListener?.('updatefound',observeInstalling);
   observeInstalling();
  }catch{/* Registration may be unavailable; connectivity hint still works. */}
 }
 target.addEventListener?.('online',emit);
 target.addEventListener?.('offline',emit);
 target.addEventListener?.('geostore:worker-registered',readRegistration);
 sw?.addEventListener?.('controllerchange',readRegistration);
 emit();void readRegistration();
 return ()=>{
  active=false;generation++;
  target.removeEventListener?.('online',emit);
  target.removeEventListener?.('offline',emit);
  target.removeEventListener?.('geostore:worker-registered',readRegistration);
  sw?.removeEventListener?.('controllerchange',readRegistration);
  detachRegistration();
 };
}
