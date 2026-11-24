import test from 'node:test';
import assert from 'node:assert/strict';
import {cataloguePageResponse,renderCatalogueHtml,fetchPublicProduct} from '../src/utils/catalogueHtmlServer.js';
const shell='<!doctype html><html><head><title>GEOSTORE</title><meta name="description" content="Home"><script type="module" src="/assets/index-a123.js"></script></head><body><div id="root"></div></body></html>';
test('server HTML has escaped public metadata and working entry script',()=>{
 const page=cataloguePageResponse('/product/a',{product:{id:'a',name:'A <script>alert(1)</script>',description:'"quoted" & text',category:'Shoes'}});
 assert.equal(page.status,200);
 const html=renderCatalogueHtml(shell,page);
 assert.ok(html.includes('https://geostore.vercel.app/product/a'));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>alert(1)'));
 assert.ok(html.includes('&quot;quoted&quot; &amp; text'));
 assert.ok(html.includes('/assets/index-a123.js'));assert.ok(html.includes('<a href="/category/Shoes">'));
});
test('missing/hidden objects return 404; upstream error returns 503, noindex',()=>{
 for(const page of [cataloguePageResponse('/product/missing'),cataloguePageResponse('/product/a',{product:{id:'a',name:'Hidden',isPublished:false}}),cataloguePageResponse('/category/missing')]){
  assert.equal(page.status,404);assert.ok(renderCatalogueHtml(shell,page).includes('noindex, follow'));assert.ok(!renderCatalogueHtml(shell,page).includes('rel="canonical"'));
 }
 const failed=cataloguePageResponse('/product/a',{upstreamFailed:true});
 assert.equal(failed.status,503);assert.equal(failed.meta.indexable,false);
 assert.throws(()=>renderCatalogueHtml(shell.replace('/assets/index-a123.js','/src/main.jsx'),failed),/Built storefront shell/);
});
test('parent with published children renders links, empty and draft categories excluded',()=>{
 const products=[{id:'p',name:'Boot',category:'Boots'},{id:'draft',name:'Secret',category:'Boots',isPublished:false}];
 const categories=[{id:'a',name:'Shoes'},{id:'b',name:'Boots',parentId:'a'},{id:'c',name:'Empty'}];
 const page=cataloguePageResponse('/category/Shoes',{products,categories});
 assert.equal(page.status,200);assert.deepEqual(page.links,[{href:'/product/p',text:'Boot'}]);
 assert.equal(cataloguePageResponse('/category/Empty',{products,categories}).status,404);
});
test('product lookup uses fixed anonymous projection and verifies returned id',async()=>{
 const config={url:'https://xmtnszxtnfxnrojionoa.supabase.co',key:'dummy.'+Buffer.from(JSON.stringify({role:'anon',ref:'xmtnszxtnfxnrojionoa'})).toString('base64url')+'.dummy'};
 const p=await fetchPublicProduct(config,'a&b',async(input,options)=>{
  const u=new URL(input);assert.equal(u.searchParams.get('id'),'eq.a&b');assert.equal(u.searchParams.get('select'),'id,name,category,description');
  assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer '+config.key);
  return new Response(JSON.stringify([{id:'a&b',name:'Shoe',category:'Shoes'}]));
 });
 assert.equal(p.id,'a&b');
 await assert.rejects(fetchPublicProduct(config,'a',async()=>new Response(JSON.stringify([{id:'different',name:'Hidden'}]))),/Invalid public product/);
 assert.equal(await fetchPublicProduct(config,'a',async()=>new Response('[]')),null);
});
