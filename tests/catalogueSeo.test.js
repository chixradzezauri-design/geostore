import test from 'node:test';
import assert from 'node:assert/strict';
import {productPath,categoryPath,parseCataloguePath,cataloguePaths,buildCatalogueSitemap,catalogueRouteFromLocation,catalogueNavigationTarget,findPublishedRouteProduct,resolveCatalogueCategory,shouldHandleCatalogueClick,catalogueMetadata} from '../src/utils/catalogueSeo.js';
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

test('catalogue navigation preserves query/hash and does not hijack admin routes',()=>{
 const l={pathname:'/',search:'?utm_source=test',hash:'#a'};
 assert.equal(catalogueNavigationTarget(l,'/product/a'),'/product/a?utm_source=test#a');
 assert.equal(catalogueNavigationTarget({...l,pathname:'/admin'},'/product/a'),null);
 assert.equal(catalogueRouteFromLocation({...l,search:'?admin=secret'}),null);
 assert.equal(catalogueNavigationTarget(l,'//evil.invalid'),null);
});
test('direct product requires verified catalogue and ignores hidden products',()=>{
 const products=[{id:'visible',isPublished:true},{id:'hidden',isPublished:false}];
 assert.equal(findPublishedRouteProduct(products,'visible',false),null);
 assert.equal(findPublishedRouteProduct(products,'hidden',true),null);
 assert.equal(findPublishedRouteProduct(products,'visible',true),products[0]);
});
test('category route resolves current parent and child without changing names',()=>{
 const categories=[{id:'p',name:'Shoes'},{id:'s',name:'Boots',parentId:'p'}];
 assert.deepEqual(resolveCatalogueCategory(categories,'Boots'),{category:'Shoes',subcategory:'Boots',parentId:'p'});
 assert.deepEqual(resolveCatalogueCategory(categories,'Shoes'),{category:'Shoes',subcategory:null,parentId:'p'});
 assert.deepEqual(resolveCatalogueCategory(categories,'Unknown'),{category:'Unknown',subcategory:null,parentId:null});
});

test('plain primary click is intercepted; browser new-tab and modifier behavior is preserved',()=>{
 assert.equal(shouldHandleCatalogueClick({button:0}),true);
 for(const event of [{button:1},{button:0,ctrlKey:true},{button:0,metaKey:true},{button:0,shiftKey:true},{button:0,altKey:true},{button:0,defaultPrevented:true}])assert.equal(shouldHandleCatalogueClick(event),false);
});
test('metadata never exposes hidden or unverified products',()=>{
 const rows=[{id:'a',name:'Test shoe',description:'A description',category:'Shoes'},{id:'b',name:'Private name',isPublished:false,category:'Private'}];
 assert.deepEqual(catalogueMetadata({kind:'product',value:'a'},rows,true),{title:'Test shoe | GEOSTORE',description:'A description',indexable:true});
 assert.equal(catalogueMetadata({kind:'product',value:'a'},rows,false).indexable,false);
 assert.equal(catalogueMetadata({kind:'product',value:'b'},rows,true).indexable,false);
 assert.equal(catalogueMetadata({kind:'category',value:'Private'},rows,true).indexable,false);
 assert.equal(catalogueMetadata({kind:'category',value:'Shoes'},rows,true).indexable,true);
});
