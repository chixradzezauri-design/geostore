import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeAdminVendors,
  normalizeAdminVendors,
  persistAdminVendors,
  syncAdminVendors
} from './adminVendorsApi.js';

const makeClient = (handlers) => ({
  rpc: async (name, args) => {
    if (!handlers[name]) throw new Error(`Unexpected RPC: ${name}`);
    return handlers[name](args);
  }
});

test('normalizes legacy vendor fields and preserves stable IDs and commission', () => {
  const result = normalizeAdminVendors([
    { id: 'v-old', name: 'Legacy Supplier', commission: '12.5', status: 'აქტიური' },
    { id: '', name: 'Invalid', commission: 1 },
    { id: 'v-bad', name: 'Bad commission', commission: 101 }
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'v-old');
  assert.equal(result[0].name, 'Legacy Supplier');
  assert.equal(result[0].commission, 12.5);
  assert.equal(result[0].archived_at, null);
});

test('normalization keeps only the newest record when legacy storage repeats an ID', () => {
  const result = normalizeAdminVendors([
    { id: 'v-repeat', name: 'Older', commission: 1, updated_at: '2026-11-01T00:00:00.000Z' },
    { id: 'v-repeat', name: 'Newer', commission: 9, updated_at: '2026-11-02T00:00:00.000Z' }
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Newer');
  assert.equal(result[0].commission, 9);
});

test('remote version wins over stale local data and archived records stay archived', () => {
  const merged = mergeAdminVendors(
    [
      { id: 'v1', name: 'Old name', commission: 0, updated_at: '2026-11-01T00:00:00.000Z' },
      { id: 'v2', name: 'Local new', commission: 5, updated_at: '2026-11-03T00:00:00.000Z' }
    ],
    [
      { id: 'v1', name: 'Current name', commission: 10, updated_at: '2026-11-02T00:00:00.000Z' },
      { id: 'v2', name: 'Old server copy', commission: 1, updated_at: '2026-11-02T00:00:00.000Z' },
      { id: 'v3', name: 'Archived', commission: 0, status: 'არქივირებული', archived_at: '2026-11-02T00:00:00.000Z', updated_at: '2026-11-02T00:00:00.000Z' }
    ]
  );

  assert.equal(merged.find((vendor) => vendor.id === 'v1').name, 'Current name');
  assert.equal(merged.find((vendor) => vendor.id === 'v2').name, 'Local new');
  assert.ok(merged.find((vendor) => vendor.id === 'v3').archived_at);
});

test('sync imports legacy local vendors without overwriting existing server records', async () => {
  let stored = [
    { id: 'v1', name: 'Server supplier', commission: 4, status: 'აქტიური', updated_at: '2026-11-02T00:00:00.000Z' }
  ];
  let saved = [];
  const client = makeClient({
    list_admin_vendors: async () => ({ data: stored, error: null }),
    save_admin_vendors: async ({ p_vendors }) => {
      saved = p_vendors;
      stored = [...stored, ...p_vendors];
      return { data: p_vendors.length, error: null };
    }
  });

  const result = await syncAdminVendors([
    { id: 'v1', name: 'Stale local supplier', commission: 0 },
    { id: 'v2', name: 'Legacy local supplier', commission: 8 }
  ], client);

  assert.equal(result.supported, true);
  assert.equal(result.vendors.find((vendor) => vendor.id === 'v1').name, 'Server supplier');
  assert.equal(result.vendors.find((vendor) => vendor.id === 'v2').name, 'Legacy local supplier');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].id, 'v2');
  assert.ok(saved[0].updated_at);
});

test('missing migration keeps the existing local-only behavior without throwing', async () => {
  const client = makeClient({
    list_admin_vendors: async () => ({ data: null, error: { code: 'PGRST202', message: 'function not found in schema cache' } })
  });

  const result = await syncAdminVendors([{ id: 'v1', name: 'Local', commission: 0 }], client);
  assert.equal(result.supported, false);
  assert.equal(result.vendors[0].id, 'v1');
});

test('persist sends only valid timestamped records and returns saved count', async () => {
  let payload;
  const client = makeClient({
    save_admin_vendors: async (args) => {
      payload = args.p_vendors;
      return { data: 1, error: null };
    }
  });

  const result = await persistAdminVendors([
    { id: 'v1', name: 'Ready', commission: 0, updated_at: '2026-11-03T00:00:00.000Z' },
    { id: '', name: 'Invalid', commission: 0, updated_at: '2026-11-03T00:00:00.000Z' }
  ], client);

  assert.equal(result.supported, true);
  assert.equal(result.saved, 1);
  assert.equal(payload.length, 1);
  assert.equal(payload[0].id, 'v1');
});
