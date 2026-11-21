import assert from 'node:assert/strict';
import { stage49FixtureProductRows } from './stage46PurchaseScenarios.mjs';

const supabase = 'https://xmtnszxtnfxnrojionoa.supabase.co';
const mockUsers = {
  a: {
    id: '49000000-0000-4000-8000-00000000000a', email: 'customer-a@stage49.test',
    aud: 'authenticated', role: 'authenticated',
    app_metadata: { provider: 'email', providers: ['email'] },
    // User-editable metadata must NOT grant staff/owner/admin privileges.
    user_metadata: { name: 'Customer A', phone: '599000001', role: 'admin' },
    created_at: '2026-11-21T00:00:00Z'
  },
  b: {
    id: '49000000-0000-4000-8000-00000000000b', email: 'customer-b@stage49.test',
    aud: 'authenticated', role: 'authenticated',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { name: 'Customer B', phone: '599000002', role: 'admin' },
    created_at: '2026-11-21T00:00:00Z'
  }
};
const tokenPrefix = 'stage49-fixture-';
const tokens = Object.fromEntries(Object.entries(mockUsers).map(([key]) =>
  [key, tokenPrefix + key]));
const testProduct = stage49FixtureProductRows.find(product => product.id === 'stage46-simple');

const readCart = async (page, owner = null) => page.evaluate(id => {
  const key = id ? 'geostore_cart:user:' + encodeURIComponent(id) : 'geostore_cart:guest';
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return null; }
}, owner);

const waitCart = async (page, owner, count) => page.waitForFunction(({ id, expected }) => {
  const key = id ? 'geostore_cart:user:' + encodeURIComponent(id) : 'geostore_cart:guest';
  try {
    const cart = JSON.parse(localStorage.getItem(key) || '[]');
    return cart.reduce((n, item) => n + Number(item.quantity || 0), 0) === expected;
  } catch { return false; }
}, { id: owner, expected: count }, { timeout: 15000 });

const openMenu = async page => {
  await page.locator('.gs-menu-toggle').click();
  await page.locator('#geostore-main-menu').waitFor({ state: 'visible' });
};
const navigate = async (page, name) => {
  await openMenu(page);
  await page.locator('#geostore-main-menu .gs-menu-link').filter({ hasText: name }).first().click();
};
const login = async (page, key) => {
  await openMenu(page);
  await page.locator('.gs-menu-login').click();
  const auth = page.locator('.gs-commerce-dialog--account');
  await auth.waitFor({ state: 'visible' });
  await auth.locator('#geostore-auth-email').fill(mockUsers[key].email);
  await auth.locator('#geostore-auth-password').fill('stage49-safe-password');
  await auth.locator('form button[type="submit"]').click();
  await auth.waitFor({ state: 'detached', timeout: 15000 });
  // The header menu is closed by login; wait for the authenticated owner's
  // storage slot, then verify the account control inside the reopened menu.
  await page.waitForFunction(id => Boolean(
    localStorage.getItem('geostore_cart:user:' + encodeURIComponent(id))
  ), mockUsers[key].id, { timeout: 15000 });
  await openMenu(page);
  await page.locator('.gs-menu-account').waitFor({ state: 'visible' });
  assert.ok((await page.locator('.gs-menu-heading').innerText()).includes(mockUsers[key].user_metadata.name));
  await page.locator('.gs-menu-toggle').click();
};
const logout = async page => {
  await openMenu(page);
  await page.locator('.gs-menu-account').click();
  const profile = page.locator('.gs-profile-page');
  await profile.waitFor({ state: 'visible' });
  await profile.locator('button').filter({ hasText: 'გასვლა' }).click();
  await profile.waitFor({ state: 'detached', timeout: 15000 });
};
const addSimpleProduct = async page => {
  await navigate(page, 'მაღაზია');
  const trigger = page.locator('.gs-catalog-product-card')
    .filter({ hasText: testProduct.name }).locator('.gs-catalog-product-title-action');
  await trigger.waitFor({ state: 'visible', timeout: 15000 });
  await trigger.click();
  await page.locator('.gs-product-dialog .gs-modal-add-to-cart').click();
  await page.locator('.gs-product-dialog').waitFor({ state: 'detached' });
};
const openCheckout = async page => {
  await navigate(page, 'კალათა');
  await page.locator('.gs-cart-checkout').click();
  const dialog = page.locator('.gs-checkout-dialog');
  await dialog.waitFor({ state: 'visible', timeout: 15000 });
  return dialog;
};

// No real Supabase requests are ever forwarded. Only fixture auth token/logout
// requests may be "writes"; all database mutations are categorically blocked.
export async function runStage49AccountSwitchScenario(browser, host) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, reducedMotion: 'reduce'
  });
  const intercepted = [];
  const blockedMutations = [];
  const pageErrors = [];
  const userForRequest = request => {
    const token = (request.headers().authorization || '').replace(/^bearer\s+/i, '');
    return Object.entries(tokens).find(([, value]) => value === token)?.[0] || null;
  };
  try {
    await context.route(supabase + '/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      const method = request.method();
      intercepted.push(method + ' ' + path);
      const reply = (status, data) => route.fulfill({
        status, contentType: 'application/json', body: JSON.stringify(data)
      });
      if (path === '/auth/v1/token' && method === 'POST') {
        const payload = request.postDataJSON() || {};
        const key = Object.keys(mockUsers).find(k => mockUsers[k].email === payload.email);
        if (url.searchParams.get('grant_type') !== 'password' || !key ||
            payload.password !== 'stage49-safe-password') {
          return reply(400, { message: 'Invalid login credentials', error: 'invalid_grant' });
        }
        return reply(200, {
          access_token: tokens[key], refresh_token: 'stage49-refresh-' + key,
          token_type: 'bearer', expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: mockUsers[key]
        });
      }
      if (path === '/auth/v1/user' && method === 'GET') {
        const key = userForRequest(request);
        return key ? reply(200, mockUsers[key]) : reply(401, { message: 'Not authenticated' });
      }
      if (path === '/auth/v1/logout' && method === 'POST') {
        return route.fulfill({ status: 204 });
      }
      if (path === '/rest/v1/products' && method === 'GET') {
        return reply(200, stage49FixtureProductRows);
      }
      if (path === '/rest/v1/rpc/get_my_admin_access' && method === 'POST') {
        return reply(200, { is_admin: false, is_staff: false, permissions: {} });
      }
      if (/^\/rest\/v1\/rpc\/(?:get_my_|list_my_)/.test(path) && method === 'POST') {
        return reply(200, []);
      }
      if (method === 'GET') return reply(200, []);
      blockedMutations.push(method + ' ' + path);
      return reply(403, { message: 'Stage49: unexpected write blocked' });
    });
    await context.routeWebSocket('wss://xmtnszxtnfxnrojionoa.supabase.co/**', socket => socket.close());

    await context.addInitScript(seed => {
      localStorage.setItem('geostore_lang', 'ka');
      localStorage.setItem('geostore_products', JSON.stringify(seed));
      // An explicit guest slot avoids legacy cart migration interfering with
      // owner-isolation assertions. Do not overwrite on each cross-tab load.
      if (!localStorage.getItem('geostore_cart:guest'))
        localStorage.setItem('geostore_cart:guest', '[]');
    }, stage49FixtureProductRows.map(row => ({
      id: row.id, name: row.name, category: row.category,
      priceGEL: row.price_gel, oldPriceGEL: row.old_price_gel ?? null,
      stock: row.stock, variants: row.variants,
      availableSizes: row.available_sizes, availableColors: row.available_colors,
      image: null, gallery: [], tags: []
    })));
    const page = await context.newPage();
    page.on('pageerror', err => pageErrors.push(String(err.message || err)));
    await page.goto(host, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('.gs-catalog-product-card')
      .filter({ hasText: testProduct.name }).waitFor({ state: 'visible', timeout: 20000 });
    await addSimpleProduct(page);
    await waitCart(page, null, 1);

    // Guest → A is isolated: no guest product in A's cart.
    await login(page, 'a');
    await waitCart(page, mockUsers.a.id, 0);
    assert.equal((await readCart(page, null)).length, 1,
      'Guest cart survives without leaking to signed-in account A');
    assert.equal(await page.locator('.geostore-admin-shortcut').count(), 0,
      'User-editable metadata role=admin does not grant access');
    await addSimpleProduct(page);
    await waitCart(page, mockUsers.a.id, 1);

    // A begins checkout; sign-out from another tab must dismiss it immediately.
    const checkout = await openCheckout(page);
    await checkout.locator('input[name="name"]').fill('Private Customer A');
    await checkout.locator('input[name="phone"]').fill('599123456');
    assert.equal(await checkout.locator('input[name="email"]').inputValue(), mockUsers.a.email,
      'Authenticated email is prefilled from the verified session');
    assert.equal(await checkout.locator('input[name="email"]').getAttribute('readonly'), '',
      'Authenticated email is not manually editable');
    await checkout.locator('input[name="address"]').fill('Private address A');
    const otherTab = await context.newPage();
    otherTab.on('pageerror', err => pageErrors.push(String(err.message || err)));
    await otherTab.goto(host, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await otherTab.locator('.gs-site-header').waitFor({ state: 'visible' });
    await logout(otherTab);
    await checkout.waitFor({ state: 'detached', timeout: 15000 });
    await waitCart(page, null, 1);
    await otherTab.close();

    // Guest checkout must not inherit signed-in customer's contact information.
    const guestCheckout = await openCheckout(page);
    assert.equal(await guestCheckout.locator('input[name="name"]').inputValue(), '');
    assert.equal(await guestCheckout.locator('input[name="phone"]').inputValue(), '');
    assert.equal(await guestCheckout.locator('input[name="email"]').inputValue(), '');
    assert.equal(await guestCheckout.locator('input[name="address"]').inputValue(), '');
    await guestCheckout.locator('.gs-checkout-close').click();

    // Guest → B → guest → A restores each owner's independent cart.
    await login(page, 'b');
    await waitCart(page, mockUsers.b.id, 0);
    assert.equal(await page.locator('.geostore-admin-shortcut').count(), 0);
    await addSimpleProduct(page);
    await addSimpleProduct(page);
    await waitCart(page, mockUsers.b.id, 2);
    await logout(page);
    await waitCart(page, null, 1);
    assert.equal((await readCart(page, mockUsers.a.id))[0].quantity, 1);
    assert.equal((await readCart(page, mockUsers.b.id))[0].quantity, 2);
    await login(page, 'a');
    await waitCart(page, mockUsers.a.id, 1);
    assert.equal((await readCart(page, mockUsers.b.id))[0].quantity, 2);

    assert.deepEqual(blockedMutations, [], 'No unapproved database writes or live orders');
    assert.deepEqual(pageErrors, [], 'No uncaught JS errors');
    assert.ok(intercepted.some(s => s === 'POST /auth/v1/token'));
    assert.ok(intercepted.some(s => s === 'POST /auth/v1/logout'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2));
    console.log('PASS Stage49 isolated 390px guest → A → guest → B → guest → A, cross-tab logout, private checkout and owner-scoped carts');
  } finally {
    await context.close();
  }
}
