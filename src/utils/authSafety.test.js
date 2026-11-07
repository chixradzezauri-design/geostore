import test from 'node:test';
import assert from 'node:assert/strict';

import { isSameAuthOwner } from './authSafety.js';

test('keeps checkout results within the same authenticated owner', () => {
  assert.equal(isSameAuthOwner('user-a', 'user-a'), true);
  assert.equal(isSameAuthOwner('user-a', 'user-b'), false);
  assert.equal(isSameAuthOwner(null, null), true);
  assert.equal(isSameAuthOwner('user-a', null), false);
  assert.equal(isSameAuthOwner(null, 'user-a'), false);
  assert.equal(isSameAuthOwner('', null), true);
});
