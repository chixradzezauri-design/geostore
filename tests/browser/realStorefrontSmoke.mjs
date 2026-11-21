import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

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
    const context = await browser.newContext({ viewport: { width, height: 850 }, reducedMotion: 'reduce' });
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
      const artwork = page.locator('.gs-category-card img.gs-category-photo').first();
      assert.ok(await artwork.count() > 0, 'Category artwork is a real image at ' + width + 'px');
      assert.equal(await artwork.getAttribute('loading'), 'lazy', 'Category artwork lazy loading at ' + width + 'px');
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

  // Stage 32: exercise the actual lazily loaded admin route without a session.
  // This catches the earlier staffList white-screen regression independently of
  // mock CSS fixtures and verifies that an auth-bypass URL grants no privileges.
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, reducedMotion: 'reduce' });
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
      const authGate = page.getByRole('heading', { name: 'ადმინისტრატორის პანელი', exact: true });
      await authGate.waitFor({ state: 'visible', timeout: 30000 });
      await page.getByText('პანელზე წვდომისთვის შედით GEOSTORE-ში', { exact: false })
        .waitFor({ state: 'visible', timeout: 10000 });
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
      console.log('PASS unauthorized admin route at ' + width + 'px (no staffList crash, no private access)');
    } finally {
      await context.close();
    }
  }
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
