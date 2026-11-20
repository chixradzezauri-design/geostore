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
      page.on('pageerror', error => pageErrors.push(String(error.message || error)));
      const response = await page.goto(host, { waitUntil: 'domcontentloaded', timeout: 30000 });
      assert.equal(response?.status(), 200, 'Homepage HTTP response');
      await page.locator('.gs-site-header').waitFor({ state: 'visible', timeout: 30000 });
      await page.locator('.geostore-storefront').waitFor({ state: 'visible', timeout: 30000 });
      await page.locator('.gs-menu-toggle').waitFor({ state: 'visible', timeout: 10000 });
      const before = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        headerRight: document.querySelector('.gs-site-header').getBoundingClientRect().right,
        productGridPresent: Boolean(document.querySelector('.gs-catalog-product-grid')),
        hasMain: Boolean(document.querySelector('main')),
      }));
      assert.ok(before.documentWidth <= width + 2, 'Horizontal overflow at ' + width + 'px: ' + JSON.stringify(before));
      assert.ok(before.headerRight <= width + 2, 'Header overflow at ' + width + 'px: ' + JSON.stringify(before));
      assert.ok(before.hasMain && before.productGridPresent, 'Storefront did not render at ' + width + 'px');
      const toggle = page.locator('.gs-menu-toggle');
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true', 'Menu opens at ' + width + 'px');
      await page.locator('#geostore-main-menu').waitFor({ state: 'visible' });
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false', 'Menu closes at ' + width + 'px');
      assert.equal(pageErrors.length, 0, 'Uncaught browser errors at ' + width + 'px: ' + pageErrors.join('; '));
      console.log('PASS real SPA at ' + width + 'px' +
        ' (grid present, no overflow, menu toggle works)');
    } finally {
      await context.close();
    }
  }
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
