import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fetchPublishedCatalogue,fetchPublishedCategories,createSitemapHandler,CATALOGUE_ORIGIN} from '../src/utils/catalogueSitemapServer.js';
const url='https://xmtnszxtnfxnrojionoa.supabase.co';
const jwt=role=>'dummy.'+Buffer.from(JSON.stringify({role,ref:'xmtnszxtnfxnrojionoa'})).toString('base64url')+'.dummy';
const config={url,key:jwt('anon')};
const response=(rows,range,status=200)=>new Response(JSON.stringify(rows),{status,headers:{'Content-Range':range,'Content-Type':'application/json'}});
const capture=()=>({headers:{},statusCode:0,body:undefined,setHeader(key,value){this.headers[key]=value;},end(value){this.body=value;}});
test('sitemap uses fixed public-only projection, exact count and paginated server limit',async()=>{
 const calls=[];
 const rows=await fetchPublishedCatalogue(config,async (input,options)=>{
  const u=new URL(input);calls.push({url:u,options});
  assert.equal(u.origin,url);assert.equal(u.pathname,'/rest/v1/products');
  assert.equal(u.searchParams.get('select'),'id,category');
  assert.equal(u.searchParams.get('order'),'id.asc');
  assert.equal(options.headers.Authorization,'Bearer '+config.key);
  assert.equal(options.headers['Accept-Profile'],'public');
  assert.equal(options.headers.Prefer,'count=exact');
  assert.equal(options.method,'GET');assert.equal(options.redirect,'error');
  const offset=Number(u.searchParams.get('offset'));
  // A lower database maximum than requested must not silently truncate.
  return offset===0?response([{id:'a',category:'Shoes'},{id:'b',category:'Shoes'}],'0-1/3',206):response([{id:'c',category:'ქალი'}],'2-2/3',206);
 });
 assert.equal(calls.length,2);assert.deepEqual(rows.map(x=>x.id),['a','b','c']);
});
test('reject private roles, incorrect origins, partial responses and changing counts',async()=>{
 for(const c of [{...config,key:jwt('service_role')},{...config,url:'https://evil.example'}])await assert.rejects(fetchPublishedCatalogue(c,()=>{throw Error('Should not fetch')}),/configuration/);
 for(const cases of [
  [response([],'*/1')],
  [response([{id:'a'}],'0-0/*')],
  [response([{id:'a'}],'0-0/2'),response([{id:'b'}],'1-1/3')],
  [response([{id:'a'}],'0-0/2'),response([{id:'a'}],'1-1/2')],
  [response([{id:'secret',is_published:false}],'0-0/1')],
  [response([{id:'a'}],'0-0/50000')],
  [response([], '*/0',503)]
 ]){let i=0;await assert.rejects(fetchPublishedCatalogue(config,async()=>cases[i++]));}
 assert.deepEqual(await fetchPublishedCatalogue(config,async()=>response([],'*/0')),[]);
});
test('HTTP XML, HEAD and error responses never echo credentials or host',async()=>{
 const handler=createSitemapHandler(async()=>[{id:'p1',category:'Shoes'}]);
 let res=capture();await handler({method:'GET',headers:{host:'evil.example',authorization:'private'},url:'/sitemap.xml?host=evil.example'},res);
 assert.equal(res.statusCode,200);assert.equal(res.headers['Content-Type'],'application/xml; charset=utf-8');assert.ok(res.body.includes(CATALOGUE_ORIGIN+'/product/p1'));assert.ok(res.body.includes(CATALOGUE_ORIGIN+'/category/Shoes'));assert.ok(!/evil.example|private/.test(res.body));
 res=capture();await handler({method:'HEAD'},res);assert.equal(res.statusCode,200);assert.equal(res.body,undefined);
 res=capture();await handler({method:'POST'},res);assert.equal(res.statusCode,405);
 res=capture();await createSitemapHandler(async()=>{throw Error('secret token')})({method:'GET'},res);assert.equal(res.statusCode,503);assert.equal(res.headers['Cache-Control'],'no-store');assert.ok(!res.body.includes('secret'));
});
test('Vercel sitemap route precedes SPA fallback and has no static shadow',()=>{
 const cfg=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.deepEqual(cfg.rewrites[0],{source:'/sitemap.xml',destination:'/api/sitemap'});
 assert.equal(cfg.rewrites.at(-1).destination,'/index.html');
 assert.ok(!existsSync(new URL('../public/sitemap.xml',import.meta.url)));
 assert.equal(cfg.functions['api/sitemap.js'].includeFiles,'src/supabaseClient.js');
 assert.ok(readFileSync(new URL('../public/robots.txt',import.meta.url),'utf8').includes('Sitemap: '+CATALOGUE_ORIGIN+'/sitemap.xml'));
});

test('published parent category projection never requests draft config',async()=>{
 const categories=await fetchPublishedCategories(config,async(input,options)=>{
  const u=new URL(input);assert.equal(u.pathname,'/rest/v1/storefront_config');assert.equal(u.searchParams.get('select'),'categories:published_config->categories');assert.equal(options.headers.Authorization,'Bearer '+config.key);
  return response([{categories:[{id:'p',name:'Shoes',image:'discard'},{id:'s',name:'Boots',parentId:'p'},{id:'e',name:'Empty'}]}],'0-0/1');
 });
 const res=capture();await createSitemapHandler(async()=>({products:[{id:'a',category:'Boots'}],categories}))({method:'GET'},res);
 assert.equal(res.statusCode,200);assert.ok(res.body.includes('/category/Shoes'));assert.ok(res.body.includes('/category/Boots'));assert.ok(!res.body.includes('/category/Empty'));assert.ok(!res.body.includes('discard'));
});
