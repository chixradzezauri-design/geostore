import assert from 'node:assert/strict';
import { stage49FixtureProductRows } from './stage46PurchaseScenarios.mjs';
import { collectAdminVisualBaseline } from './adminVisualBaseline.mjs';

const backend = 'https://xmtnszxtnfxnrojionoa.supabase.co';
// The application uses an exact owner-ID check. This is an intercepted
// synthetic user response only, not a credential or a live session.
const owner = {
  id: '1060de3d-d28a-45f8-9a64-5e0368cffc4b', email: 'owner-fixture@workspace.test',
  aud: 'authenticated', role: 'authenticated',
  app_metadata: { role: 'admin', provider: 'email', providers: ['email'] },
  user_metadata: { name: 'Workspace fixture' }, created_at: '2026-11-24T00:00:00Z'
};
const accessToken = 'isolated-workspace-fixture';
const modules = {
  command: '.admin-command-center', analytics: '.admin-analytics', calculator: '.admin-profit-calculator',
  expenses: '.admin-expenses', ai_analyst: '.admin-ai-analyst', orders: '.admin-orders-panel',
  products: '.admin-products-panel', inventory: '[aria-labelledby="admin-inventory-title"]',
  replenishment: '[aria-labelledby="admin-replenishment-title"]', categories: '.admin-category-manager',
  vendors: '.admin-vendors-panel', users: '.admin-crm-panel', support: '.admin-support-panel',
  messages: '#admin-workspace-legacy-search', broadcasts: '.admin-broadcasts-panel',
  discounts: '.admin-discounts-panel', coupons: '.admin-coupons-panel', banners: '.admin-banners',
  visual_editor: '.gs-storefront-visual-editor', admin_visual_editor: '.admin-visual-editor-panel',
  staff: '.admin-staff', logs: '.admin-audit-logs-panel', settings: '.admin-settings-panel'
};

export const ADMIN_AUDIT_WIDTHS = Object.freeze([320, 360, 390, 430, 768, 1024, 1440]);
export async function runAdminWorkspaceSmoke(browser, host, { widths = [390, 1440], auditWidths = ADMIN_AUDIT_WIDTHS, layoutOnly = false } = {}) {
  const engine = browser.browserType().name();
  const layoutFailures = [];
  for (const width of widths) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 850 }, reducedMotion: 'reduce' });
    const errors = [];
    const writes = [];
    try {
      // Intercept the complete backend, including realtime. No real account,
      // database records, emails, payments or writes are used in this test.
      await context.route(backend + '/**', async route => {
        const req = route.request(), url = new URL(req.url()), path = url.pathname, method = req.method();
        const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
        if (path === '/auth/v1/token' && method === 'POST' && url.searchParams.get('grant_type') === 'password') {
          const payload = req.postDataJSON() || {};
          if (payload.email !== owner.email || payload.password !== 'fixture-only-password') return respond({ message: 'Invalid fixture login' }, 400);
          return respond({ access_token: accessToken, refresh_token: 'isolated-fixture-refresh', token_type: 'bearer',
            expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: owner });
        }
        if (path === '/auth/v1/user' && method === 'GET') {
          return req.headers().authorization === 'Bearer ' + accessToken ? respond(owner) : respond({ message: 'Unauthenticated fixture' }, 401);
        }
        if (path === '/auth/v1/logout' && method === 'POST') return route.fulfill({ status: 204 });
        if (path === '/rest/v1/admin_suppliers' && method === 'GET') return respond([{id:'00000000-0000-4000-8000-000000000001',name:'Fixture supplier',commission:5,is_active:true,revision:1,updated_at:'2026-11-24T12:00:00Z'}]);
        if (path === '/rest/v1/products' && method === 'GET') return respond(stage49FixtureProductRows);
        if (path === '/rest/v1/rpc/admin_list_inventory_movements' && method === 'POST') return respond({
          items: [{id:1, product_name:'ტესტური პროდუქტი', variant_name:'სტანდარტული ვარიანტი', before_quantity:2, after_quantity:1, quantity_delta:-1, reason:'manual_adjustment', occurred_at:'2026-11-24T12:00:00Z'}],
          has_more: false
        });
        if (path === '/rest/v1/rpc/admin_list_products' && method === 'POST') return respond(stage49FixtureProductRows);
        if (path === '/rest/v1/store_delivery_fees' && method === 'GET') return respond([{region:'tbilisi',fee_gel:0},{region:'bigCities',fee_gel:10},{region:'other',fee_gel:15}]);
        if (path === '/rest/v1/rpc/get_admin_panel_visual_design_state' && method === 'POST') return respond({ design: null, updated_at: null });
        if (path === '/rest/v1/rpc/has_staff_permission' && method === 'POST') return respond(true);
        // Explicit read-only RPC fixtures. No save/check/consent mutation is allowlisted.
        if (method === 'POST' && ['/rest/v1/rpc/admin_read_supplier_balance','/rest/v1/rpc/admin_marketing_segments','/rest/v1/rpc/admin_read_marketing_campaigns','/rest/v1/rpc/admin_read_marketing_templates'].includes(path)) {
          if (req.headers().authorization !== 'Bearer '+accessToken) return respond({message:'Owner required'},403);
          const body=req.postDataJSON()||{};
          if(path.endsWith('/admin_read_supplier_balance')&&Object.keys(body).length===1&&body.p_supplier===null)return respond({supplier_id:null,purchase_count:'0',received_tetri:'0',paid_tetri:'0',balance_tetri:'0'});
          if(path.endsWith('/admin_marketing_segments')&&Object.keys(body).length===0)return respond({as_of:'2026-11-24T12:00:00Z',timezone:'Asia/Tbilisi',new_days:30,inactive_days:90,segments:Object.fromEntries(['all','vip','new','no_purchase','one_purchase','repeat','inactive'].map(k=>[k,{accounts:'0',consent_candidates:'0'}]))});
          if(path.endsWith('/admin_read_marketing_campaigns')&&Object.keys(body).length===1&&body.p_id===null)return respond({total:'0',campaigns:[],delivery_enabled:false});
          if(path.endsWith('/admin_read_marketing_templates')&&Object.keys(body).length===1&&body.p_id===null)return respond({total:'0',templates:[]});
          return respond({message:'Unexpected read scope'},400);
        }
        // Verified STABLE read-only RPC: the POST transport does not mutate orders.
        if (path === '/rest/v1/rpc/admin_order_ledger_page' && method === 'POST') return respond([]);
        if (path === '/functions/v1/manage-admin-staff' && method === 'POST' && req.postDataJSON()?.action === 'list') return respond({ staff: [] });
        if (method === 'GET' || (method === 'POST' && /^\/rest\/v1\/rpc\/(?:get_|list_|admin_list_|admin_order_image_refs_page$)/.test(path))) return respond([]);
        writes.push(method + ' ' + path);
        return respond({ message: 'Workspace fixture: mutation blocked' }, 403);
      });
      await context.routeWebSocket('wss://xmtnszxtnfxnrojionoa.supabase.co/**', socket => socket.close());
      await context.addInitScript(() => localStorage.setItem('geostore_lang', 'ka'));
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error.message || error)));
      const moduleRequests=new Set();
      page.on('request',request=>{
        const file=new URL(request.url()).pathname.split('/').pop();
        if(file&&/^(AdminPanelVisualEditor|AdminSupplierWorkspace|AdminPurchaseWorkspace|AdminMarketingSegments)-[\w-]+\.js$/.test(file))moduleRequests.add(file.split('-')[0]);
      });
      await page.goto(host, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('.geostore-storefront').waitFor({state:'visible'});
      const adminCss=await page.locator('meta[name="gs-admin-css-slot"]').getAttribute('content');
      assert.ok(adminCss?.includes('/assets/admin-core-'));
      assert.equal(await page.locator('link[data-gs-admin-core]').count(),0,'Admin CSS must not load for the anonymous storefront');
      await page.locator('.gs-menu-toggle').click();
      await page.locator('.gs-menu-login').click();
      const auth = page.locator('.gs-commerce-dialog--account');
      await auth.locator('#geostore-auth-email').fill(owner.email);
      await auth.locator('#geostore-auth-password').fill('fixture-only-password');
      await auth.locator('form button[type="submit"]').click();
      const shell = page.locator('.admin-dashboard-shell');
      await shell.waitFor({ state: 'visible', timeout: 20000 });
      assert.equal(await page.locator('link[data-gs-admin-core]').count(),1,'Admin CSS loads once on entry');
      assert.ok(await page.locator('link[data-gs-admin-core]').evaluate(node=>Boolean(node.sheet)&&node.nextElementSibling?.getAttribute('name')==='gs-admin-css-slot'),'Loaded stylesheet stays in original cascade slot');
      assert.equal(moduleRequests.size,0,'Dedicated admin modules must not load on the initial command center');
      const picker = page.locator('#geostore-admin-mobile-section');
      const visualBaseline=[];
      const matrix=[];
      assert.equal(await shell.locator('.admin-pro-brand h3').textContent(),'GEOSTORE Admin PRO');
      for (const [tab, selector] of Object.entries(modules)) {
        // Desktop and phone use the real exposed navigation controls.
        if (await picker.isVisible()) await picker.selectOption(tab);
        else {
          const label = (await picker.locator('option[value="' + tab + '"]').textContent()).trim();
          await shell.locator('[data-admin-visual-nav-item="true"]').filter({
            has: page.getByText(label, { exact: true })
          }).click();
        }
        try {
          await shell.locator(selector).first().waitFor({ state: 'visible', timeout: 20000 });
          await page.waitForFunction(expected => document.querySelector('#geostore-admin-mobile-section')?.value === expected, tab, { timeout: 5000 });
        } catch (error) {
          const selected = await picker.inputValue().catch(() => 'unavailable');
          throw new Error(width + 'px: expected module ' + tab + ', active ' + selected + ', errors: ' + errors.join('; ') + '; ' + error.message);
        }
        assert.deepEqual(errors, [], width + 'px ' + tab + ': uncaught browser error');
        // Capture the untouched module before any fixture edits or interactions.
        visualBaseline.push(await collectAdminVisualBaseline(shell,tab));
        assert.equal(await shell.locator('.admin-pro-header-actions').count(), ['banners','settings','visual_editor','discounts'].includes(tab) ? 1 : 0);
        if (['command','expenses'].includes(tab)) {
          const heading = shell.locator(tab === 'command' ? '#admin-command-title' : '#admin-expense-add-title');
          const ink = await heading.evaluate(node => getComputedStyle(node).webkitTextFillColor);
          assert.equal(ink, 'rgb(24, 34, 48)', 'Workspace headings use the active foreground on light cards');
        }
        if (tab === 'inventory') {
          const region = shell.locator('.admin-inventory-table-scroll');
          await region.locator('tbody tr').first().waitFor();
          const geometry = await region.evaluate(node => ({
            scrollWidth: node.scrollWidth,
            clientWidth: node.clientWidth,
            reasonWidth: node.querySelector('tbody td:nth-child(5)').getBoundingClientRect().width
          }));
          assert.ok(geometry.reasonWidth >= 120, 'Inventory reason stays readable');
          if (width < 768) assert.ok(geometry.scrollWidth > geometry.clientWidth, 'Inventory scrolls inside the table region');
        }
        const activeNav=shell.locator('[data-admin-visual-nav-item="true"][aria-current="page"]');
        assert.equal(await activeNav.count(),1,'Exactly one active authorized navigation item');
        assert.ok((await shell.locator('.admin-pro-section-context').textContent())?.trim(),'Active group context is visible');
        // Reuse the same intercepted session, no extra deploy or login per width.
        // Resize before mutating any local fixture UI and restore the entry width.
        if (width === widths[0]) {
          for (const targetWidth of auditWidths) {
            await page.setViewportSize({ width: targetWidth, height: 850 });
            await page.waitForFunction(expected => window.innerWidth === expected, targetWidth);
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            if (targetWidth < 640 && ['staff','vendors'].includes(tab)) {
              const fields = shell.locator(tab === 'staff' ? '.admin-staff-existing-form .admin-pro-native-control-boundary' : '.admin-purchase-workspace .admin-pro-native-control-boundary');
              assert.equal(await fields.count(),tab === 'staff' ? 1 : 3,'Native field boundaries preserve every existing field');
              for (const field of await fields.all()) {
                const bounds = await field.evaluate(node => {
                  const control = node.querySelector('select,input');
                  const a = node.getBoundingClientRect(), b = control.getBoundingClientRect();
                  return {visible:a.width > 0 && a.height > 0 && b.width > 0 && b.height > 0,fits:b.left >= a.left-2 && b.right <= a.right+2,tag:control.tagName};
                });
                assert.ok(bounds.visible && bounds.fits, engine+' '+tab+' '+targetWidth+': native '+bounds.tag+' stays in its visible field');
              }
            }
            // Stage 15: verify geometry and touch targets of the new workspace controls.
            const newControlIssues = await shell.evaluate(root => {
              const controls = root.querySelectorAll('[data-admin-sidebar="true"] > .admin-video-logout, #geostore-admin-mobile-section, .admin-pro-header-actions > button, .admin-unified-editor-jumps > button, .admin-unified-product-jumps > button');
              const bounds = root.getBoundingClientRect();
              return [...controls].flatMap(node => {
                const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
                if (!rect.width || !rect.height || style.visibility !== 'visible' || node.closest('[hidden],[aria-hidden="true"]')) return [];
                return rect.left < bounds.left - 2 || rect.right > bounds.right + 2 || rect.height < 43.5 ? [{tag:node.tagName, className:typeof node.className==='string'?node.className.slice(0,120):'',width:Math.round(rect.width),height:Math.round(rect.height)}] : [];
              });
            });
            const sample = await collectAdminVisualBaseline(shell, tab);
            const selected = await picker.inputValue();
            const moduleVisible = await shell.locator(selector).first().isVisible();
            const activeCount = await activeNav.count();
            matrix.push({module:tab,width:targetWidth,documentOverflow:sample.documentOverflow,workspaceOverflow:sample.main.overflow,shortControls:sample.shortControls,imageLoadFailures:sample.imageLoadFailures,selected,moduleVisible,activeCount});
            if (sample.documentOverflow > 2 || sample.main.overflow > 2 || selected !== tab || !moduleVisible || activeCount !== 1 || newControlIssues.length) {
              // Diagnostic geometry only, from the isolated synthetic fixture.
              // Do not log text, input values, URLs or customer identifiers.
              const offenders = await shell.evaluate(root => {
                const main = root.querySelector('.admin-workspace-main');
                if (!main) return [];
                const boundary = main.getBoundingClientRect();
                const right = boundary.left + main.clientLeft + main.clientWidth;
                const result = [];
                for (const node of main.querySelectorAll('*')) {
                  const rect = node.getBoundingClientRect();
                  if (!rect.width || !rect.height || node.closest('[hidden],[aria-hidden="true"]')) continue;
                  const style = getComputedStyle(node);
                  if (style.display === 'none' || style.visibility !== 'visible') continue;
                  const excess = Math.max(0,rect.right-right);
                  const internal = Math.max(0,node.scrollWidth-node.clientWidth);
                  if (excess <= 2 && internal <= 2) continue;
                  const parent = node.parentElement;
                  result.push({tag:node.tagName.toLowerCase(),className:typeof node.className==='string'?node.className.slice(0,180):'',parentClass:typeof parent?.className==='string'?parent.className.slice(0,140):'',width:Math.round(rect.width),excess:Math.round(excess),internal,display:style.display,minWidth:style.minWidth,whiteSpace:style.whiteSpace,overflowX:style.overflowX});
                }
                return result.sort((a,b)=>Math.max(b.excess,b.internal)-Math.max(a.excess,a.internal)).slice(0,16);
              });
              layoutFailures.push({engine,module:tab,width:targetWidth,overflow:sample.documentOverflow,workspaceOverflow:sample.main.overflow,selected,moduleVisible,activeCount,newControlIssues,offenders});
            }
          }
          await page.setViewportSize({ width, height: 850 });
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        }
        if (layoutOnly) continue;
        if(tab==='analytics'){
          assert.equal(await shell.locator('[data-admin-pro-finance-kpi]').count(),8,'All eight financial KPI cards retained');
          assert.ok(await shell.locator('[data-admin-pro-finance-state]').isVisible());
          const period=shell.locator('#admin-analytics-period');
          await period.selectOption('30');
          assert.equal(await period.inputValue(),'30');
          await period.selectOption('all');
        }
        if(tab==='calculator'){
          const cost=shell.locator('#admin-calc-purchase-cost'),price=shell.locator('#admin-calc-selling-price');
          const oldCost=await cost.inputValue(),oldPrice=await price.inputValue();
          await cost.fill('100');
          await price.fill('0');
          assert.equal(await shell.locator('[data-admin-pro-calculator-net]').getAttribute('data-admin-pro-calculator-net'),'loss');
          await cost.fill(oldCost);
          await price.fill(oldPrice);
        }
        if(tab==='inventory'){
          assert.equal(await shell.locator('[data-admin-pro-inventory-summary="history"] > div').count(),3,'Three inventory history metrics remain');
        }
        if(tab==='replenishment'){
          assert.equal(await shell.locator('[data-admin-pro-inventory-summary="planning"] > div').count(),3,'Three planning metrics remain');
          const query=shell.getByRole('searchbox',{name:'მარაგის შევსების გეგმის ძიება'});
          await query.fill('fixture-no-match-31c8');
          await shell.getByRole('button',{name:'ფილტრების გასუფთავება',exact:true}).first().click();
          assert.equal(await query.inputValue(),'','Stock planning reset restores search');
          assert.equal(await shell.locator('#admin-workspace-replenishment-filter').inputValue(),'all');
        }
        if(tab==='orders'){
          const search=shell.getByRole('textbox',{name:'შეკვეთების ძებნა'});
          await search.fill('synthetic-no-match');
          await shell.getByRole('button',{name:'ფილტრების გასუფთავება',exact:true}).first().click();
          assert.equal(await search.inputValue(),'','Order reset restores unfiltered search');
          assert.equal(await shell.locator('.admin-order-status-filters button[aria-pressed="true"]').textContent().then(x=>x.trim()),'ყველა');
        }
        if(tab==='command'){
          const cards=shell.locator('.admin-command-kpi[data-admin-kpi-tone]');
          assert.equal(await cards.count(),4,'All four operational KPI cards retained');
          assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(n=>n.dataset.adminKpiTone)),['primary','warning','danger','info']);
          assert.equal(await shell.locator('.admin-command-panel').count(),4,'All operational detail panels retained');
        }
        if(tab==='settings'){
          const studio=shell.locator('[data-character-studio]');
          await studio.waitFor({state:'visible'});
          assert.equal(await studio.locator('.gs-character-roster button[aria-pressed][type="button"]').count(),12,'twelve character cards');
          for(const label of ['კომპიუტერი','ტელეფონი'])assert.equal(await studio.getByRole('button',{name:label,exact:true}).count(),1,'one viewport control per device');
          assert.equal(await studio.locator('.gs-character-extra-controls button[aria-pressed]').count(),2,'two independent feature toggles');
          await studio.getByRole('button',{name:/Mini Robot/}).click();
          await studio.getByRole('button',{name:'ტელეფონი',exact:true}).click();
          await studio.getByRole('button',{name:'ანიმაციის გაშვება'}).click();
          await studio.locator('[data-character-playback][data-playing="true"] .gs-character-preview-scene').waitFor({state:'visible',timeout:10000});
          assert.match(await studio.locator('[data-character-playback][data-playing="true"] .gs-character-preview-scene').innerText(),/Mini Robot/);
          const visitorScene=studio.locator('[data-character-playback] .gs-character-preview-scene');
          assert.equal(await visitorScene.getAttribute('data-character-visitor-preview'),'true');
          assert.equal(await visitorScene.getAttribute('data-character-details'),'compact');
          assert.equal(await visitorScene.locator('.gs-character-bubble').evaluate(n=>getComputedStyle(n).animationName),'none');
          await studio.locator('[data-character-visitor-preview-toggle]').click();
          assert.equal(await visitorScene.getAttribute('data-character-details'),'expanded');
          await studio.locator('[data-character-visitor-preview-toggle]').click();
          assert.equal(await visitorScene.getAttribute('data-character-details'),'compact');
          assert.equal(await page.locator('.gs-character-scene:not(.gs-character-preview-scene)').count(),0,'Admin preview does not start public mascot');
          const box=await studio.locator('[data-character-playback]').boundingBox();
          assert.ok(box.width<=321,'Phone preview is constrained to phone width');
          const appearance=studio.locator('[data-character-appearance]');
          await appearance.locator('summary').click();
          await appearance.getByLabel('ტელეფონზე ზომა',{exact:true}).fill('96');
          await appearance.getByLabel('პერსონაჟის ფერი',{exact:true}).fill('#123456');
          await appearance.getByLabel('მისალმების ფონი',{exact:true}).fill('#000000');
          await appearance.getByLabel('ბუშტის ფორმა').selectOption('pill');
          const live=appearance.locator('.gs-character-preview-scene');
          assert.equal(await live.locator('.gs-character-figure').evaluate(n=>getComputedStyle(n).width),'96px');
          assert.equal(await live.locator('.gs-character-bubble').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(0, 0, 0)');
          assert.equal(await live.locator('.gs-character-bubble').evaluate(n=>getComputedStyle(n).color),'rgb(255, 255, 255)');
          assert.equal(await live.locator('.gs-character-bubble').evaluate(n=>getComputedStyle(n).borderTopLeftRadius),'28px');
          assert.ok(await live.locator('svg stop[stop-color="#123456"]').count()>0);
          assert.equal(await live.locator('svg[data-character-render="dimensional"][data-character-model="robot"]').count(),1);
          const gradientIds=await studio.locator('svg.gs-character-art defs [id]').evaluateAll(nodes=>nodes.map(n=>n.id));
          assert.equal(new Set(gradientIds).size,gradientIds.length,'Every character preview has independent lighting definitions');
          assert.equal(await studio.locator('button[aria-pressed] svg[data-character-model]').count(),12);
          assert.equal(await studio.locator('button[aria-pressed] svg[data-character-material="metal"]').count(),2);
          assert.equal(await studio.locator('button[aria-pressed] svg[data-character-material="feathers"]').count(),1);
          assert.equal(await studio.locator('button[aria-pressed] svg[data-character-material="fur"]').count(),7);
          assert.equal(await studio.locator('button[aria-pressed] .gs-character-head').count(),12);
          await appearance.getByRole('button',{name:'ვიზუალური პარამეტრების აღდგენა'}).click();
          assert.equal(await live.locator('.gs-character-figure').evaluate(n=>getComputedStyle(n).width),'92px');
          const greetings=studio.locator('[data-character-greetings]');
          await greetings.locator('summary').click();
          await greetings.getByLabel('მისალმების რეჟიმი').selectOption('library');
          await greetings.getByLabel('ფრაზა 1',{exact:true}).fill('Fixture greeting library');
          await greetings.getByLabel('ვიზუალური ეფექტი').selectOption('sparkles');
          await greetings.getByLabel('მომხმარებელს შეუძლია საპასუხოდ ხელი დაუქნიოს').check();
          await studio.getByRole('button',{name:'ანიმაციის გაშვება'}).click();
          const greetingPlayback=studio.locator('[data-character-playback][data-playing="true"] .gs-character-preview-scene');
          await greetingPlayback.waitFor({state:'visible',timeout:10000});
          assert.match(await greetingPlayback.innerText(),/Fixture greeting library/);
          const greetingDisclosure=greetingPlayback.locator('.gs-character-details-toggle');
          const waveButton=greetingPlayback.getByRole('button',{name:/ხელის დაქნევა/});
          assert.equal(await greetingDisclosure.getAttribute('aria-expanded'),'false','Visitor playback starts compact');
          assert.equal(await waveButton.isVisible(),false,'Reply gesture is hidden until disclosure opens');
          await greetingDisclosure.click();
          assert.equal(await greetingDisclosure.getAttribute('aria-expanded'),'true');
          await waveButton.waitFor({state:'visible',timeout:3000});
          await waveButton.click();
          assert.match(await greetingPlayback.innerText(),/ვაშა!/);
          assert.equal(await greetingPlayback.getAttribute('data-motion'),'celebrate');
          await greetingPlayback.waitFor({state:'detached',timeout:15000});
          const calendar=studio.locator('[data-character-calendar]');
          await calendar.locator('summary').click();
          await calendar.getByRole('button',{name:'ღონისძიების დამატება'}).click();
          await calendar.getByLabel('ღონისძიება',{exact:true}).waitFor({state:'visible',timeout:10000});
          await calendar.getByLabel('თემა',{exact:true}).selectOption('newyear');
          await calendar.getByLabel('მისალმება (ka)',{exact:true}).fill('Fixture calendar greeting');
          await studio.getByLabel('საიტზე ჩართვა',{exact:true}).check();
          await calendar.getByLabel('კალენდრის ჩართვა',{exact:true}).check();
          await calendar.getByLabel('ღონისძიება ჩართულია',{exact:true}).check();
          assert.match(await calendar.innerText(),/მოქმედი: ახალი ღონისძიება/);
          await calendar.getByRole('button',{name:'ღონისძიების ანიმაციის ნახვა'}).click();
          const eventScene=calendar.locator('.gs-character-preview-scene');
          await eventScene.waitFor({state:'visible',timeout:12000});
          assert.match(await eventScene.innerText(),/Fixture calendar greeting/);
          // The loading/fallback state deliberately keeps the hidden canvas mounted.
          // Count only the visible renderer and still require the selected Panda identity.
          const visiblePanda=eventScene.locator('svg[data-character-model="panda"]:visible, [data-character-3d-model="panda"][data-character-3d="ready"] canvas:visible');
          await visiblePanda.waitFor({state:'visible'});
          assert.equal(await visiblePanda.count(),1);
          await calendar.locator('summary').click();
          await eventScene.waitFor({state:'detached'});
          const scenarios=studio.locator('[data-character-scenarios]');
          await scenarios.locator('summary').click();
          await scenarios.getByLabel('სცენარი',{exact:true}).selectOption('cart');
          await scenarios.getByLabel('სცენარის პერსონაჟი').selectOption('panda');
          await scenarios.getByLabel('სცენარის ტექსტი').fill('Fixture cart scene');
          assert.match(await scenarios.locator('.gs-character-context').innerText(),/Tech Panda.*Fixture cart scene/s);
          const presets=studio.locator('[data-character-presets]');
          await presets.getByLabel('მზა რეჟიმი').selectOption('active');
          await presets.locator('[data-character-apply-preset]').click();
          await presets.locator('[data-character-undo-preset]').waitFor({state:'visible'});
          assert.equal(await presets.locator('.gs-concierge-summary [data-enabled="true"]').count(),5);
          const roster=studio.locator('.gs-character-roster');
          assert.ok(await roster.evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length)>=2,'Mobile roster must have at least two columns');
          const demo=studio.locator('[data-character-functional-preview]');
          await demo.getByRole('button',{name:'გამოცდის გახსნა'}).click();
          await demo.locator('[data-character-next-tip]').click();
          assert.ok(await demo.locator('[data-character-advice]').innerText());
          const sample=await demo.locator('[data-character-product]').getAttribute('data-character-product');
          await demo.locator('[data-character-next-product]').click();
          assert.notEqual(await demo.locator('[data-character-product]').getAttribute('data-character-product'),sample);
          await demo.locator('[data-character-product]').click();
          assert.match(await demo.locator('[role="status"]').last().innerText(),/საცდელი მოქმედება/);
          await demo.getByRole('button',{name:'გამოცდის დახურვა'}).click();
          await presets.locator('[data-character-undo-preset]').click();
          assert.equal(await presets.locator('[data-character-undo-preset]').count(),0);
          await presets.locator('[data-character-complete-setup]').click();
          await presets.locator('[data-character-undo-preset]').waitFor({state:'visible'});
          assert.match(await studio.locator('[data-character-profiles] summary').innerText(),/12\/12/);
          await demo.getByRole('button',{name:'გამოცდის გახსნა'}).click();
          await demo.locator('[data-character-help="budget"]').click();
          assert.match(await demo.locator('[role="status"]').last().innerText(),/ბიუჯეტური/);
          await demo.getByRole('button',{name:'გამოცდის დახურვა'}).click();
          await presets.locator('[data-character-undo-preset]').click();
          const profiles=studio.locator('[data-character-profiles]');
          await profiles.locator('summary').click();
          await profiles.getByLabel('ინდივიდუალური პერსონაჟი').selectOption('owl');
          await profiles.getByRole('button',{name:'რეკომენდებული როლის გამოყენება'}).click();
          assert.equal(await profiles.getByLabel('რჩევის მიმართულება').inputValue(),'details');
          await profiles.getByLabel('ინდივიდუალური მისალმება',{exact:true}).fill('Fixture owl profile');
          assert.match(await profiles.locator('.gs-character-preview-scene').innerText(),/Fixture owl profile/);
          await profiles.locator('[data-character-all-roles]').click();
          assert.match(await profiles.locator('summary').innerText(),/12\/12/);
          assert.equal(await profiles.getByLabel('ინდივიდუალური მისალმება',{exact:true}).inputValue(),'Fixture owl profile');
          await profiles.getByLabel('ინდივიდუალური პერსონაჟი').selectOption('deal');
          assert.equal(await profiles.getByLabel('სასურველი განყოფილება').inputValue(),'flash');
          await profiles.locator('summary').click();
          assert.match(await scenarios.locator('.gs-character-context').innerText(),/Tech Panda.*Fixture cart scene/s);
        }
        if(tab==='admin_visual_editor'){
          assert.ok(moduleRequests.has('AdminPanelVisualEditor'),'Admin editor loads on entering its section');
          const editor=shell.locator('.admin-visual-editor-panel');
          const jumps=editor.locator('.admin-unified-editor-jumps');
          await jumps.getByRole('button',{name:'ფერები / PRO',exact:true}).click();
          const palette=editor.locator('[data-admin-studio-group="palette"]');
          assert.ok(await palette.evaluate(node=>node.open),'Shortcut opens existing palette without modifying a setting');
          await palette.locator(':scope > summary').click();
          assert.deepEqual(writes,[],'Opening editor sections never writes settings');
        }
        if(tab==='products'){
          const productSearch=shell.getByRole('searchbox',{name:'პროდუქტის ძებნა'});
          await productSearch.fill('fixture-no-match-9d776');
          await shell.getByRole('button',{name:'ფილტრების გასუფთავება',exact:true}).first().click();
          assert.equal(await productSearch.inputValue(),'','Catalogue reset restores search');
          assert.ok(await shell.locator('.admin-pro-product-result-row').isVisible());
          const gallery=shell.locator('#admin-workspace-product-gallery');
          // Deterministic large JPEG, locally generated; no actual Storage writes.
          const bytes=await page.evaluate(async()=>{
            const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1600;
            const ctx=canvas.getContext('2d'),data=ctx.createImageData(canvas.width,canvas.height);
            let state=123456;
            for(let i=0;i<data.data.length;i+=4){
              state=(Math.imul(state,1664525)+1013904223)>>>0;
              const v=(state>>>24)&255;
              data.data[i]=v;data.data[i+1]=v;data.data[i+2]=v;data.data[i+3]=255;
            }
            ctx.putImageData(data,0,0);
            const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.92));
            return Array.from(new Uint8Array(await blob.arrayBuffer()));
          });
          assert.ok(bytes.length>128*1024&&bytes.length<=5*1024*1024);
          // Chromium canvas JPEGs may contain an ICC APP2 segment. The production
          // optimizer deliberately preserves those. Strip APP2 only from this
          // synthetic sRGB fixture, never from a user's uploaded image.
          const original=Buffer.from(bytes);
          assert.equal(original.readUInt16BE(0),0xffd8);
          const parts=[original.subarray(0,2)];
          let offset=2, app2Count=0, scanFound=false;
          while(offset<original.length){
            const start=offset;
            assert.equal(original[offset++],0xff);
            while(original[offset]===0xff)offset++;
            const marker=original[offset++];
            if(marker===0xda){parts.push(original.subarray(start));scanFound=true;break;}
            assert.ok(marker!==0xd9&&offset+2<=original.length);
            const length=original.readUInt16BE(offset);
            assert.ok(length>=2&&offset+length<=original.length);
            offset+=length;
            if(marker===0xe2)app2Count++;
            else parts.push(original.subarray(start,offset));
          }
          assert.ok(scanFound,'Synthetic JPEG contains a scan');
          const eligible=Buffer.concat(parts);
          assert.ok(eligible.length>128*1024&&eligible.length<=5*1024*1024);
          const thumbnail=shell.locator('.admin-product-gallery-thumbnail img').first();
          const remove=()=>shell.getByRole('button',{name:'ფოტო 1 — წაშლა',exact:true}).click();
          if(app2Count){
            await gallery.setInputFiles({name:'profiled.jpg',mimeType:'image/jpeg',buffer:original});
            await thumbnail.waitFor({state:'visible',timeout:20000});
            const preserved=await thumbnail.getAttribute('src');
            assert.ok(preserved==='data:image/jpeg;base64,'+original.toString('base64'),'ICC JPEG must be retained byte for byte');
            await remove();
            await thumbnail.waitFor({state:'detached'});
          }
          await gallery.setInputFiles({name:'fixture.jpg',mimeType:'image/jpeg',buffer:eligible});
          await thumbnail.waitFor({state:'visible',timeout:20000});
          assert.equal(await thumbnail.evaluate(el=>getComputedStyle(el).objectFit),'contain','Photo preview preserves the full composition');
          const optimized=await thumbnail.getAttribute('src');
          assert.ok(optimized?.startsWith('data:image/webp;base64,'),'Eligible JPEG must convert to WebP');
          const encoded=Buffer.from(optimized.split(',')[1],'base64');
          assert.ok(encoded.length<=eligible.length*0.85,'WebP must save at least 15%');
          await page.waitForFunction(()=>{const img=document.querySelector('.admin-product-gallery-thumbnail img');return img?.naturalWidth===2048&&img?.naturalHeight===1365;});
          await remove();
          await thumbnail.waitFor({state:'detached'});
          const gif=Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
          await gallery.setInputFiles({name:'fixture.gif',mimeType:'image/gif',buffer:gif});
          await thumbnail.waitFor({state:'visible'});
          assert.equal(await thumbnail.getAttribute('src'),'data:image/gif;base64,'+gif.toString('base64'));
          await shell.getByRole('button',{name:'ფოტო 1 — წაშლა',exact:true}).click();
        }
        if (tab === 'settings') {
          const fee = page.locator('#admin-workspace-delivery-tbilisi');
          const before = await fee.inputValue();
          await fee.fill('12.50');
          await shell.getByRole('button', { name: 'მონახაზის გაუქმება', exact: true }).click();
          assert.equal(await fee.inputValue(), before, 'Delivery draft cancellation restores the original value');
        }
        if(tab==='categories'){
          const search=shell.locator('#admin-workspace-category-search');
          await search.fill('fixture-no-match-b31');
          await shell.getByRole('button',{name:'ძიების გასუფთავება',exact:true}).click();
          assert.equal(await search.inputValue(),'','Category search resets without mutations');
          assert.ok(await shell.locator('[data-admin-pro-category-summary]').isVisible());
        }
        if (tab === 'vendors') {
          const purchase = shell.locator('.admin-purchase-workspace');
          await purchase.locator('[data-purchase-state="ready"]').waitFor({state:'visible'});
          assert.equal(await purchase.getByRole('button',{name:'შესყიდვის მონახაზის შექმნა',exact:true}).isDisabled(),true);
          await purchase.getByRole('combobox',{name:'შესყიდვის სტატუსი',exact:true}).selectOption('partial');
          const supplier = shell.locator('.admin-supplier-workspace');
          await supplier.locator('[data-supplier-state="ready"]').waitFor({state:'visible'});
          assert.ok(moduleRequests.has('AdminSupplierWorkspace')&&moduleRequests.has('AdminPurchaseWorkspace'),'Vendor modules load on entering vendors');
          assert.equal(moduleRequests.has('AdminMarketingSegments'),false,'Marketing code still deferred');
          await supplier.getByRole('button',{name:'სერვერული საკომისიოს შეცვლა: Fixture supplier',exact:true}).click();
          const commission=supplier.getByRole('spinbutton',{name:'სერვერული საკომისიო'});
          await commission.fill('12.50');
          await supplier.getByRole('button',{name:'სერვერული რედაქტირების გაუქმება',exact:true}).click();
          assert.equal(await commission.inputValue(),'','Cancelling the server supplier draft must not write');
          await supplier.getByRole('combobox',{name:'სერვერული მომწოდებლის სტატუსი'}).selectOption('archived');
          assert.equal(await supplier.locator('.admin-supplier-card').count(),0);
          await supplier.getByRole('combobox',{name:'სერვერული მომწოდებლის სტატუსი'}).selectOption('all');
          assert.equal(await supplier.locator('.admin-supplier-card').count(),1);
          assert.equal(await supplier.locator('[data-admin-pro-supplier-status="active"]').count(),1,'Active supplier status retains server identity');
        }
        if (tab === 'users') {
          await page.locator('#admin-workspace-crm-filter').selectOption('vip');
          assert.ok(await shell.locator('[data-admin-pro-crm-summary]').isVisible());
          await shell.locator('.admin-workspace-crm-filters').getByRole('button',{name:'გასუფთავება',exact:true}).click();
          assert.equal(await shell.locator('#admin-workspace-crm-filter').inputValue(),'all');
          const segments=shell.locator('.admin-marketing-segments');
          await segments.getByRole('combobox',{name:'სეგმენტის ფილტრი'}).selectOption('vip');
          await segments.locator('.admin-marketing-campaigns').getByRole('button',{name:'მონახაზის შენახვა'}).waitFor({state:'visible'});
          assert.ok(moduleRequests.has('AdminMarketingSegments'),'Marketing module loads on entering users');
          assert.equal(await segments.locator('.admin-marketing-campaigns').getByRole('button',{name:'მონახაზის შენახვა'}).isDisabled(),true);
        }
        if(tab==='discounts'){
          const workspace=shell.locator('[data-gs-flash-workspace="true"]');
          const pricing=shell.locator('[data-gs-flash-pricing="true"]');
          const design=shell.locator('[data-gs-flash-design="true"]');
          await workspace.getByRole('button',{name:'სახელი და დიზაინი',exact:true}).click();
          const editor=design.locator('[data-gs-flash-editor="true"]');
          await editor.waitFor({state:'visible',timeout:20000});
          assert.equal(await pricing.isVisible(),false);
          const controls=editor.locator('[data-gs-campaign-controls="true"]');
          const name=controls.getByPlaceholder('მაგ. შავი პარასკევი');
          await name.waitFor({state:'visible'});
          const initialName=await name.inputValue();
          await controls.getByRole('button',{name:'შავი პარასკევი',exact:true}).click();
          assert.equal(await name.inputValue(),'შავი პარასკევი');
          await controls.getByRole('button',{name:'Black Friday',exact:true}).click();
          const preview=editor.locator('.gs-visual-preview-frame');
          await preview.locator('.gs-flash-sale-section[data-flash-campaign-theme="black-friday"]').waitFor({state:'visible',timeout:20000});
          assert.equal(await preview.locator('#gs-video-collections').count(),0,'Focused preview contains only campaign');
          assert.equal(await editor.locator('input[type="file"][accept="image/jpeg,image/png,image/webp"]').isVisible(),true);
          await workspace.getByRole('button',{name:'ფასები და განრიგი',exact:true}).click();
          assert.equal(await pricing.isVisible(),true);
          assert.equal(await design.isVisible(),false);
          await workspace.getByRole('button',{name:'სახელი და დიზაინი',exact:true}).click();
          assert.equal(await name.inputValue(),'შავი პარასკევი','Switching workspace tabs retains draft edits');
          await editor.getByRole('button',{name:'გაუქმება',exact:true}).click();
          await editor.getByRole('button',{name:'გაუქმება',exact:true}).click();
          assert.equal(await name.inputValue(),initialName);
          assert.ok(await editor.evaluate(el=>el.scrollWidth<=el.clientWidth+2),'Focused editor does not overflow at '+width);
          await workspace.getByRole('button',{name:'ფასები და განრიგი',exact:true}).click();
          assert.deepEqual(writes,[],'Flash editor preview and subtab switching do not publish or change prices');
          console.log('PASS focused Flash Studio at '+width+'px');
        }
        if (tab === 'visual_editor') {
          const editor=shell.locator('.gs-storefront-visual-editor');
          const frame=editor.locator('.gs-visual-preview-frame');
          const library=editor.locator('.gs-storefront-design-templates');
          await library.locator('summary').click();
          await library.getByRole('textbox',{name:'შაბლონის სახელი',exact:true}).fill('Fixture design');
          await library.getByRole('button',{name:'მიმდინარე საიტის დიზაინის შენახვა',exact:true}).click();
          await library.getByText('Fixture design',{exact:true}).waitFor({state:'visible'});
          await editor.getByRole('button',{name:'გაუქმება',exact:true}).click();
          await library.getByText('Fixture design',{exact:true}).waitFor({state:'detached'});
          const sections=editor.locator('[data-gs-section-controls="true"]');
          await sections.locator(':scope > summary').click();
          const desktop=editor.getByRole('button',{name:'Desktop',exact:true});
          const mobile=editor.getByRole('button',{name:'Mobile',exact:true});
          const readOrder=()=>frame.locator('.geostore-storefront').evaluate(node=>{
            const category=node.querySelector('#gs-video-collections'),filter=node.querySelector('#gs-video-catalog-anchor');
            return Boolean(category&&filter&&(category.compareDocumentPosition(filter)&Node.DOCUMENT_POSITION_FOLLOWING));
          });
          await desktop.click();
          assert.equal(await readOrder(),true,'Default desktop categories precede filters');
          await mobile.click();
          await sections.getByRole('button',{name:'კატეგორიები ქვემოთ',exact:true}).click();
          assert.equal(await readOrder(),false,'Mobile order must actually change the DOM');
          await desktop.click();
          assert.equal(await readOrder(),true,'Mobile reorder must not alter desktop');
          await mobile.click();
          assert.equal(await readOrder(),false,'Mobile override survives switching view');
          await sections.getByRole('button',{name:'საერთო რიგის აღდგენა',exact:true}).click();
          assert.equal(await readOrder(),true,'Inheritance restores desktop order');
          const geometry=editor.locator('.gs-section-geometry');
          await geometry.locator('summary').click();
          await geometry.getByRole('combobox',{name:'დაშორების სექცია'}).selectOption('categories');
          await geometry.getByRole('slider',{name:'მაქსიმალური სიგანე',exact:true}).press('Home');
          const category=frame.locator('#gs-video-collections');
          assert.equal(await category.getAttribute('data-gs-section-width'),'true');
          assert.equal(await category.evaluate(node=>node.style.getPropertyValue('--gs-section-max-width')),'85%');
          await desktop.click();
          assert.equal(await category.getAttribute('data-gs-section-width'),null,'Mobile width cannot affect desktop');
          await mobile.click();
          assert.equal(await category.getAttribute('data-gs-section-width'),'true');
          await geometry.getByRole('button',{name:'საერთო მნიშვნელობის აღდგენა',exact:true}).last().click();
          assert.equal(await category.getAttribute('data-gs-section-width'),null,'Geometry reset removes explicit override');
          await desktop.click();
          assert.deepEqual(writes,[],'Local visual editor changes must not save or publish automatically');
          console.log('PASS isolated storefront editor: template undo, responsive DOM order and width inheritance at '+width+'px');
        }
        if (tab === 'support') {
          await page.locator('#admin-workspace-support-status').selectOption('ღია');
          assert.ok(await shell.locator('[data-admin-pro-support-summary]').isVisible());
          await shell.getByRole('button',{name:'ფილტრების გასუფთავება',exact:true}).click();
          assert.equal(await shell.locator('#admin-workspace-support-status').inputValue(),'all');
        }
      }
      assert.equal(visualBaseline.length,Object.keys(modules).length,'Every permitted module has a visual baseline');
      assert.equal(new Set(visualBaseline.map(row=>row.module)).size,Object.keys(modules).length);
      console.log('ADMIN_VISUAL_BASELINE '+JSON.stringify({engine,width,modules:visualBaseline}));
      if (width === widths[0]) {
        assert.equal(matrix.length, Object.keys(modules).length * auditWidths.length,'All modules measured at all requested widths');
        assert.equal(new Set(matrix.map(row=>row.module+':'+row.width)).size,matrix.length,'No duplicate device/module measurements');
        console.log('ADMIN_DEVICE_MATRIX '+JSON.stringify({engine,widths:auditWidths,measurements:matrix,failures:layoutFailures}));
      }
      assert.deepEqual(writes, [], 'Opening and filtering modules must not mutate live or fixture data');
      assert.deepEqual(errors, [], 'No uncaught owner workspace errors');
      console.log('PASS intercepted owner workspace: ' + width + 'px, ' + Object.keys(modules).length + ' actual modules, no writes');
    } finally { await context.close(); }
  }
  assert.deepEqual(layoutFailures, [], engine + ': device matrix has page/workspace overflow or navigation regressions');
}
