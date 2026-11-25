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
  // Exercise the optional campaign settings within the existing browser matrix.
  const layout=width<=390?'compact':width<=768?'grid':'inherit';
  const timer=width<=390?'pills':width<=768?'outline':'digital';
  const bannerHeight=width<=640?104:width<=1023?144:208;
  const published={...config,published_config:{...config.published_config,siteSettings:{...config.published_config.siteSettings,visualDesign:{
    ...config.published_config.siteSettings.visualDesign,flashCampaignTheme:'black-friday',flashCampaignLayout:layout,
    flashTimerStyle:timer,flashTimerMotion:'reveal',flashCardStyle:'soft',flashDiscountStyle:'gold',flashButtonStyle:'outline',
    flashCampaignBanner:image,flashBannerAppearance:{desktopHeight:208,tabletHeight:144,mobileHeight:104,fit:'contain',placement:'above'}
  }}}};
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width,height:850},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],writes=[];
  page.on('pageerror',error=>errors.push(String(error.message||error)));
  try{
   await context.route('https://example.test/**',route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jkN0AAAAASUVORK5CYII=','base64')}));
   await context.route(supabaseOrigin+'/**',route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    if(req.method()==='GET'&&path==='/rest/v1/storefront_config')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([published])});
    if(req.method()==='GET'&&path==='/rest/v1/products')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(stage49FixtureProductRows)});
    if(req.method()!=='GET'&&!/^\/rest\/v1\/rpc\/(?:get_|list_|lookup_)/.test(path)){writes.push(req.method()+' '+path);return route.fulfill({status:403,contentType:'application/json',body:'{}'});}
    return route.fulfill({status:200,contentType:'application/json',body:'[]'});
   });
   await page.addInitScript(()=>{localStorage.setItem('geostore_lang','ka');localStorage.setItem('geostore_cart:guest','[]');localStorage.setItem('geostore_wishlist:guest','[]');});
   const response=await page.goto(host,{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response?.status(),200);
   await page.locator('.gs-signature-header').waitFor({state:'visible',timeout:30000});
   await page.locator('[data-signature-products="true"] .gs-catalog-product-card').first().waitFor({state:'visible',timeout:20000});
   const flash=page.locator('.gs-flash-sale-section[data-flash-campaign-theme="black-friday"]');
   await flash.waitFor({state:'visible',timeout:20000});
   assert.equal(await flash.getAttribute('data-flash-campaign-layout'),layout);
   assert.equal(await flash.locator('.gs-flash-sale-countdown').getAttribute('data-flash-timer-style'),timer);
   assert.equal(await flash.locator('.gs-flash-sale-card').count(),1,'Active fixture product only');
   assert.equal(await flash.locator('.gs-flash-sale-timer').count(),3);
   assert.equal(await flash.locator('.gs-flash-sale-countdown').evaluate(el=>getComputedStyle(el).animationName),'none','Reduced motion respected');
   const banner=flash.locator('.gs-flash-campaign-banner');
   await banner.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{const img=document.querySelector('.gs-flash-campaign-banner');return img?.complete&&img.naturalWidth>0;});
   const geometry=await flash.evaluate(el=>{
    const outer=el.getBoundingClientRect(),banner=el.querySelector('.gs-flash-campaign-banner'),heading=el.querySelector('.gs-video-flash-heading');
    const b=banner.getBoundingClientRect(),card=el.querySelector('.gs-flash-sale-card'),box=card.getBoundingClientRect();
    const action=card.querySelector('.gs-video-flash-add').getBoundingClientRect();
    const inside=(r,b)=>r.left>=b.left-2&&r.right<=b.right+2;
    return {bannerHeight:b.height,fit:getComputedStyle(banner).objectFit,above:b.bottom<=heading.getBoundingClientRect().top+2,
     contained:inside(b,outer)&&inside(box,outer)&&inside(action,box)&&action.height>=43,
     timerFits:[...el.querySelectorAll('.gs-flash-sale-timer')].every(t=>inside(t.getBoundingClientRect(),outer)),
     overflow:el.scrollWidth>el.clientWidth+2};
   });
   assert.ok(Math.abs(geometry.bannerHeight-bannerHeight)<=2&&geometry.fit==='contain'&&geometry.above&&geometry.contained&&geometry.timerFits&&!geometry.overflow,'Campaign geometry at '+width+': '+JSON.stringify(geometry));
   const saleCard=flash.locator('.gs-flash-sale-card');
   assert.ok((await saleCard.innerText()).includes('Stage46 Everyday Wallet'));
   assert.ok((await saleCard.locator('.gs-flash-sale-discount').innerText()).includes('22%'));
   await saleCard.locator('.gs-flash-sale-media').click();
   await page.locator('.gs-product-dialog .gs-product-detail-title').filter({hasText:'Stage46 Everyday Wallet'}).waitFor({state:'visible'});
   await page.locator('.gs-product-modal-close').click();
   await page.locator('.gs-product-dialog').waitFor({state:'detached'});
   assert.equal(await saleCard.locator('.gs-video-flash-add').isEnabled(),true);
   await saleCard.locator('.gs-video-flash-add').click();
   assert.equal(await page.locator('[data-signature-categories="true"] .gs-category-card').count(),4);
   assert.equal(await page.locator('.gs-signature-service-link').count(),4);
   const campaignBounds=await page.locator('[data-signature-banners="true"]').evaluate(grid=>{
     const card=grid.querySelector('.gs-signature-banner-card');
     if(!card || grid.children.length!==1) return false;
     const g=grid.getBoundingClientRect(), c=card.getBoundingClientRect();
     return c.width>=g.width-2 && c.right<=g.right+1 && c.left>=g.left-1;
   });
   assert.ok(campaignBounds,'Single published campaign fills available width at '+width);
   assert.equal(await page.locator('.gs-signature-mobile-nav').isVisible(),width<=640);
   if(width<=640){
     const nav=page.locator('.gs-signature-mobile-nav');
     const categoriesControl=nav.getByRole('button',{name:'კატეგორიები'});
     const geometry=await nav.evaluate(el=>{
       const outer=el.getBoundingClientRect();
       return [...el.querySelectorAll('button')].every(button=>{
         const r=button.getBoundingClientRect();
         return r.height>=44 && r.left>=outer.left-1 && r.right<=outer.right+1;
       });
     });
     assert.ok(geometry,'Mobile nav targets fit at '+width);
     await categoriesControl.click();
     const menu=page.locator('#geostore-main-menu');
     await menu.waitFor({state:'visible'});
     assert.equal(await categoriesControl.getAttribute('aria-expanded'),'true');
     assert.equal(await categoriesControl.getAttribute('aria-controls'),'geostore-main-menu');
     assert.ok(await menu.evaluate(el=>el.scrollWidth<=el.clientWidth+2),'Mobile menu does not overflow horizontally');
     await page.keyboard.press('Escape');
     await menu.waitFor({state:'detached'});
     assert.equal(await categoriesControl.getAttribute('aria-expanded'),'false');
     assert.ok(await page.locator('.gs-menu-toggle').evaluate(el=>document.activeElement===el),'Escape restores menu trigger focus');
   }
   const columns=await page.locator('[data-signature-products="true"]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
   assert.equal(columns,width<360?1:width<=640?2:width<=1023?3:6,'Signature columns at '+width);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Signature horizontal overflow at '+width);
   const allCategories=page.locator('.gs-signature-all-categories');
   assert.equal(await allCategories.getAttribute('aria-pressed'),'true');
   await page.locator('[data-signature-categories="true"] .gs-category-card').first().click();
   await page.waitForFunction(()=>document.querySelector('.gs-signature-all-categories')?.getAttribute('aria-pressed')==='false');
   await allCategories.focus();
   await page.keyboard.press('Space');
   await page.waitForFunction(()=>document.querySelector('.gs-signature-all-categories')?.getAttribute('aria-pressed')==='true');
   const headerBounds=await page.locator('.gs-signature-header .gs-site-header-inner').evaluate(el=>{
     const row=el.getBoundingClientRect();
     return [...el.querySelectorAll('.gs-signature-actions button')].filter(b=>b.getClientRects().length).every(b=>{
       const rect=b.getBoundingClientRect();
       return rect.width>=43 && rect.left>=row.left-1 && rect.right<=row.right+1;
     });
   });
   assert.ok(headerBounds,'Signature header controls remain inside the row at '+width);
   const cardsFit = await page.locator('[data-signature-products="true"] .gs-catalog-product-card').evaluateAll(cards => cards.every(card => {
     const box=card.getBoundingClientRect();
     const cta=card.querySelector('.gs-catalog-product-cta').getBoundingClientRect();
     const shortcuts=[...card.querySelectorAll('.gs-catalog-media-toggle')].map(el=>el.getBoundingClientRect());
     return cta.height>=43 && cta.left>=box.left-1 && cta.right<=box.right+1 &&
       shortcuts.every(rect=>rect.width>=43 && rect.height>=43 && rect.right<=box.right+1);
   }));
   assert.ok(cardsFit,'Signature cards retain accessible and contained actions at '+width);
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
   const modalGeometry=await page.locator('.gs-product-dialog').evaluate(dialog=>{
     const box=dialog.getBoundingClientRect();
     const body=dialog.querySelector('.gs-product-modal-body');
     const bodyRect=body.getBoundingClientRect();
     const bar=dialog.querySelector('.gs-product-modal-purchase-bar');
     const barRect=bar.getBoundingClientRect();
     const cta=bar.querySelector('.gs-modal-add-to-cart').getBoundingClientRect();
     return {inside:barRect.bottom<=box.bottom+1 && bodyRect.bottom<=barRect.top+1,
       scrollSafe:body.scrollWidth<=body.clientWidth+2,
       touchSafe:cta.height>=47 && cta.left>=box.left-1 && cta.right<=box.right+1};
   });
   assert.ok(modalGeometry.inside && modalGeometry.scrollSafe && modalGeometry.touchSafe,
     'Signature product dialog stays contained and purchase remains accessible at '+width+': '+JSON.stringify(modalGeometry));
   assert.equal(await page.locator('.gs-signature-mobile-nav').isVisible(),false);
   await page.locator('.gs-product-dialog .gs-modal-add-to-cart').click();
   await page.locator('.gs-product-dialog').waitFor({state:'detached'});
   await page.locator('.gs-signature-actions button').last().click();
   await page.locator('.gs-cart-item').filter({hasText:'Stage46 Everyday Wallet'}).waitFor({state:'visible'});
   const cartItem=page.locator('.gs-cart-item').filter({hasText:'Stage46 Everyday Wallet'});
   assert.ok(await cartItem.evaluate(el=>{
     const outer=el.getBoundingClientRect();
     return [...el.querySelectorAll('.gs-cart-quantity-controls button,.gs-cart-remove')].every(button=>{
       const r=button.getBoundingClientRect();
       return r.width>=43 && r.height>=43 && r.left>=outer.left-1 && r.right<=outer.right+1;
     });
   }),'Cart action targets remain contained at '+width);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Cart does not overflow at '+width);
   const footer=page.locator('.geostore-site-footer');
   assert.equal(await footer.locator('.geostore-footer-links > button').count(),3);
   assert.ok(await footer.evaluate(el=>{
     const outer=el.getBoundingClientRect();
     return [...el.querySelectorAll('.geostore-footer-links button,.gs-video-footer-support')].every(button=>{
       const r=button.getBoundingClientRect();
       return r.height>=43 && r.left>=outer.left-1 && r.right<=outer.right+1;
     });
   }),'Footer controls remain contained and accessible at '+width);
   await footer.locator('[data-visual-editor-target="footer.privacyLink"]').click();
   await page.waitForFunction(()=>document.querySelector('[data-visual-editor-target="footer.privacyLink"]')?.getAttribute('aria-current')==='page');

   assert.deepEqual(writes,[],'No live or attempted write in isolated guest scenario');
   assert.deepEqual(errors,[],'No browser exceptions in active Signature layout');
   console.log('PASS active Signature storefront '+width+'px');
  }finally{await context.close();}
 }
}
