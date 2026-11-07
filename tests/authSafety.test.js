import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthRestoreCurrent } from '../src/utils/authSafety.js';

test('accepts a current mounted auth restore', () => {
  assert.equal(isAuthRestoreCurrent({ mounted: true, restoreVersion: 0, currentVersion: 0 }), true);
});

test('rejects an auth restore after a newer auth event', () => {
  assert.equal(isAuthRestoreCurrent({ mounted: true, restoreVersion: 0, currentVersion: 1 }), false);
});

test('rejects auth restore after component unmount', () => {
  assert.equal(isAuthRestoreCurrent({ mounted: false, restoreVersion: 2, currentVersion: 2 }), false);
});

test('rejects invalid version counters', () => {
  assert.equal(isAuthRestoreCurrent({ mounted: true, restoreVersion: '1', currentVersion: 1 }), false);
});
