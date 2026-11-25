let pending;
export function loadAdminCss(){
 const slot=document.head.querySelector('meta[name="gs-admin-css-slot"]');
 // Vite dev retains the original imports and needs no delayed stylesheet.
 if(!slot)return Promise.resolve();
 if(pending)return pending;
 const href=slot.content;
 if(!/^\/assets\/admin-core-[a-f0-9]{20}\.css$/.test(href))return Promise.reject(Error('Invalid admin stylesheet'));
 pending=new Promise((resolve,reject)=>{
  const link=document.createElement('link');
  link.rel='stylesheet';link.href=href;link.dataset.gsAdminCore='true';
  link.onload=()=>resolve();
  link.onerror=()=>{link.remove();reject(Error('Admin stylesheet failed to load'));};
  // Preserve exact position between earlier global CSS and later design overrides.
  slot.before(link);
 }).catch(error=>{pending=undefined;throw error;});
 return pending;
}
