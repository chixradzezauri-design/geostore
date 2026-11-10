import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDeliveryFeeDrafts } from '../src/utils/deliveryFeeSafety.js';

test('parses all three delivery regions and preserves zero as a valid fee', () => {
  assert.deepEqual(
    parseDeliveryFeeDrafts({ tbilisi: '0', bigCities: '10.50', other: '15' }),
    [
      { region: 'tbilisi', fee_gel: 0 },
      { region: 'bigCities', fee_gel: 10.5 },
      { region: 'other', fee_gel: 15 }
    ]
  );
});

test('rejects an empty delivery fee instead of silently converting it to zero', () => {
  assert.throws(
    () => parseDeliveryFeeDrafts({ tbilisi: '', bigCities: '10', other: '15' }),
    /სავალდებულოა/
  );
});

test('rejects missing regions, negative amounts and malformed precision', () => {
  assert.throws(() => parseDeliveryFeeDrafts({ tbilisi: '0', bigCities: '10' }), /სავალდებულოა/);
  assert.throws(() => parseDeliveryFeeDrafts({ tbilisi: '-1', bigCities: '10', other: '15' }), /სავალდებულოა/);
  assert.throws(() => parseDeliveryFeeDrafts({ tbilisi: '0.001', bigCities: '10', other: '15' }), /სავალდებულოა/);
  assert.throws(() => parseDeliveryFeeDrafts(null), /ფორმატი არასწორია/);
});
