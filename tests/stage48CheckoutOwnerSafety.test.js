import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isCheckoutOwnerContextCurrent } from '../src/utils/authSafety.js';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const active = { startEpoch: 4, currentEpoch: 4, startOwnerId: 'customer-a', currentOwnerId: 'customer-a' };
test('Stage48: checkout stays bound to the same owner and auth event', () => {
  assert.equal(isCheckoutOwnerContextCurrent(active), true);
  assert.equal(isCheckoutOwnerContextCurrent({ ...active, currentEpoch: 5 }), false);
  assert.equal(isCheckoutOwnerContextCurrent({ ...active, currentOwnerId: 'customer-b' }), false);
  assert.equal(isCheckoutOwnerContextCurrent({ ...active, currentOwnerId: null }), false);
  assert.equal(isCheckoutOwnerContextCurrent({ startEpoch: 0, currentEpoch: 0, startOwnerId: null, currentOwnerId: null }), true);
  assert.equal(isCheckoutOwnerContextCurrent({ startEpoch: 0, currentEpoch: 1, startOwnerId: null, currentOwnerId: null }), false);
  assert.equal(isCheckoutOwnerContextCurrent({ ...active, startEpoch: '4' }), false);
});
test('Stage48: account change and storage failure both close/clear private checkout', () => {
  assert.match(app, /const clearPrivateCheckout = \(\) => \{/);
  for(const statement of ['checkoutOwnerEpochRef.current += 1','setIsCheckoutOpen(false)',
    'setOrderConfirmation(null)',"setCheckoutError('')",'setCheckoutErrorField(null)',
    'pendingCheckoutRef.current = null',"window.sessionStorage.removeItem('geostore.pendingCheckout')"]) {
    assert.ok(app.includes(statement), statement);
  }
  assert.match(app, /if \(String\(activeOwner\.userId \?\? ''\) !== String\(nextOwnerId \?\? ''\)\) \{\s*clearPrivateCheckout\(\)/);
  assert.match(app, /Storage failures must not leave private checkout details visible\.\s*clearPrivateCheckout\(\)/);
});
test('Stage48: stale auth context cannot write new order or show old receipt', () => {
  assert.match(app, /const abandonCheckoutIfOwnerChanged = \(\) => \{/);
  assert.match(app, /if \(abandonCheckoutIfOwnerChanged\(\)\) return;\s*const response = await fetch\(\s*\x60\$\{SUPABASE_URL\}\/rest\/v1\/rpc\/create_order_with_stock/);
  assert.match(app, /if \(abandonCheckoutIfOwnerChanged\(\)\) return;\s*const confirmedItems = normalizeOrderItems/);
  assert.match(app, /if \(abandonCheckoutIfOwnerChanged\(\)\) return;\s*const orderConfirmationCheck/);
});
