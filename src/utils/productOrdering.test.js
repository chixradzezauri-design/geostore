import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProductCreatedAt } from './productOrdering.js';

test('preserves a missing creation timestamp when editing a legacy product', () => {
  assert.equal(resolveProductCreatedAt({
    isEditing: true,
    savedRow: {},
    existingProduct: { id: 'legacy-1', createdAt: null },
    now: () => '2099-01-01T00:00:00.000Z'
  }), null);
});

test('preserves the original creation timestamp when editing a product', () => {
  assert.equal(resolveProductCreatedAt({
    isEditing: true,
    savedRow: {},
    existingProduct: { createdAt: '2024-02-03T10:00:00.000Z' },
    now: () => '2099-01-01T00:00:00.000Z'
  }), '2024-02-03T10:00:00.000Z');
});

test('prefers the canonical server creation timestamp when editing', () => {
  assert.equal(resolveProductCreatedAt({
    isEditing: true,
    savedRow: { created_at: '2023-05-06T10:00:00.000Z' },
    existingProduct: { createdAt: '2024-02-03T10:00:00.000Z' }
  }), '2023-05-06T10:00:00.000Z');
});

test('uses the server timestamp or a fresh timestamp for a new product', () => {
  assert.equal(resolveProductCreatedAt({
    isEditing: false,
    savedRow: { created_at: '2025-06-07T10:00:00.000Z' },
    now: () => '2099-01-01T00:00:00.000Z'
  }), '2025-06-07T10:00:00.000Z');
  assert.equal(resolveProductCreatedAt({
    isEditing: false,
    savedRow: null,
    now: () => '2099-01-01T00:00:00.000Z'
  }), '2099-01-01T00:00:00.000Z');
});
