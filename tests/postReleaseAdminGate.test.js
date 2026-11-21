import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const browser = readFileSync(new URL('./browser/realStorefrontSmoke.mjs', import.meta.url), 'utf8');

test('post-release browser suite opens the actual admin fallback route at mobile, tablet and desktop widths', () => {
  assert.match(browser, /for \(const width of \[375, 768, 1440\]\)/);
  assert.match(browser, /page\.goto\(host \+ '\?admin=secret'/);
  assert.match(browser, /name: 'ადმინისტრატორის პანელი', exact: true/);
  assert.match(browser, /page\.locator\('\.admin-dashboard-shell'\)\.count\(\)/);
  assert.match(browser, /assert\.deepEqual\(forbiddenRequests, \[\]/);
  assert.match(browser, /pageErrors\.length, 0/);
  assert.match(browser, /dimensions\.document <= dimensions\.viewport \+ 2/);
});

test('post-release admin route test does not authorize or create server accounts', () => {
  const start = browser.indexOf('  // Stage 32:');
  assert.notEqual(start, -1);
  const testRoute = browser.slice(start);
  assert.doesNotMatch(testRoute, /signInWithPassword|auth\/v1\/token|createUser|service_role/);
  assert.match(testRoute, /'\?admin=secret'/);
});
