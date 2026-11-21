import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const smoke = readFileSync(new URL('./browser/realStorefrontSmoke.mjs', import.meta.url), 'utf8');
const cases = readFileSync(new URL('./browser/stage46PurchaseScenarios.mjs', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
test('Stage 46: real built-SPA browser suite includes deterministic purchase flow', () => {
  assert.match(smoke, /runStage46ProductPurchaseScenarios\(browser, host\)/);
  for (const label of ['Stage46 Everyday Wallet', 'Stage46 Personalised Premium Bag',
    'Stage46 Matrix Jacket', 'Stage46 Out Of Stock Item']) assert.ok(cases.includes(label));
  for (const width of [320, 390, 768, 1440]) assert.ok(cases.includes(String(width)));
});
test('Stage 46: browser harness intercepts all Supabase calls and does not submit orders', () => {
  assert.match(cases, /context\.route\(supabaseOrigin \+ '\/\*\*'/);
  assert.match(cases, /request\.method\(\) !== 'GET'/);
  assert.match(cases, /Blocked isolated browser test write/);
  assert.match(cases, /gs-cart-checkout/);
  assert.doesNotMatch(cases, /\.gs-checkout-submit-area.*click\(/);
  assert.match(cases, /assert\.deepEqual\(blockedWrites, \[\]/);
});
test('Stage 46: production cart quantity/variant guards remain in place', () => {
  assert.match(app, /addProductToCart\(cartRef\.current/);
  assert.match(app, /cartRef\.current = result\.cart/);
  assert.match(app, /if \(!result\.valid\)/);
  assert.match(app, /getProductSizeColorVariant\(product, selectedSize, selectedColor\)/);
});
