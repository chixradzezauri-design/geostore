import assert from 'node:assert/strict';
import {stage49FixtureProductRows} from './stage46PurchaseScenarios.mjs';
const backend='https://xmtnszxtnfxnrojionoa.supabase.co';
const fixtureContextOptions=width=>({viewport:{width,height:850},serviceWorkers:'block',reducedMotion:'reduce'});
async function installCharacterFixture(context,readState){
  await context.route(backend+'/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    const {enabled,activeSale,character='cat',appearance={},extra={},saleEndsAt}=readState();
    const data=path==='/rest/v1/storefront_config'?[{is_published:true,published_config:{siteSettings:{characterStudio:{enabled,character,appearance,behavior:'run-wave',delay:0,duration:12,side:'right',message:'Character fixture',scenarios:{flash:{enabled:true,message:'Flash scene fixture'},cart:{enabled:true,message:'Cart scene fixture'},wishlist:{enabled:true,message:'Wishlist scene fixture'},cartAdded:{enabled:true,message:'Cart reaction fixture'},wishlistAdded:{enabled:true,message:'Wishlist reaction fixture'},product:{enabled:true,message:'Product guide fixture'},searchEmpty:{enabled:true,message:'Search helper fixture'}},...extra}}}}]:path==='/rest/v1/products'?stage49FixtureProductRows.map(p=>activeSale?(saleEndsAt&&p.flash_sale_ends_at?{...p,flash_sale_ends_at:saleEndsAt}:p):{...p,flash_sale_started_at:null,flash_sale_ends_at:null}):[];
    if(!['GET','HEAD','OPTIONS'].includes(route.request().method()))return route.fulfill({status:403,contentType:'application/json',body:'{}'});
    return route.fulfill({status:200,contentType:'application/json',headers:{'cache-control':'no-store'},body:JSON.stringify(data)});
  });
  await context.routeWebSocket('wss://xmtnszxtnfxnrojionoa.supabase.co/**',socket=>socket.close());
  await context.addInitScript(()=>localStorage.setItem('geostore_lang','ka'));
}
async function verifyDisabledPublishedConfig(browser,host,width){
  const context=await browser.newContext(fixtureContextOptions(width));
  try{
    let enabled=false;
    await installCharacterFixture(context,()=>({enabled,activeSale:false,appearance:{renderMode:'vector'}}));
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
    const scene=page.locator('.gs-character-scene:not(.gs-character-preview-scene)');
    assert.equal(await scene.count(),0,'Unpublished local configuration cannot enable mascot');
    // A newly published configuration must appear in an already open browser.
    const refresh=async()=>{
      const [response]=await Promise.all([
        page.waitForResponse(r=>r.url().includes('/rest/v1/storefront_config')&&r.request().method()==='GET'&&r.ok()),
        page.evaluate(()=>window.dispatchEvent(new Event('focus')))
      ]);
      return response.json();
    };
    enabled=true;
    assert.equal((await refresh())[0].published_config.siteSettings.characterStudio.enabled,true);
    await scene.waitFor({state:'visible',timeout:10000});
    assert.match(await scene.innerText(),/Character fixture/);
    await scene.locator('.gs-character-dismiss').click();
    await scene.waitFor({state:'detached'});
    await refresh();
    await page.waitForTimeout(500);
    assert.equal(await scene.count(),0,'Refreshing unchanged publication cannot replay greeting');
    enabled=false;
    assert.equal((await refresh())[0].published_config.siteSettings.characterStudio.enabled,false);
    await page.waitForTimeout(300);
    assert.equal(await scene.count(),0);
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
}
export async function runCharacterStudioSmoke(browser,host,widths){
  for(const width of widths){
    const context=await browser.newContext(fixtureContextOptions(width));
    try{
      const errors=[];
      let activeSale=true;
      await installCharacterFixture(context,()=>({enabled:true,activeSale,appearance:{renderMode:'vector'}}));
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

/** Exercise actual WebGL rendering and explicit fallback on the built storefront.
 * Software ANGLE is intentionally allowed in this isolated CI browser only. */
export async function runFlagship3DSmoke(browser,host){
  for(const [mode,character] of [['webgl','fox'],['webgl','panda'],['webgl','rabbit'],['webgl','robot'],['webgl','cat'],['webgl','monkey'],['webgl','bear'],['webgl','owl'],['webgl','cheetah'],['webgl','santa'],['webgl','snowman'],['webgl','deal'],['unavailable','fox'],['vector','fox']]){
    const context=await browser.newContext(fixtureContextOptions(390));
    try{
      await installCharacterFixture(context,()=>({enabled:true,activeSale:false,character,appearance:{renderMode:mode==='vector'?'vector':'auto'}}));
      await context.addInitScript(mode=>{
        const original=HTMLCanvasElement.prototype.getContext;
        window.__mascot3DProbe={requests:0,pixels:0,frames:0};
        HTMLCanvasElement.prototype.getContext=function(type,options){
          if(type!=='webgl')return original.call(this,type,options);
          window.__mascot3DProbe.requests++;
          if(mode==='unavailable')return null;
          const gl=original.call(this,type,{...options,failIfMajorPerformanceCaveat:false});
          if(!gl)return null;
          const getError=gl.getError.bind(gl);
          let sampled=false;
          gl.getError=function(){
            const result=getError();
            if(!sampled&&result===gl.NO_ERROR){
              const width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
              const pixels=new Uint8Array(width*height*4);
              gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
              let opaque=0;
              for(let i=3;i<pixels.length;i+=4)if(pixels[i]>128)opaque++;
              window.__mascot3DProbe.pixels=opaque;
              sampled=true;
            }
            window.__mascot3DProbe.frames++;
            return result;
          };
          return gl;
        };
      },mode);
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(host,{waitUntil:'domcontentloaded'});
      const scene=page.locator('.gs-character-scene:not(.gs-character-preview-scene)');
      await scene.waitFor({state:'visible',timeout:15000});
      if(mode==='webgl'){
        await scene.locator('[data-character-3d="ready"][data-character-3d-model="'+character+'"]').waitFor({state:'visible',timeout:10000});
        const probe=await page.evaluate(()=>window.__mascot3DProbe);
        assert.ok(probe.pixels>300,'Actual depth-tested model produced visible framebuffer pixels');
        assert.equal(probe.frames,1,'Reduced-motion mode renders a single WebGL frame');
        const canvas=scene.locator('canvas.gs-character-3d-canvas');
        assert.ok(await canvas.evaluate(n=>n.width<=256&&n.height<=290),'Framebuffer is capped');
        assert.equal(await canvas.evaluate(n=>getComputedStyle(n).pointerEvents),'none');
        // Simulate GPU context loss when the browser supplies the standard extension.
        const lost=await canvas.evaluate(n=>{
          const gl=n.getContext('webgl');const ext=gl?.getExtension('WEBGL_lose_context');
          if(!ext)return false;ext.loseContext();return true;
        });
        if(lost){await scene.locator('[data-character-3d="fallback"] svg[data-character-model="'+character+'"]').waitFor({state:'visible'});}
      }else{
        await scene.locator('svg[data-character-model="fox"]').waitFor({state:'visible'});
        if(mode==='unavailable'){
          await scene.locator('[data-character-3d="fallback"]').waitFor({state:'visible'});
          assert.ok(await page.evaluate(()=>window.__mascot3DProbe.requests)>0);
        }else{
          assert.equal(await scene.locator('canvas').count(),0,'Vector mode never creates a 3D canvas');
          assert.equal(await page.evaluate(()=>window.__mascot3DProbe.requests),0);
        }
      }
      await scene.locator('.gs-character-dismiss').click();
      await scene.waitFor({state:'detached'});
      assert.deepEqual(errors,[]);
      console.log('PASS 3D mascot '+character+' '+mode);
    }finally{await context.close();}
  }
}

/** The concierge interacts with the real SPA and an isolated published catalogue. */
export async function runConciergeV3Smoke(browser,host){
  const context=await browser.newContext(fixtureContextOptions(390));
  try{
    await installCharacterFixture(context,()=>({enabled:true,activeSale:false,appearance:{renderMode:'vector'},extra:{frequency:'repeat',repeatInterval:30,repeatLimit:3,rotation:'sequence',side:'alternate',placement:'roam',guideLinks:true,recommendProducts:true,recommendationMode:'variety',interactiveGuide:true,advice:{enabled:true,topic:'style'}}}));
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install();
    await page.goto(host,{waitUntil:'domcontentloaded'});
    const scene=page.locator('.gs-character-scene:not(.gs-character-preview-scene)');
    const product=scene.locator('[data-character-product]');
    const toggle=scene.locator('.gs-character-details-toggle');
    await toggle.waitFor({state:'visible',timeout:15000});
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    assert.equal(await product.isVisible(),false,'Recommendations do not occupy catalogue space before opening');
    const compactBox=await scene.locator('.gs-character-bubble').boundingBox();
    assert.ok(compactBox.height<=127,'Compact assistant has a bounded height');
    assert.equal(await scene.locator('.gs-character-bubble').evaluate(n=>getComputedStyle(n).animationName),'none');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    await product.waitFor({state:'visible',timeout:15000});
    assert.equal(await scene.getAttribute('data-side'),'left');
    const initial=await product.getAttribute('data-character-product');
    await scene.locator('[data-character-next-tip]').click();
    assert.ok(await scene.locator('[data-character-advice]').innerText());
    await scene.locator('[data-character-next-product]').click();
    assert.notEqual(await product.getAttribute('data-character-product'),initial);
    const bounds=await scene.boundingBox();
    assert.ok(bounds.x>=0&&bounds.x+bounds.width<=391&&bounds.y>=0&&bounds.y+bounds.height<=851);
    await scene.locator('.gs-character-dismiss').click();
    await scene.waitFor({state:'detached'});
    await page.clock.fastForward(45000);
    await scene.waitFor({state:'visible',timeout:10000});
    assert.equal(await scene.getAttribute('data-side'),'right');
    assert.match(await scene.innerText(),/Tech Panda/);
    await scene.locator('.gs-character-details-toggle').click();
    await scene.locator('.gs-character-mute').click();
    await scene.waitFor({state:'detached'});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('.gs-catalog-product-card').filter({hasText:'Stage46 Everyday Wallet'}).waitFor({state:'visible'});
    await page.clock.fastForward(60000);
    assert.equal(await scene.count(),0,'Mute persists after reload and cooldown');
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
  const sales=await browser.newContext(fixtureContextOptions(390));
  try{
    const end=new Date(Date.now()+120000).toISOString();
    await installCharacterFixture(sales,()=>({enabled:true,activeSale:true,saleEndsAt:end,appearance:{renderMode:'vector'},extra:{saleGuide:true,saleGuidePriority:'always',character:'deal',guideLinks:true}}));
    const page=await sales.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(host,{waitUntil:'domcontentloaded'});
    const scene=page.locator('.gs-character-scene:not(.gs-character-preview-scene)');
    const offer=scene.locator('[data-character-sale="true"]');
    await scene.locator('.gs-character-details-toggle').click({timeout:15000});
    await offer.waitFor({state:'visible',timeout:15000});
    assert.match(await offer.innerText(),/Stage46 Everyday Wallet/);
    assert.match(await offer.innerText(),/35.*45.*10/s);
    await offer.locator('[data-character-product]').click();
    const dialog=page.locator('.gs-product-dialog');
    await dialog.waitFor({state:'visible'});
    assert.match(await dialog.locator('.gs-product-detail-title').innerText(),/Stage46 Everyday Wallet/);
    assert.deepEqual(errors,[]);
  }finally{await sales.close();}
  console.log('PASS Concierge V3 repeat rotation, mute, interactive tips and verified sale navigation');
}
