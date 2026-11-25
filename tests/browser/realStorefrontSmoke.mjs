import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium, webkit } from 'playwright';
import { runStage46ProductPurchaseScenarios } from './stage46PurchaseScenarios.mjs';
import { runStage49AccountSwitchScenario } from './stage49AccountSwitchScenarios.mjs';
import { runAdminWorkspaceSmoke } from './adminWorkspaceSmoke.mjs';
import {runCatalogueSeoHttpSmoke} from './catalogueSeoHttpSmoke.mjs';
import {runPwaOfflineSmoke} from './pwaOfflineSmoke.mjs';
import {runSignatureStorefrontSmoke} from './signatureStorefrontSmoke.mjs';

const server = spawn(process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
  { stdio: ['ignore', 'pipe', 'pipe'] }
);
let serverOutput = '';
server.stdout.on('data', value => { serverOutput += value.toString(); });
server.stderr.on('data', value => { serverOutput += value.toString(); });

const host = 'http://127.0.0.1:4173/';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function awaitServer() {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error('Vite preview exited: ' + serverOutput.slice(-2000));
    try {
      const result = await fetch(host, { signal: AbortSignal.timeout(1000) });
      if (result.ok) return;
    } catch { /* preview is still starting */ }
    await delay(250);
  }
  throw new Error('Vite preview did not become available: ' + serverOutput.slice(-2000));
}
let browser;
try {
  await awaitServer();
  browser = await chromium.launch({ headless: true });
  for (const width of [320, 375, 430, 768, 1024, 1440]) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 850 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      const pageErrors = [];
      const privateRequests = [];
      page.on('pageerror', error => pageErrors.push(String(error.message || error)));
      // A new anonymous browser context must never load private finance/order
      // ledgers or ask the authenticated-only staff-permission RPC.
      page.on('request', request => {
        const path = new URL(request.url()).pathname;
        if (/\/rest\/v1\/(?:orders|expenses)(?:\/|$)/.test(path) ||
            path === '/rest/v1/rpc/has_staff_permission') {
          privateRequests.push(path);
        }
      });
      const response = await page.goto(host, { waitUntil: 'domcontentloaded', timeout: 30000 });
      assert.equal(response?.status(), 200, 'Homepage HTTP response');
      await page.locator('.gs-site-header').waitFor({ state: 'visible', timeout: 30000 });
      await page.locator('.geostore-storefront').waitFor({ state: 'visible', timeout: 30000 });
      await page.locator('.gs-menu-toggle').waitFor({ state: 'visible', timeout: 10000 });
      const before = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        headerRight: document.querySelector('.gs-site-header').getBoundingClientRect().right,
        catalogStatePresent: Boolean(document.querySelector('.gs-catalog-product-grid, .gs-empty-products')),
        hasStorefront: Boolean(document.querySelector('.geostore-storefront')),
      }));
      assert.ok(before.documentWidth <= width + 2, 'Horizontal overflow at ' + width + 'px: ' + JSON.stringify(before));
      assert.ok(before.headerRight <= width + 2, 'Header overflow at ' + width + 'px: ' + JSON.stringify(before));
      assert.ok(before.hasStorefront && before.catalogStatePresent, 'Storefront catalog did not render at ' + width + 'px: ' + JSON.stringify(before));
      assert.equal(await page.locator('.geostore-admin-shortcut').count(), 0,
        'Anonymous visitor must not see the administrator shortcut at ' + width + 'px');
      assert.equal(await page.locator('.admin-dashboard-pro').count(), 0,
        'Anonymous visitor must not mount private administrator content at ' + width + 'px');
      // Published Signature settings can hydrate after the legacy shell renders.
      // Both controls implement the same all-category action.
      const allCategorySelector = '.gs-signature-all-categories, .gs-category-card--all';
      const allCategoryCard = page.locator(allCategorySelector).first();
       assert.ok(await allCategoryCard.evaluate(el => el.tagName === 'BUTTON' || el.getAttribute('role') === 'button'), 'All-category is keyboard operable');
       await allCategoryCard.focus();
       await page.keyboard.press('Space');
       // React's category selection commits after the keyboard event. A
       // one-shot attribute read can race the state render on slower CI hosts.
       await page.waitForFunction(() =>
         document.querySelector('.gs-signature-all-categories, .gs-category-card--all')?.getAttribute('aria-pressed') === 'true',
         null, { timeout: 5000 });
       const firstCategoryCard = page.locator('.gs-category-card:not(.gs-category-card--all)').first();
       if (await firstCategoryCard.count()) {
         // Initial category data can be refreshed from the server while the
         // first keyboard action is being processed. Re-target the currently
         // mounted category if React replaced it, without weakening the
         // requirement that Enter actually selects the visible category.
         let categorySelectedWithKeyboard = false;
         for (let attempt = 0; attempt < 3 && !categorySelectedWithKeyboard; attempt++) {
           const liveCard = page.locator('.gs-category-card:not(.gs-category-card--all)').first();
           const chosenCategoryLabel = await liveCard.getAttribute('aria-label');
           assert.ok(chosenCategoryLabel, 'A main category has an accessible label');
           const chosenCategoryTitle = (await liveCard.locator('h4').innerText()).trim();
           assert.ok(chosenCategoryTitle, 'A main category has a stable visible title');
           // A catalog refresh can replace a card between reading the title and
           // focusing it. Retry the existing bounded keyboard scenario; never
           // pass unless a focused visible category actually responds to Enter.
           const focused = await liveCard.evaluate(node => {
             node.focus();
             return node.isConnected && document.activeElement === node;
           });
           if (!focused) {
             if (attempt === 2) throw new Error('Main category never received keyboard focus at ' + width + 'px');
             continue;
           }
           await page.keyboard.press('Enter');
           try {
             await page.waitForFunction(title =>
               [...document.querySelectorAll('.gs-category-card:not(.gs-category-card--all)')]
                 .some(card => card.querySelector('h4')?.textContent?.trim() === title &&
                               card.getAttribute('aria-pressed') === 'true'),
               chosenCategoryTitle, { timeout: 3500 });
             categorySelectedWithKeyboard = true;
           } catch (error) {
             if (attempt === 2) {
               const observed = await page.locator('.gs-category-card:not(.gs-category-card--all)')
                 .evaluateAll(cards => cards.slice(0, 5).map(card => ({
                   title: card.querySelector('h4')?.textContent?.trim(),
                   pressed: card.getAttribute('aria-pressed')
                 })));
               throw new Error('Main category Enter never selected the visible category at ' +
                 width + 'px: expected ' + chosenCategoryTitle +
                 '; observed ' + JSON.stringify(observed) + '; ' + String(error));
             }
           }
         }
         assert.ok(categorySelectedWithKeyboard, 'Keyboard Enter selects a main category at ' + width + 'px');
         await allCategoryCard.focus();
         await page.keyboard.press('Space');
         await page.waitForFunction(() =>
           document.querySelector('.gs-signature-all-categories, .gs-category-card--all')?.getAttribute('aria-pressed') === 'true',
           null, { timeout: 5000 });
       }
       const firstProduct = page.locator('.gs-catalog-product-card').first();
       if (await firstProduct.count()) {
         assert.equal(await firstProduct.locator('.gs-catalog-media-toggle').count(), 2, 'Product shortcuts exist');
         assert.equal(await firstProduct.locator('.gs-catalog-product-title-action').count(), 1, 'Product title is keyboard operable');
       }
       const artwork = page.locator('.gs-category-card img.gs-category-photo').first();
      assert.ok(await artwork.count() > 0, 'Category artwork is a real image at ' + width + 'px');
      assert.equal(await artwork.getAttribute('loading'), 'lazy', 'Category artwork lazy loading at ' + width + 'px');
      
      // Stage 39 — integrated client-side search and filter recovery.
      const search = page.locator('.gs-header-search input[type="search"]');
      if (!(await search.isVisible())) {
        await page.locator('.gs-signature-actions button').first().click();
        await search.waitFor({state:'visible'});
      }
      await search.fill('stage39-no-results');
      const searchClear = page.locator('.gs-header-search-clear');
      await searchClear.waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(await searchClear.evaluate(node => node.getBoundingClientRect().height >= 43),
        'Search clear target at ' + width + 'px');
      await searchClear.click();
      assert.equal(await search.inputValue(), '', 'Search clear resets query at ' + width + 'px');
      await page.waitForFunction(() => document.activeElement === document.querySelector('.gs-header-search input[type="search"]'), null, {timeout:5000});
      assert.ok(await search.evaluate(node => document.activeElement === node),
        'Search clear restores focus at ' + width + 'px');
      const priceMin = page.locator('.gs-price-input').first();
      const priceMax = page.locator('.gs-price-input').last();
      await priceMin.fill('120');
      await priceMax.fill('20');
      await page.locator('#gs-price-range-error').waitFor({ state: 'visible', timeout: 10000 });
      assert.equal(await priceMin.getAttribute('aria-invalid'), 'true',
        'Invalid price range is accessible at ' + width + 'px');
      const reset = page.locator('.gs-filter-reset-all');
      await reset.click();
      await reset.waitFor({ state: 'detached' });
      assert.equal(await priceMin.inputValue(), '', 'Reset clears minimum at ' + width + 'px');
      assert.equal(await priceMax.inputValue(), '', 'Reset clears maximum at ' + width + 'px');
      assert.equal(await page.locator('.gs-sort-select').inputValue(), 'default',
        'Reset restores default sorting at ' + width + 'px');
      if (width <= 640) {
        const minFont = await priceMin.evaluate(node => parseFloat(getComputedStyle(node).fontSize));
        const sortFont = await page.locator('.gs-sort-select').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
        assert.ok(minFont >= 16 && sortFont >= 16, 'iOS focus-zoom-safe filters at ' + width + 'px');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= width + 2,
        'No horizontal overflow after search/filter actions at ' + width + 'px');
      const toggle = page.locator('.gs-menu-toggle');
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true', 'Menu opens at ' + width + 'px');
      await page.locator('#geostore-main-menu').waitFor({ state: 'visible' });
      const firstMenuLink = page.locator('#geostore-main-menu .gs-menu-link').first();
      await firstMenuLink.focus();
      assert.ok(await firstMenuLink.evaluate(node => document.activeElement === node),
        'Menu link receives focus before Escape at ' + width + 'px');
      await page.keyboard.press('Escape');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false', 'Escape closes menu at ' + width + 'px');
      assert.ok(await toggle.evaluate(node => document.activeElement === node), 'Escape restores menu-toggle focus at ' + width + 'px');
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true', 'Menu reopens at ' + width + 'px');
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false', 'Menu closes by clicking at ' + width + 'px');
      assert.deepEqual(privateRequests, [],
        'Anonymous storefront must not request private orders/expenses or staff permission at ' + width + 'px');
      assert.equal(pageErrors.length, 0, 'Uncaught browser errors at ' + width + 'px: ' + pageErrors.join('; '));
      console.log('PASS real SPA at ' + width + 'px' +
        ' (catalog state present, no overflow, menu toggle works, anonymous admin guard enforced)');
    } finally {
      await context.close();
    }
  }

  // Stage 32: a stale legacy ?admin=secret deep link must not grant an
  // anonymous browser access. Supabase auth restore deliberately redirects the
  // route back to the storefront; it does not render a private admin fallback.
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 850 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      const pageErrors = [];
      const forbiddenRequests = [];
      page.on('pageerror', error => pageErrors.push(String(error.message || error)));
      page.on('request', request => {
        const url = new URL(request.url());
        if (/\/rest\/v1\/(?:orders|expenses)(?:\/|$)/.test(url.pathname) ||
            url.pathname === '/rest/v1/rpc/has_staff_permission') {
          forbiddenRequests.push(url.pathname);
        }
      });
      const response = await page.goto(host + '?admin=secret', { waitUntil: 'domcontentloaded', timeout: 30000 });
      assert.equal(response?.status(), 200, 'Admin fallback route HTTP status at ' + width + 'px');
      await page.locator('.geostore-storefront').waitFor({ state: 'visible', timeout: 30000 });
      // The initial tab is 'store', a legacy query briefly switches to 'admin',
      // and auth restoration switches an unauthenticated visitor back to 'store'.
      await page.waitForTimeout(350);
      assert.equal(await page.locator('.geostore-storefront').isVisible(), true,
        'Unauthenticated deep link must return to the public storefront');
      assert.equal(await page.locator('.admin-dashboard-shell').count(), 0,
        'Unauthorized admin route must never mount private dashboard content');
      assert.equal(await page.locator('.geostore-admin-shortcut').count(), 0,
        'Unauthorized visitor must not receive an admin shortcut');
      assert.deepEqual(forbiddenRequests, [],
        'Unauthorized admin route must not initiate protected orders/finance reads');
      assert.equal(pageErrors.length, 0,
        'Admin fallback must not white-screen or raise an uncaught exception: ' + pageErrors.join('; '));
      const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth
      }));
      assert.ok(dimensions.document <= dimensions.viewport + 2,
        'Admin auth gate must not overflow at ' + width + 'px: ' + JSON.stringify(dimensions));
      console.log('PASS anonymous admin deep link at ' + width + 'px (redirect to storefront, no private access)');
    } finally {
      await context.close();
    }
  }
  // Phase 4: HTTP handler integration with the actual built shell, no live Supabase.
  await runCatalogueSeoHttpSmoke(browser,host);
  // Stage 46: actual built SPA with a fully intercepted, deterministic catalogue.
  await runStage46ProductPurchaseScenarios(browser, host);
  await runSignatureStorefrontSmoke(browser,host);
  await runStage49AccountSwitchScenario(browser, host);
  await runAdminWorkspaceSmoke(browser, host);
  await runPwaOfflineSmoke(browser);

  // Stage 48: exercise Safari's WebKit engine with the exact same fully
  // intercepted catalogue. This is not a native iPhone Safari test.
  await browser.close();
  browser = await webkit.launch({ headless: true });
  await runStage46ProductPurchaseScenarios(browser, host, [390]);
  await runSignatureStorefrontSmoke(browser,host,[390]);
  console.log('PASS Stage48 WebKit phone-sized checkout flow at 390px (mock data, no live orders)');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
