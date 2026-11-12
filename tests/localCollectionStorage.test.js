import test from 'node:test';
import assert from 'node:assert/strict';
import { saveLocalCollection } from '../src/utils/localCollectionStorage.js';

test('saveLocalCollection persists the complete collection before returning', () => {
  const values = new Map();
  const storage = { setItem: (key, value) => values.set(key, value) };
  const rows = [{ id: 'vendor-1', name: 'Vendor One' }];

  const result = saveLocalCollection(storage, 'geostore_vendors', rows);

  assert.equal(result, rows);
  assert.deepEqual(JSON.parse(values.get('geostore_vendors')), rows);
});

test('saveLocalCollection propagates storage quota errors without claiming success', () => {
  const storage = {
    setItem() {
      throw new Error('QuotaExceededError');
    }
  };
  const rows = [{ id: 'staff-1' }];

  assert.throws(
    () => saveLocalCollection(storage, 'geostore_staff_list', rows),
    /QuotaExceededError/
  );
});

test('saveLocalCollection rejects invalid collection inputs', () => {
  const storage = { setItem() {} };

  assert.throws(() => saveLocalCollection(storage, 'geostore_crm', null), /must be an array/);
  assert.throws(() => saveLocalCollection(storage, '', []), /storage key is required/);
  assert.throws(() => saveLocalCollection(null, 'geostore_crm', []), /storage is unavailable/);
});
