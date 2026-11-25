// Only built releases on secure origins. Failure never blocks startup.
export function registerOfflineWorker({production=false,target=globalThis.window}={}){
 if(production!==true||!target?.isSecureContext||typeof target.navigator?.serviceWorker?.register!=='function')return Promise.resolve(false);
 try{return Promise.resolve(target.navigator.serviceWorker.register('/geostore-sw.js',{scope:'/',updateViaCache:'none'})).then(()=>true,()=>false);}
 catch{return Promise.resolve(false);}
}
