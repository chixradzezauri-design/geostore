import assert from 'node:assert/strict';
const backend='https://xmtnszxtnfxnrojionoa.supabase.co';
export async function runCharacterStudioSmoke(browser,host,widths){
  for(const width of widths){
    const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block',reducedMotion:'reduce'});
    try{
      const errors=[];
      let enabled=true;
      await context.route(backend+'/**',async route=>{
        const path=new URL(route.request().url()).pathname;
        const data=path==='/rest/v1/storefront_config'?[{is_published:true,published_config:{siteSettings:{characterStudio:{enabled,character:'cat',behavior:'run-wave',delay:0,duration:12,side:'right',message:'Character fixture'}}}}]:[];
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
      });
      await context.routeWebSocket('wss://xmtnszxtnfxnrojionoa.supabase.co/**',socket=>socket.close());
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
      await mascot.locator('button').click();
      await mascot.waitFor({state:'detached'});
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('.geostore-storefront').waitFor({state:'visible'});
      await page.waitForTimeout(800);
      assert.equal(await mascot.count(),0,'Greeting cannot replay in same session');
      enabled=false;
      await page.evaluate(()=>{sessionStorage.removeItem('geostore_character_seen_v1');localStorage.setItem('geostore_site_settings',JSON.stringify({characterStudio:{enabled:true,delay:0}}));});
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('.geostore-storefront').waitFor({state:'visible'});
      await page.waitForTimeout(800);
      assert.equal(await mascot.count(),0,'Unpublished local configuration cannot enable mascot');
      assert.deepEqual(errors,[]);
      console.log('PASS character studio public greeting at '+width+'px');
    }finally{await context.close();}
  }
}
