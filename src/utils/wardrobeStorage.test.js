import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWardrobeStorageKey,
  readWardrobeItems,
  writeWardrobeItems
} from './wardrobeStorage.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
};

test('wardrobe storage keys are isolated per authenticated account and guest', () => {
  assert.notEqual(getWardrobeStorageKey('user-a'), getWardrobeStorageKey('user-b'));
  assert.notEqual(getWardrobeStorageKey('user-a'), getWardrobeStorageKey(null));
  assert.equal(getWardrobeStorageKey(null), 'geostore_digital_wardrobe:guest');
});

test('one account cannot read another account wardrobe data', () => {
  const storage = createStorage();
  const wardrobeA = [{ id: 'a1', name: 'Account A jacket' }];
  assert.equal(writeWardrobeItems('user-a', wardrobeA, storage), true);
  assert.deepEqual(readWardrobeItems('user-a', storage), wardrobeA);
  assert.equal(readWardrobeItems('user-b', storage), null);
  assert.equal(readWardrobeItems(null, storage), null);
});

test('guest wardrobe is stored separately from signed-in accounts', () => {
  const storage = createStorage();
  const guestWardrobe = [{ id: 'g1', name: 'Guest item' }];
  writeWardrobeItems(null, guestWardrobe, storage);
  assert.deepEqual(readWardrobeItems(null, storage), guestWardrobe);
  assert.equal(readWardrobeItems('user-a', storage), null);
});

test('legacy unscoped wardrobe data is never exposed to a new account', () => {
  const storage = createStorage();
  storage.setItem('geostore_digital_wardrobe', JSON.stringify([{ id: 'old', name: 'Legacy private item' }]));
  assert.equal(readWardrobeItems('user-a', storage), null);
  assert.equal(readWardrobeItems(null, storage), null);
});

test('invalid or inaccessible storage fails closed without throwing', () => {
  const storage = createStorage();
  storage.setItem(getWardrobeStorageKey('user-a'), '{invalid');
  assert.equal(readWardrobeItems('user-a', storage), null);
  assert.equal(readWardrobeItems('user-a', { getItem: () => { throw new Error('blocked'); } }), null);
  assert.equal(writeWardrobeItems('user-a', [], { setItem: () => { throw new Error('blocked'); } }), false);
});
