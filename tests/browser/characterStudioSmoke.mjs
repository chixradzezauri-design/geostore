import assert from 'node:assert/strict';
import {stage49FixtureProductRows} from './stage46PurchaseScenarios.mjs';
const backend='https://xmtnszxtnfxnrojionoa.supabase.co';
const fixtureContextOptions=width=>({viewport:{width,height:850},serviceWorkers:'block',reducedMotion:'reduce'});
async function installCharacterFixture(context,readState){
  await context.route(backend+'/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    const {enabled,activeSale}=readState();
    const data=path==='/rest/v1/storefront_config'?[{is_published:true,published_config:{siteSettings:{characterStudio:{enabled,character:'cat',behavior:'run-wave',delay:0,duration:12,side:'right',message:'Character fixture',scenarios:{flash:{enabled:true,message:'Flash scene fixture'},cart:{enabled:true,message:'Cart scene fixture'},wishlist:{enabled:true,message:'Wishlist scene fixture'},cartAdded:{enabled:true,message:'Cart reaction fixture'},wishlistAdded:{enabled:true,message:'Wishlist reaction fixture'},product:{enabled:true,message:'Product guide fixture'},searchEmpty:{enabled:true,message:'Search helper fixture'}}}}}}]:path==='/rest/v1/products'?stage49FixtureProductRows.map(p=>activeSale?p:{...p,flash_sale_started_at:null,flash_sale_ends_at:null}):[];
    if(!['GET','HEAD','OPTIONS'].includes(route.request().method()))return route.fulfill({status:403,contentType:'application/json',body:'{}'});
    return route.fulfill({status:200,contentType:'application/json',headers:{'cache-control':'no-store'},body:JSON.stringify(data)});
  });
  await context.routeWebSocket('wss://xmtnszxtnfxnrojionoa.supabase.co/**',socket=>socket.close());
  await context.addInitScript(()=>localStorage.setItem('geostore_lang','ka'));
}
async function verifyDisabledPublishedConfig(browser,host,width){
  const context=await browser.newContext(fixtureContextOptions(width));
  try{
    await installCharacterFixture(context,()=>({enabled:false,activeSale:false}));
    await context.addInitScript(()=>{
      localStorage.setItem('geostore_site_settings',JSON.stringify({characterStudio:{enabled:true,delay:0,message:'Unpublished fixture'}}));
      sessionStorage.removeItem('geostore_character_seen_v1');
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const [response]=await Promise.all([
      page.waitForResponse(r=>r.url().includes('/rest/v1/storefront_config')&&r.request().method()==='GET'&&r.ok()),
      page.goto(host,{waitUntil:'domcontentloaded'})
    ]);
    const rows=await response.json();
    assert.equal(rows[0].published_config.siteSettings.characterStudio.enabled,false,'Disabled published fixture actually delivered');
    await page.locator('.gs-catalog-product-card').filter({hasText:'Stage46 Everyday Wallet'}).waitFor({state:'visible'});
    await page.waitForTimeout(800);
    assert.equal(await page.locator('.gs-character-scene:not(.gs-character-preview-scene)').count(),0,'Unpublished local configuration cannot enable mascot');
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
}
export async function runCharacterStudioSmoke(browser,host,widths){
  for(const width of widths){
    const context=await browser.newContext(fixtureContextOptions(width));
    try{
      const errors=[];
      let activeSale=true;
      await installCharacterFixture(context,()=>({enabled:true,activeSale}));
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(host,{waitUntil:'domcontentloaded'});
      const mascot=page.locator('.gs-character-scene:not(.gs-character-preview-scene)');
      await mascot.waitFor({state:'visible',timeout:15000});
      assert.match(await mascot.innerText(),/Character fixture/);
      assert.equal(await mascot.evaluate(n=>getComputedStyle(n).animationName),'none','Reduced motion must be respected');
      const box=await mascot.boundingBox();
      assert.ok(box.x>=0&&box.x+box.width<=width+1,'Mascot must fit viewport');
      assert.equal(await mascot.evaluate(n=>getComputedStyle(n).pointerEvents),'none');
      const dismiss=mascot.locator('.gs-character-dismiss');
      assert.equal(await dismiss.evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'Mascot dismiss must not be obstructed by the assistance dock');
      const dockButtons=page.locator('.gs-floating-support .gs-floating-action, .gs-floating-ai .gs-floating-action');
      for(const button of await dockButtons.all()){
        if(await button.isVisible())assert.equal(await button.evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'Assistance buttons remain clickable with mascot visible');
      }
      await dismiss.click({timeout:8000});
      await mascot.waitFor({state:'detached'});
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('.geostore-storefront').waitFor({state:'visible'});
      await page.waitForTimeout(800);
      assert.equal(await mascot.count(),0,'Greeting cannot replay in same session');
      const flash=page.locator('.gs-flash-sale-section .gs-character-context');
      await flash.waitFor({state:'visible',timeout:15000});
      assert.match(await flash.innerText(),/Flash scene fixture/);
      await page.locator('.gs-menu-toggle').click();
      await page.locator('#geostore-main-menu .gs-menu-link').filter({hasText:'კალათა'}).click();
      const cartScene=page.locator('.gs-cart-empty .gs-character-context');
      await cartScene.waitFor({state:'visible',timeout:10000});
      assert.match(await cartScene.innerText(),/Cart scene fixture/);
      await page.locator('.gs-menu-toggle').click();
      await page.locator('#geostore-main-menu .gs-menu-link').filter({hasText:'ფავორიტები'}).click();
      const wishlistScene=page.locator('.gs-video-wishlist-empty .gs-character-context');
      await wishlistScene.waitFor({state:'visible',timeout:10000});
      assert.match(await wishlistScene.innerText(),/Wishlist scene fixture/);
      await page.locator('.gs-video-wishlist-empty .gs-video-continue-shopping').click();
      const card=page.locator('.gs-catalog-product-card').filter({hasText:'Stage46 Everyday Wallet'});
      await card.locator('.gs-catalog-product-title-action').click();
      const dialog=page.locator('.gs-product-dialog');
      await dialog.waitFor({state:'visible'});
      const productGuide=dialog.locator('.gs-character-product-context .gs-character-context');
      await productGuide.waitFor({state:'visible'});
      assert.match(await productGuide.innerText(),/Product guide fixture/);
      await dialog.locator('.gs-modal-add-to-cart').click();
      await dialog.waitFor({state:'detached'});
      const reaction=page.locator('[role="status"] .gs-character-reaction');
      await reaction.waitFor({state:'visible'});
      assert.match(await reaction.innerText(),/Cart reaction fixture/);
      assert.equal(await reaction.locator('.gs-character-reaction-art').evaluate(n=>getComputedStyle(n).animationName),'none');
      await card.locator('.gs-catalog-wishlist-toggle').click();
      await reaction.waitFor({state:'detached'});
      assert.equal(await card.locator('.gs-catalog-wishlist-toggle').getAttribute('aria-pressed'),'true','Cooldown never blocks commerce');
      activeSale=false;
      await Promise.all([page.waitForResponse(r=>r.url().includes('/rest/v1/storefront_config')&&r.ok()),page.reload({waitUntil:'domcontentloaded'})]);
      await page.locator('.gs-catalog-product-card').filter({hasText:'Stage46 Everyday Wallet'}).waitFor({state:'visible'});
      assert.equal(await flash.count(),0,'No flash mascot without active sale');
      assert.deepEqual(errors,[]);
    }finally{await context.close();}
    await verifyDisabledPublishedConfig(browser,host,width);
    console.log('PASS character studio public greeting at '+width+'px');
  }
}
