import test from 'node:test';
import assert from 'node:assert/strict';

import { isSameAuthOwner, isCheckoutOwnerConsistent } from './authSafety.js';

test('keeps checkout results within the same authenticated owner', () => {
  assert.equal(isSameAuthOwner('user-a', 'user-a'), true);
  assert.equal(isSameAuthOwner('user-a', 'user-b'), false);
  assert.equal(isSameAuthOwner(null, null), true);
  assert.equal(isSameAuthOwner('user-a', null), false);
  assert.equal(isSameAuthOwner(null, 'user-a'), false);
  assert.equal(isSameAuthOwner('', null), true);
});

test('rejects checkout if the account changes while the session is being restored', () => {
  assert.equal(isCheckoutOwnerConsistent({
    initialOwnerId: 'user-a', sessionOwnerId: 'user-a', activeOwnerId: 'user-a'
  }), true);
  assert.equal(isCheckoutOwnerConsistent({
    initialOwnerId: 'user-a', sessionOwnerId: 'user-b', activeOwnerId: 'user-b'
  }), false);
  assert.equal(isCheckoutOwnerConsistent({
    initialOwnerId: 'user-a', sessionOwnerId: 'user-a', activeOwnerId: 'user-b'
  }), false);
  assert.equal(isCheckoutOwnerConsistent({
    initialOwnerId: null, sessionOwnerId: null, activeOwnerId: null
  }), true);
  assert.equal(isCheckoutOwnerConsistent({
    initialOwnerId: null, sessionOwnerId: 'user-a', activeOwnerId: 'user-a'
  }), false);
});
