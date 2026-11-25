import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
// Actual built worker and static fallback, isolated loopback fixture only.
export async function runPwaOfflineSmoke(browser){
 const original=readFileSync(new URL('../../dist/geostore-sw.js',import.meta.url),'utf8');
 const fallback=readFileSync(new URL('../../dist/offline.html',import.meta.url));
 let version=1,networkDown=false;
 const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/geostore-sw.js'){res.setHeader('Content-Type','text/javascript');return res.end(version===1?original:original.replace('geostore-offline-v1','geostore-offline-v2'));}
  if(url.pathname==='/offline.html'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(fallback);}
  if(networkDown){res.destroy();return;}
  if(url.pathname==='/api/fixture'){res.setHeader('Content-Type','application/json');return res.end('{"fixture":"not cached"}');}
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Online fixture</title><h1>Online fixture</h1>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const host='http://127.0.0.1:'+server.address().port;
 const context=await browser.newContext({serviceWorkers:'allow'});
 try{
  const page=await context.newPage();
  await page.goto(host);
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/geostore-sw.js',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready;});
  await page.reload();
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  assert.deepEqual(await page.evaluate(async()=>{const c=await caches.open('geostore-offline-v1');return (await c.keys()).map(r=>new URL(r.url).pathname);}),['/offline.html']);
  assert.equal(await page.evaluate(async()=>await (await fetch('/api/fixture')).json().then(x=>x.fixture)),'not cached');
  networkDown=true;
  await page.goto(host+'/product/fixture');
  await page.getByRole('heading',{name:'ინტერნეტთან კავშირი არ არის'}).waitFor({state:'visible'});
  assert.equal(await page.evaluate(async()=>{try{await fetch('/api/fixture',{cache:'no-store'});return false;}catch{return true;}}),true,'No offline API response');
  assert.deepEqual(await page.evaluate(async()=>{const c=await caches.open('geostore-offline-v1');return (await c.keys()).map(r=>new URL(r.url).pathname);}),['/offline.html']);
  networkDown=false;
  await page.getByRole('link',{name:'მაღაზიაში დაბრუნება'}).click();
  await page.getByRole('heading',{name:'Online fixture'}).waitFor({state:'visible'});
  version=2;
  await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration('/');await r.update();});
  await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration('/'))?.waiting),null,{timeout:20000});
  assert.equal(await page.evaluate(async()=>Boolean(navigator.serviceWorker.controller&&(await navigator.serviceWorker.getRegistration('/')).active)),true);
  assert.ok((await page.evaluate(()=>caches.keys())).includes('geostore-offline-v1'),'Old cache retained while old client is active');
  console.log('PASS built PWA worker offline fallback, API exclusion, reconnection and waiting update');
 }finally{await context.close();await new Promise(resolve=>server.close(resolve));}
}
