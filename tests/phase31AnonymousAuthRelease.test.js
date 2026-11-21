import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const browser = readFileSync(new URL('./browser/realStorefrontSmoke.mjs', import.meta.url), 'utf8');
const runbook = readFileSync(new URL('../docs/production-release-gate-phase30.md', import.meta.url), 'utf8');

test('real Chromium storefront smoke rejects anonymous admin panels and private ledger network calls', () => {
  assert.match(browser, /const privateRequests = \[\]/);
  assert.match(browser, /page\.on\('request', request =>/);
  assert.match(browser, /orders\|expenses/);
  assert.match(browser, /privateRequests\.push\(path\)/);
  assert.match(browser, /\/rest\/v1\/rpc\/has_staff_permission/);
  assert.match(browser, /page\.locator\('\.geostore-admin-shortcut'\)\.count\(\)/);
  assert.match(browser, /page\.locator\('\.admin-dashboard-pro'\)\.count\(\)/);
  assert.match(browser, /assert\.deepEqual\(privateRequests, \[\]/);
  assert.match(browser, /\[320, 375, 430, 768, 1024, 1440\]/);
});

test('release runbook separates read-only SQL claim simulation from genuine signed-in E2E', () => {
  assert.match(runbook, /BEGIN READ ONLY/);
  assert.match(runbook, /ROLLBACK/);
  assert.match(runbook, /locally simulated JWT claim context/);
  assert.match(runbook, /not with an actual signed access token/);
  assert.match(runbook, /genuine browser coverage \(anonymous only\)/);
  assert.match(runbook, /Still blocked/);
  assert.match(runbook, /No such real-account tests are claimed/);
});
