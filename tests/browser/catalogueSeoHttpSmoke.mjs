import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {once} from 'node:events';
import {createCataloguePageHandler,loadCataloguePage} from '../../src/utils/catalogueHtmlServer.js';
import {createSitemapHandler,fetchPublishedCatalogue,fetchPublishedCategories,CATALOGUE_ORIGIN} from '../../src/utils/catalogueSitemapServer.js';
import {stage49FixtureProductRows} from './stage46PurchaseScenarios.mjs';

const origin='https://xmtnszxtnfxnrojionoa.supabase.co';
const config={url:origin,key:'fixture.'+Buffer.from(JSON.stringify({role:'anon',ref:'xmtnszxtnfxnrojionoa'})).toString('base64url')+'.fixture'};
const products=stage49FixtureProductRows;
const categories=[{id:'accessories',name:'აქსესუარები'},{id:'clothes',name:'ტანსაცმელი',parentId:'fashion'},{id:'fashion',name:'მოდა'}];
const json=(value,headers={})=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json',...headers}});
async function fixtureFetch(input,options){
 const u=new URL(input);
 assert.equal(u.origin,origin);assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer '+config.key);
 if(u.pathname==='/rest/v1/storefront_config'){
  assert.equal(u.searchParams.get('select'),'categories:published_config->categories');
  return json([{categories}]);
 }
 assert.equal(u.pathname,'/rest/v1/products');
 const projection=u.searchParams.get('select');
 if(projection==='id,name,category,description'){
  const id=u.searchParams.get('id').slice(3);
  if(id==='seo-upstream-failure')throw Error('Fixture network failure');
  return json(products.filter(p=>p.id===id).map(({id,name,category,description})=>({id,name,category,description})));
 }
 assert.ok(['id,category','id,category,name'].includes(projection));
 const sorted=[...products].sort((a,b)=>a.id.localeCompare(b.id));
 // Force multiple pages even in this small fixture.
 const offset=Number(u.searchParams.get('offset'));
 const page=sorted.slice(offset,offset+2).map(({id,category,name})=>projection.endsWith(',name')?{id,category,name}:{id,category});
 return json(page,{'Content-Range':offset+'-'+(offset+page.length-1)+'/'+sorted.length});
}
export async function runCatalogueSeoHttpSmoke(browser,staticHost){
 const shell=readFileSync(new URL('../../dist/index.html',import.meta.url),'utf8');
 const cfg=JSON.parse(readFileSync(new URL('../../vercel.json',import.meta.url),'utf8'));
 assert.deepEqual(cfg.rewrites.slice(0,3).map(r=>r.source),['/sitemap.xml','/product/:id','/category/:name']);
 assert.ok(cfg.functions['api/catalogue-page.js'].includeFiles.includes('dist/index.html'));
 const pageHandler=createCataloguePageHandler({readShell:()=>shell,loadPage:path=>loadCataloguePage(config,path,fixtureFetch)});
 const sitemapHandler=createSitemapHandler(async()=>({products:await fetchPublishedCatalogue(config,fixtureFetch),categories:await fetchPublishedCategories(config,fixtureFetch)}));
 // Emulate configured rewrites locally; use existing Vite build server for
 // static files only. No hosted preview, live database or private credentials.
 const server=createServer(async(req,res)=>{
  try{
   const u=new URL(req.url,'http://localhost');
   if(u.pathname==='/sitemap.xml')return await sitemapHandler(req,res);
   if(/^\/(?:product|category)\/[^/]+$/.test(u.pathname))return await pageHandler(req,res);
   if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;return res.end();}
   if(u.pathname!=='/'&&!/^\/assets\/[A-Za-z0-9_.-]+$/.test(u.pathname)&&!/^\/[A-Za-z0-9_.-]+\.(?:png|svg|ico|json|webp)$/.test(u.pathname)){res.statusCode=404;return res.end();}
   const response=await fetch(new URL(u.pathname,staticHost),{method:req.method,redirect:'error'});
   res.statusCode=response.status;res.setHeader('Content-Type',response.headers.get('content-type')||'application/octet-stream');
   res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()));
  }catch{res.statusCode=500;res.end('Local fixture failed');}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const host='http://127.0.0.1:'+server.address().port;
 let context;
 try{
  const sitemap=await fetch(host+'/sitemap.xml');
  assert.equal(sitemap.status,200);assert.match(sitemap.headers.get('content-type'),/application\/xml/);
  const xml=await sitemap.text();
  const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]));
  assert.equal(urls.length,1+products.length+3);
  assert.equal(new Set(urls.map(u=>u.pathname)).size,urls.length);
  assert.ok(urls.some(u=>u.pathname==='/category/'+encodeURIComponent('მოდა')));
  for(const url of urls){
   assert.equal(url.origin,CATALOGUE_ORIGIN);
   const response=await fetch(host+url.pathname);
   assert.equal(response.status,200,'Every sitemap path must resolve: '+url.pathname);
   const body=await response.text();
   if(url.pathname!=='/'){
    assert.ok(body.includes('href="'+url.href+'"'));
    assert.ok(body.includes('<h1>'));
    assert.ok(!body.includes('noindex, follow'));
   }
   const asset=body.match(/<script\b[^>]*src="(\/assets\/[^"]+\.js)"/)?.[1];
   assert.ok(asset,'Exact Vite entry must be present');
   assert.equal((await fetch(host+asset,{method:'HEAD'})).status,200);
  }
  for(const [path,status] of [['/product/not-present',404],['/category/not-present',404],['/product/seo-upstream-failure',503]]){
   const r=await fetch(host+path);assert.equal(r.status,status);
   assert.equal(r.headers.get('cache-control'),'no-store');assert.ok((await r.text()).includes('noindex, follow'));
  }
  context=await browser.newContext({viewport:{width:390,height:850},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  await context.route(origin+'/**',async route=>{
   const request=route.request(),u=new URL(request.url());
   if(request.method()!=='GET'){writes.push(request.method()+' '+u.pathname);return route.fulfill({status:403,body:'{}',contentType:'application/json'});}
   const body=u.pathname==='/rest/v1/products'?products:u.pathname==='/rest/v1/storefront_config'?[{is_published:true,published_config:{categories}}]:[];
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  const productUrl=host+'/product/stage46-simple';
  const r=await page.goto(productUrl,{waitUntil:'domcontentloaded'});
  assert.equal(r.status(),200);
  await page.locator('.gs-product-dialog .gs-product-detail-title').filter({hasText:'Stage46 Everyday Wallet'}).waitFor({state:'visible',timeout:20000});
  await page.waitForFunction(()=>document.title==='Stage46 Everyday Wallet | GEOSTORE');
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),CATALOGUE_ORIGIN+'/product/stage46-simple');
  await page.locator('.gs-product-modal-close').click();
  await page.locator('.gs-product-dialog').waitFor({state:'detached'});
  await page.waitForFunction(()=>document.querySelector('link[rel=canonical]')?.getAttribute('href')==='https://geostore.vercel.app/');
  const missing=await page.goto(host+'/product/not-present',{waitUntil:'domcontentloaded'});
  assert.equal(missing.status(),404);
  await page.getByRole('alert').filter({hasText:'პროდუქტი ხელმისაწვდომი აღარ არის.'}).waitFor({state:'visible',timeout:20000});
  assert.match(await page.locator('meta[name=robots]').getAttribute('content'),/noindex/);
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  console.log('PASS Phase4 catalogue HTTP: every sitemap URL, actual build assets, 404/503, browser canonical and unavailable product (isolated fixture)');
 }finally{if(context)await context.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
