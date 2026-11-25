import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {registerOfflineWorker} from '../src/utils/registerOfflineWorker.js';
const source=readFileSync(new URL('../public/geostore-sw.js',import.meta.url),'utf8');
function fixture(){
 const listeners={},stored=new Map(),deleted=[],requests=[];
 const offline=new Response('<title>GEOSTORE — Offline</title>',{headers:{'content-type':'text/html'}});
 let fail=false;
 const cache={put:async(k,v)=>stored.set(k,v),match:async k=>stored.get(k)};
 vm.runInNewContext(source,{URL,self:{location:{origin:'https://example.test'},addEventListener:(n,fn)=>listeners[n]=fn},caches:{open:async()=>cache,keys:async()=>['unrelated','geostore-offline-v0','geostore-offline-v1'],delete:async n=>deleted.push(n)},fetch:async(req,opts)=>{requests.push({req,opts});if(fail)throw Error('offline');return typeof req==='string'?offline.clone():new Response('network');}});
 function fire(type,request){let result;listeners[type]({request,waitUntil:p=>{result=p;},respondWith:p=>{result=p;}});return result;}
 return {stored,deleted,requests,fire,offline:()=>{fail=true;}};
}
test('install caches only static fallback, activation deletes only owned old cache',async()=>{
 const f=fixture();await f.fire('install');assert.deepEqual([...f.stored.keys()],['/offline.html']);assert.equal(f.requests[0].opts.credentials,'omit');await f.fire('activate');assert.deepEqual(f.deleted,['geostore-offline-v0']);
});
test('public navigations are network first; only failure uses offline fallback',async()=>{
 const f=fixture();await f.fire('install');const request={method:'GET',mode:'navigate',url:'https://example.test/product/item'};assert.equal(await (await f.fire('fetch',request)).text(),'network');f.offline();assert.match(await (await f.fire('fetch',request)).text(),/GEOSTORE — Offline/);assert.deepEqual([...f.stored.keys()],['/offline.html']);
});
test('API, account links, query URLs, cross origin and writes never intercepted',()=>{
 const f=fixture();for(const [method,mode,url] of [['POST','navigate','https://example.test/'],['GET','cors','https://example.test/api/test'],['GET','navigate','https://example.test/?admin=secret'],['GET','navigate','https://example.test/admin'],['GET','navigate','https://example.test/api/test'],['GET','navigate','https://other.test/'],['GET','navigate','https://example.test/product/item?token=private']])assert.equal(f.fire('fetch',{method,mode,url}),undefined);assert.equal(f.requests.length,0);
});
test('registration is production-only, secure, and fail-safe',async()=>{
 let calls=0;const target={isSecureContext:true,navigator:{serviceWorker:{register:async(path,options)=>{calls++;assert.equal(path,'/geostore-sw.js');assert.equal(options.updateViaCache,'none');throw Error('fixture');}}}};
 assert.equal(await registerOfflineWorker({target}),false);assert.equal(await registerOfflineWorker({production:true,target:{...target,isSecureContext:false}}),false);assert.equal(calls,0);assert.equal(await registerOfflineWorker({production:true,target}),false);assert.equal(calls,1);
});
