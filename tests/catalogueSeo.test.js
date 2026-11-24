import test from 'node:test';
import assert from 'node:assert/strict';
import {productPath,categoryPath,parseCataloguePath,cataloguePaths,buildCatalogueSitemap} from '../src/utils/catalogueSeo.js';
test('product and Georgian category paths round-trip exactly',()=>{
 for(const [kind,value,path] of [['product','sku-123',productPath('sku-123')],['category','ქალის ფეხსაცმელი',categoryPath('ქალის ფეხსაცმელი')],['product','item?x#y & 1',productPath('item?x#y & 1')]]){
  assert.deepEqual(parseCataloguePath(path),{kind,value});
 }
 assert.deepEqual(parseCataloguePath('/'),{kind:'home'});
});
test('reject malformed, ambiguous and unrelated routes',()=>{
 for(const x of ['/admin','/product/','/product/a/b','/product/%2F','/product/%5C','/product/%00','/product/%','/product/..','/product/%2e%2e','/product/%61','/product/a/','/category/%E0','//evil.invalid/product/x'])assert.equal(parseCataloguePath(x),null,x);
 for(const x of ['',null,{},' a','a ','a/b','a\\b','..','a\nb','\ud800','a'.repeat(201)])assert.equal(productPath(x),null);
 assert.equal(categoryPath('ყველა'),null);
});
test('only unique public product/category paths; draft flags excluded',()=>{
 const rows=[{id:'a',category:'Shoes'},{id:'a',category:'Shoes'},{id:'b',category:'Shoes'},{id:'secret',category:'Hidden',is_published:false},{id:'draft',category:'Draft',isPublished:false}];
 assert.deepEqual(cataloguePaths(rows),['/','/category/Shoes','/product/a','/product/b']);
 const xml=buildCatalogueSitemap('https://shop.example',rows);
 assert.match(xml,/<loc>https:\/\/shop\.example\/product\/a<\/loc>/);
 assert.ok(!/secret|Hidden|Draft|draft/.test(xml));
});
test('fail closed on origin and snapshot shape, enforce canonical absolute URLs',()=>{
 for(const x of ['http://shop.example','https://shop.example/','https://shop.example/path','https://user:pass@shop.example','https://shop.example?x=1'])assert.throws(()=>buildCatalogueSitemap(x,[]),/origin/);
 assert.throws(()=>buildCatalogueSitemap('https://shop.example',null),/catalogue/);
 const xml=buildCatalogueSitemap('https://shop.example',[{id:'x&y',category:'ქალი'}]);
 assert.ok(xml.includes('/product/x%26y'));
 assert.ok(xml.includes(categoryPath('ქალი')));
});
