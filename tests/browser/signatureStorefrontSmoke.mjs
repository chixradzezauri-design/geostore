import assert from 'node:assert/strict';
import {applySignature2026Design} from '../../src/utils/signature2026Design.js';
import {stage49FixtureProductRows} from './stage46PurchaseScenarios.mjs';

// Exercise the actual built app with a published Signature config in a fresh
// browser. Intercept every Supabase request; never change production data.
const supabaseOrigin='https://xmtnszxtnfxnrojionoa.supabase.co';
const categories=[{id:'accessories',name:'აქსესუარები'},{id:'clothing',name:'ტანსაცმელი'},{id:'shoes',name:'ფეხსაცმელი'},{id:'bags',name:'ჩანთები'}];
const image='https://example.test/signature-campaign.png';
const config={is_published:true,published_config:{
 categories,banners:[{id:'signature-campaign',title:'Signature campaign',subtitle:'Editorial collection',image,link:''}],
 siteSettings:{storeName:'GEOSTORE',topBarText:'GEOSTORE',heroTitle:'Signature main collection',heroSubtitle:'New season',visualDesign:applySignature2026Design({hero:{imageUrl:image}})}
}};
export async function runSignatureStorefrontSmoke(browser,host,widths=[320,390,768,1440]){
 for(const width of widths){
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width,height:850},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],writes=[];
  page.on('pageerror',error=>errors.push(String(error.message||error)));
  try{
   await context.route('https://example.test/**',route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jkN0AAAAASUVORK5CYII=','base64')}));
   await context.route(supabaseOrigin+'/**',route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    if(req.method()==='GET'&&path==='/rest/v1/storefront_config')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([config])});
    if(req.method()==='GET'&&path==='/rest/v1/products')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(stage49FixtureProductRows)});
    if(req.method()!=='GET'&&!/^\/rest\/v1\/rpc\/(?:get_|list_|lookup_)/.test(path)){writes.push(req.method()+' '+path);return route.fulfill({status:403,contentType:'application/json',body:'{}'});}
    return route.fulfill({status:200,contentType:'application/json',body:'[]'});
   });
   await page.addInitScript(()=>{localStorage.setItem('geostore_lang','ka');localStorage.setItem('geostore_cart:guest','[]');localStorage.setItem('geostore_wishlist:guest','[]');});
   const response=await page.goto(host,{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response?.status(),200);
   await page.locator('.gs-signature-header').waitFor({state:'visible',timeout:30000});
   await page.locator('[data-signature-products="true"] .gs-catalog-product-card').first().waitFor({state:'visible',timeout:20000});
   assert.equal(await page.locator('[data-signature-categories="true"] .gs-category-card').count(),4);
   assert.equal(await page.locator('.gs-signature-service-link').count(),4);
   assert.equal(await page.locator('.gs-signature-mobile-nav').isVisible(),width<=640);
   const columns=await page.locator('[data-signature-products="true"]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
   assert.equal(columns,width<360?1:width<=640?2:width<=1023?3:6,'Signature columns at '+width);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Signature horizontal overflow at '+width);
   const hero=page.locator('[data-signature-hero="true"]');
   await hero.locator('.gs-signature-hero-dot').nth(1).click();
   await hero.getByRole('heading',{name:'Signature campaign'}).waitFor({state:'visible'});
   await hero.locator('.gs-signature-hero-dot').first().click();
   await hero.getByRole('heading',{name:'Signature main collection'}).waitFor({state:'visible'});
   const search=page.locator('.gs-header-search-row');
   await page.locator('.gs-signature-actions button').first().click();
   await search.waitFor({state:'visible'});
   await search.locator('input').fill('Stage46 Everyday Wallet');
   await page.waitForFunction(()=>document.querySelectorAll('.gs-catalog-product-card').length===1);
   await search.locator('.gs-header-search-clear').click();
   assert.equal(await search.isVisible(),true,'Search remains open after clearing');
   assert.ok(await search.locator('input').evaluate(el=>document.activeElement===el),'Search clear restores focus in Signature at '+width);
   await page.waitForFunction(()=>document.querySelectorAll('.gs-catalog-product-card').length===4);
   await search.locator('.gs-signature-search-dismiss').click();
   await search.waitFor({state:'hidden'});
   const card=page.locator('.gs-catalog-product-card').filter({hasText:'Stage46 Everyday Wallet'});
   await card.locator('.gs-catalog-product-title-action').click();
   await page.locator('.gs-product-dialog').waitFor({state:'visible'});
   assert.equal(await page.locator('.gs-signature-mobile-nav').isVisible(),false);
   await page.locator('.gs-product-dialog .gs-modal-add-to-cart').click();
   await page.locator('.gs-product-dialog').waitFor({state:'detached'});
   await page.locator('.gs-signature-actions button').last().click();
   await page.locator('.gs-cart-item').filter({hasText:'Stage46 Everyday Wallet'}).waitFor({state:'visible'});
   assert.deepEqual(writes,[],'No live or attempted write in isolated guest scenario');
   assert.deepEqual(errors,[],'No browser exceptions in active Signature layout');
   console.log('PASS active Signature storefront '+width+'px');
  }finally{await context.close();}
 }
}
