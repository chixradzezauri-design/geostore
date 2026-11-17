import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('admin legacy message history loads bounded keyset pages', () => {
  assert.match(admin, /buildLegacyMessagesPageUrl\(SUPABASE_URL, cursor, 100\)/);
  assert.match(admin, /getLegacyMessageCursor\(rows\)/);
  assert.match(admin, /rows\.length === 100 && !nextCursor/);
  assert.match(admin, /ძველი შეტყობინებების ჩატვირთვა/);
  assert.match(admin, /legacyMessagesHasMore &&/);
});

test('realtime refresh merges new messages and preserves loaded older history', () => {
  assert.match(admin, /legacyMessagesLoadedMoreRef\.current\)/);
  assert.match(admin, /setLegacyMessages\(previous => mergeLegacyMessagePages\(previous, rows\)\)/);
  assert.match(admin, /legacyMessagesRefreshPendingRef\.current = true/);
  assert.match(admin, /legacyMessagesFetchInFlightRef\.current/);
  assert.match(admin, /setInterval\(\(\) => \{ void fetchLegacyMessages\(\{ sessionId \}\); \}, 15000\)/);
});

test('late legacy-message responses cannot update a closed admin session', () => {
  assert.match(admin, /sessionId !== legacyMessagesSessionRef\.current/);
  assert.match(admin, /if \(sessionId === legacyMessagesSessionRef\.current\)/);
});
