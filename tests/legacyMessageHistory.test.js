import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLegacyMessagesPageUrl,
  getLegacyMessageCursor,
  mergeLegacyMessagePages
} from '../src/utils/legacyMessageHistory.js';

const makeRows = count => Array.from({ length: count }, (_, index) => ({
  id: index + 1,
  created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
  text: `message-${index + 1}`
}));

test('legacy message history uses deterministic keyset pagination and bounded pages', () => {
  const url = new URL(buildLegacyMessagesPageUrl('https://example.supabase.co/', null, 1000));
  assert.equal(url.pathname, '/rest/v1/messages');
  assert.equal(url.searchParams.get('limit'), '100');
  assert.equal(url.searchParams.get('order'), 'created_at.desc,id.asc');
  assert.equal(url.searchParams.get('select'), 'id,created_at,client_name,sender,text,image,time');
});

test('legacy message cursor requests strictly older rows with a stable ID tie-breaker', () => {
  const cursor = { created_at: '2026-01-01T00:00:00.000Z', id: 25 };
  const url = new URL(buildLegacyMessagesPageUrl('https://example.supabase.co', cursor, 50));
  assert.equal(url.searchParams.get('limit'), '50');
  assert.equal(
    url.searchParams.get('or'),
    '(created_at.lt.2026-01-01T00:00:00.000Z,and(created_at.eq.2026-01-01T00:00:00.000Z,id.gt.25))'
  );
});

test('legacy message cursor rejects malformed values and requires a complete full page', () => {
  assert.equal(getLegacyMessageCursor(makeRows(99)), null);
  assert.deepEqual(getLegacyMessageCursor(makeRows(100)), {
    created_at: makeRows(100)[99].created_at,
    id: 100
  });
  assert.throws(() => buildLegacyMessagesPageUrl('https://example.supabase.co', { created_at: 'bad', id: 1 }));
  assert.throws(() => buildLegacyMessagesPageUrl('https://example.supabase.co', {
    created_at: '2026-01-01T00:00:00.000Z',
    id: '1),or(id.neq.0)'
  }));
});

test('legacy message pages merge by ID without losing loaded older history', () => {
  const existing = [
    { id: 1, created_at: '2026-01-01T00:00:01.000Z', text: 'old' },
    { id: 2, created_at: '2026-01-01T00:00:00.000Z', text: 'older' }
  ];
  const incoming = [
    { id: 3, created_at: '2026-01-01T00:00:02.000Z', text: 'new' },
    { id: 1, created_at: '2026-01-01T00:00:01.000Z', text: 'updated' }
  ];
  const merged = mergeLegacyMessagePages(existing, incoming);
  assert.deepEqual(merged.map(row => row.id), [3, 1, 2]);
  assert.equal(merged.find(row => row.id === 1).text, 'updated');
});
