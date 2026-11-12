import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnnouncementAudience } from '../src/utils/announcementAudience.js';

test('all mode is explicit and does not carry stale selected IDs', () => {
  assert.deepEqual(
    normalizeAnnouncementAudience({ mode: 'all', recipientIds: ['1060de3d-d28a-45f8-9a64-5e0368cffc4b'] }),
    { mode: 'all', recipientIds: [] }
  );
});

test('selected mode trims, normalizes and de-duplicates immutable UUID recipients', () => {
  const id = '1060de3d-d28a-45f8-9a64-5e0368cffc4b';
  assert.deepEqual(
    normalizeAnnouncementAudience({ mode: 'selected', recipientIds: [id, ` ${id.toUpperCase()} `] }),
    { mode: 'selected', recipientIds: [id] }
  );
});

test('selected mode requires at least one valid recipient', () => {
  assert.throws(() => normalizeAnnouncementAudience({ mode: 'selected', recipientIds: [] }), /მონიშნეთ/);
  assert.throws(() => normalizeAnnouncementAudience({ mode: 'selected', recipientIds: ['not-a-user-id'] }), /მონიშნეთ/);
  assert.throws(() => normalizeAnnouncementAudience({ mode: 'selected', recipientIds: [null] }), /მონიშნეთ/);
});

test('unknown modes and malformed audience payloads are rejected', () => {
  assert.throws(() => normalizeAnnouncementAudience({ mode: 'everyone' }), /აირჩიეთ/);
  assert.throws(() => normalizeAnnouncementAudience({ mode: 'selected', recipientIds: 'user-id' }), /სია არასწორია/);
  assert.throws(() => normalizeAnnouncementAudience(null), /ფორმატი არასწორია/);
});
