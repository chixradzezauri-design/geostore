import assert from 'node:assert/strict';
import { stage49FixtureProductRows } from './stage46PurchaseScenarios.mjs';

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

export async function runAdminWorkspaceSmoke(browser, host) {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, reducedMotion: 'reduce' });
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
        if (path === '/rest/v1/rpc/admin_list_products' && method === 'POST') return respond(stage49FixtureProductRows);
        if (path === '/rest/v1/store_delivery_fees' && method === 'GET') return respond([{region:'tbilisi',fee_gel:0},{region:'bigCities',fee_gel:10},{region:'other',fee_gel:15}]);
        if (path === '/rest/v1/rpc/get_admin_panel_visual_design_state' && method === 'POST') return respond({ design: null, updated_at: null });
        if (path === '/rest/v1/rpc/has_staff_permission' && method === 'POST') return respond(true);
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
      await page.goto(host, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('.gs-menu-toggle').click();
      await page.locator('.gs-menu-login').click();
      const auth = page.locator('.gs-commerce-dialog--account');
      await auth.locator('#geostore-auth-email').fill(owner.email);
      await auth.locator('#geostore-auth-password').fill('fixture-only-password');
      await auth.locator('form button[type="submit"]').click();
      const shortcut = page.locator('.geostore-admin-shortcut button');
      await shortcut.waitFor({ state: 'visible', timeout: 20000 });
      await shortcut.click();
      const shell = page.locator('.admin-dashboard-shell');
      await shell.waitFor({ state: 'visible', timeout: 20000 });
      const picker = page.locator('#geostore-admin-mobile-section');
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
        if (tab === 'settings') {
          const fee = page.locator('#admin-workspace-delivery-tbilisi');
          const before = await fee.inputValue();
          await fee.fill('12.50');
          await shell.getByRole('button', { name: 'მონახაზის გაუქმება', exact: true }).click();
          assert.equal(await fee.inputValue(), before, 'Delivery draft cancellation restores the original value');
        }
        if (tab === 'vendors') {
          const supplier = shell.locator('.admin-supplier-workspace');
          await supplier.locator('[data-supplier-state="ready"]').waitFor({state:'visible'});
          await supplier.getByRole('button',{name:'სერვერული საკომისიოს შეცვლა: Fixture supplier',exact:true}).click();
          const commission=supplier.getByRole('spinbutton',{name:'სერვერული საკომისიო'});
          await commission.fill('12.50');
          await supplier.getByRole('button',{name:'სერვერული რედაქტირების გაუქმება',exact:true}).click();
          assert.equal(await commission.inputValue(),'','Cancelling the server supplier draft must not write');
          await supplier.getByRole('combobox',{name:'სერვერული მომწოდებლის სტატუსი'}).selectOption('archived');
          assert.equal(await supplier.locator('.admin-supplier-card').count(),0);
          await supplier.getByRole('combobox',{name:'სერვერული მომწოდებლის სტატუსი'}).selectOption('all');
          assert.equal(await supplier.locator('.admin-supplier-card').count(),1);
        }
        if (tab === 'users') await page.locator('#admin-workspace-crm-filter').selectOption('vip');
        if (tab === 'support') await page.locator('#admin-workspace-support-status').selectOption('ღია');
      }
      assert.deepEqual(writes, [], 'Opening and filtering modules must not mutate live or fixture data');
      assert.deepEqual(errors, [], 'No uncaught owner workspace errors');
      console.log('PASS intercepted owner workspace: ' + width + 'px, ' + Object.keys(modules).length + ' actual modules, no writes');
    } finally { await context.close(); }
  }
}
