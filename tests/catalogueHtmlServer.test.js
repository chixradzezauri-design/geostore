import test from 'node:test';
import assert from 'node:assert/strict';
import {cataloguePageResponse,renderCatalogueHtml,fetchPublicProduct,resolveServerCataloguePath,createCataloguePageHandler,loadCataloguePage} from '../src/utils/catalogueHtmlServer.js';
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

test('server route accepts only a fixed catalogue path or a unique rewrite pair',()=>{
 assert.equal(resolveServerCataloguePath({url:'/product/a?utm=x'}),'/product/a');
 assert.equal(resolveServerCataloguePath({url:'/api/catalogue-page?kind=category&value='+encodeURIComponent('ქალი')}),'/category/'+encodeURIComponent('ქალი'));
 for(const url of ['/admin','/api/catalogue-page?kind=product&value=a&value=b','/api/catalogue-page?kind=private&value=a','/api/catalogue-page?kind=product&value=..','/api/catalogue-page?kind=product&value=%2F'])assert.equal(resolveServerCataloguePath({url}),null,url);
});
const capture=()=>({headers:{},statusCode:0,body:undefined,setHeader(key,value){this.headers[key]=value;},end(value){this.body=value;}});
test('function response status, cache and exact built shell contracts',async()=>{
 const handler=createCataloguePageHandler({readShell:()=>shell,loadPage:path=>cataloguePageResponse(path,{product:{id:'a',name:'Shoe',description:'Public'}})});
 let res=capture();await handler({method:'GET',url:'/api/catalogue-page?kind=product&value=a',headers:{cookie:'private',host:'evil.example'}},res);
 assert.equal(res.statusCode,200);assert.ok(res.body.includes('/assets/index-a123.js'));assert.ok(!res.body.includes('evil.example'));assert.match(res.headers['Cache-Control'],/s-maxage=60/);
 res=capture();await handler({method:'HEAD',url:'/product/a'},res);assert.equal(res.statusCode,200);assert.equal(res.body,undefined);
 res=capture();await handler({method:'POST',url:'/product/a'},res);assert.equal(res.statusCode,405);
 res=capture();await handler({method:'GET',url:'/product/missing'},res);assert.equal(res.statusCode,404);assert.equal(res.headers['Cache-Control'],'no-store');
 res=capture();await createCataloguePageHandler({readShell:()=>shell,loadPage:()=>{throw Error('secret')}})({method:'GET',url:'/product/a'},res);assert.equal(res.statusCode,503);assert.ok(!res.body.includes('secret'));
 res=capture();await createCataloguePageHandler({readShell:()=>{throw Error('missing')},loadPage:()=>cataloguePageResponse('/product/a')})({method:'GET',url:'/product/a'},res);assert.equal(res.statusCode,503);
});
test('category reader fetches public names, never prices or private data',async()=>{
 const config={url:'https://xmtnszxtnfxnrojionoa.supabase.co',key:'dummy.'+Buffer.from(JSON.stringify({role:'anon',ref:'xmtnszxtnfxnrojionoa'})).toString('base64url')+'.dummy'};
 const page=await loadCataloguePage(config,'/category/Shoes',async(input,options)=>{
  const u=new URL(input);assert.equal(options.headers.Authorization,'Bearer '+config.key);
  if(u.pathname.endsWith('/products')){
   assert.equal(u.searchParams.get('select'),'id,category,name');
   return new Response(JSON.stringify([{id:'a',category:'Boots',name:'Winter boot'}]),{headers:{'Content-Range':'0-0/1'}});
  }
  assert.equal(u.searchParams.get('select'),'categories:published_config->categories');
  return new Response(JSON.stringify([{categories:[{id:'p',name:'Shoes'},{id:'c',name:'Boots',parentId:'p'}]}]));
 });
 assert.equal(page.status,200);assert.deepEqual(page.links,[{href:'/product/a',text:'Winter boot'}]);
});
