import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const smoke = readFileSync(new URL('./browser/realStorefrontSmoke.mjs', import.meta.url), 'utf8');
const journeys = readFileSync(new URL('./browser/stage46PurchaseScenarios.mjs', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/responsive-browser-smoke.yml', import.meta.url), 'utf8');

test('Stage48 runs the exact same isolated checkout scenario in WebKit at phone width', () => {
  assert.match(smoke, /import \{ chromium, webkit \} from 'playwright'/);
  assert.match(smoke, /webkit\.launch\(\{ headless: true \}\)/);
  assert.match(smoke, /runStage46ProductPurchaseScenarios\(browser, host, \[390\]\)/);
  assert.match(journeys, /export async function runStage46ProductPurchaseScenarios\(browser, host, widths = \[320, 390, 768, 1440\]\)/);
  assert.match(journeys, /context\.route\(supabaseOrigin \+ '\/\*\*'/);
  assert.match(workflow, /npx playwright install --with-deps chromium webkit/);
});
