import test from 'node:test';
import assert from 'node:assert/strict';
import {subscribePwaStatus} from '../src/utils/pwaStatus.js';
const flush=()=>new Promise(r=>setImmediate(r));
function fixture(){
 const target=new EventTarget(),sw=new EventTarget(),registration=new EventTarget(),installing=new EventTarget();
 target.navigator={onLine:true,serviceWorker:sw};sw.controller={};sw.getRegistration=async()=>registration;
 registration.waiting=null;registration.installing=null;
 return {target,sw,registration,installing};
}
test('connectivity is a hint and waiting update never reloads or sends messages',async()=>{
 const f=fixture(),seen=[];const stop=subscribePwaStatus(f.target,s=>seen.push(s));await flush();
 assert.deepEqual(seen.at(-1),{offline:false,updateWaiting:false});
 f.target.navigator.onLine=false;f.target.dispatchEvent(new Event('offline'));
 assert.equal(seen.at(-1).offline,true);
 f.registration.installing=f.installing;f.registration.dispatchEvent(new Event('updatefound'));
 f.registration.waiting={};f.installing.dispatchEvent(new Event('statechange'));
 assert.equal(seen.at(-1).updateWaiting,true);
 f.target.navigator.onLine=true;f.target.dispatchEvent(new Event('online'));assert.equal(seen.at(-1).offline,false);
 stop();const n=seen.length;f.target.dispatchEvent(new Event('offline'));f.installing.dispatchEvent(new Event('statechange'));assert.equal(seen.length,n);
});
test('initial install without an existing controller is not an update',async()=>{
 const f=fixture();f.sw.controller=null;f.registration.waiting={};const seen=[];const stop=subscribePwaStatus(f.target,s=>seen.push(s));await flush();assert.equal(seen.at(-1).updateWaiting,false);stop();
});
test('late registration after unsubscribe cannot reveal stale state',async()=>{
 const f=fixture();let done;f.sw.getRegistration=()=>new Promise(r=>{done=r;});const seen=[];const stop=subscribePwaStatus(f.target,s=>seen.push(s));stop();done(f.registration);await flush();assert.equal(seen.length,1);
});
