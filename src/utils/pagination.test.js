import test from 'node:test';
import assert from 'node:assert/strict';
import { getPaginationItems } from './pagination.js';

test('returns every page when the page count is compact', () => {
  assert.deepEqual(getPaginationItems(2, 5), [1, 2, 3, 4, 5]);
});

test('shows a compact window with gaps for a middle page', () => {
  assert.deepEqual(getPaginationItems(5, 12), [1, '…', 4, 5, 6, '…', 12]);
});

test('keeps the first pages visible near the beginning', () => {
  assert.deepEqual(getPaginationItems(1, 12), [1, 2, '…', 12]);
});

test('keeps the last pages visible near the end', () => {
  assert.deepEqual(getPaginationItems(12, 12), [1, '…', 11, 12]);
});

test('clamps invalid current pages and handles empty totals', () => {
  assert.deepEqual(getPaginationItems(99, 3), [1, 2, 3]);
  assert.deepEqual(getPaginationItems(0, 0), []);
});
