import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCheckoutSessionIdentity } from '../src/utils/authSafety.js';
import { CHECKOUT_SESSION_UNAVAILABLE, getCheckoutErrorMessage } from '../src/utils/checkoutMessages.js';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const browser = readFileSync(new URL('./browser/stage49AccountSwitchScenarios.mjs', import.meta.url), 'utf8');
const authenticated = {
  user: { id: 'user-A', email: 'a@example.test' },
  access_token: 'fixture-token'
};
const valid = (uiUserId, activeOwnerId, session) =>
  validateCheckoutSessionIdentity({ uiUserId, activeOwnerId, session });

test('Stage50: signed-in checkout requires the matching live auth session', () => {
  assert.deepEqual(valid('user-A', 'user-A', authenticated), { valid: true });
  assert.deepEqual(valid('user-A', 'user-A', null), { valid: false, reason: 'missing' });
  assert.deepEqual(valid('user-A', 'user-A', { ...authenticated, access_token: '' }), { valid: false, reason: 'missing' });
  assert.deepEqual(valid('user-A', 'user-A', { user: { id: 'user-A' }, access_token: 'token' }), { valid: false, reason: 'missing' });
  assert.deepEqual(valid('user-A', 'user-B', authenticated), { valid: false, reason: 'owner' });
  assert.deepEqual(valid('user-A', 'user-A', { ...authenticated, user: { id: 'user-B', email: 'b@example.test' } }), { valid: false, reason: 'mismatch' });
  assert.deepEqual(valid(null, null, null), { valid: true });
  assert.deepEqual(valid(null, null, authenticated), { valid: false, reason: 'pending_auth' });
});

test('Stage50: auth and transient network messages are localized without losing the cart', () => {
  assert.match(getCheckoutErrorMessage(CHECKOUT_SESSION_UNAVAILABLE, 'ka'), /კალათა შენარჩუნებულია/);
  assert.match(getCheckoutErrorMessage(CHECKOUT_SESSION_UNAVAILABLE, 'en'), /sign in again/i);
  assert.match(getCheckoutErrorMessage(CHECKOUT_SESSION_UNAVAILABLE, 'ru'), /Войдите снова/);
  assert.match(getCheckoutErrorMessage(new TypeError('Failed to fetch'), 'ka'), /ქსელთან კავშირი შეფერხდა/);
  assert.match(getCheckoutErrorMessage('Load failed', 'en'), /network connection failed/);
  assert.match(getCheckoutErrorMessage('Network request failed', 'ru'), /интернет/);
});

test('Stage50: prevent silent guest downgrade before catalogue check/order RPC', () => {
  assert.match(app, /sessionError \|\| !validateCheckoutSessionIdentity\(/);
  assert.match(app, /throw new Error\(CHECKOUT_SESSION_UNAVAILABLE\)/);
  assert.match(app, /if \(abandonCheckoutIfOwnerChanged\(\)\) return;/);
  assert.match(app, /const orderSession = session\?\.access_token && session\?\.user\?\.email/);
});

test('Stage50: actual browser tests network failure, preserves form/cart and safely retries', () => {
  assert.match(browser, /let failNextCatalogRead = false/);
  assert.match(browser, /return route\.abort\('failed'\)/);
  assert.match(browser, /Private Customer A/);
  assert.match(browser, /readCart\(page, mockUsers\.a\.id\)/);
  assert.match(browser, /ქსელთან კავშირი შეფერხდა/);
  assert.match(browser, /Retry with deliberately invalid contact data/);
  assert.doesNotMatch(browser, /create_order_with_stock/);
});
