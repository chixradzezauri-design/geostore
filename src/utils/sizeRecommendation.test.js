import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateProductSize, isFootwearProduct } from './sizeRecommendation.js';

test('footwear size estimate uses foot length rather than height', () => {
  assert.equal(isFootwearProduct({ category: 'ფეხსაცმელი' }), true);
  assert.equal(estimateProductSize({
    product: { category: 'ფეხსაცმელი' },
    heightCm: 190,
    weightKg: 100,
    footLengthCm: 25,
    availableSizes: ['39', '40', '41', '42']
  }), '40');
});

test('footwear estimate rejects missing or implausible foot length', () => {
  const base = { product: { category: 'Shoes' }, availableSizes: ['39', '40', '41'] };
  assert.equal(estimateProductSize({ ...base, footLengthCm: '' }), null);
  assert.equal(estimateProductSize({ ...base, footLengthCm: 8 }), null);
  assert.equal(estimateProductSize({ ...base, footLengthCm: 42 }), null);
});

test('clothing estimate uses both height and weight and chooses a nearby available label', () => {
  assert.equal(estimateProductSize({
    product: { category: 'ტანსაცმელი' },
    heightCm: 175,
    weightKg: 70,
    availableSizes: ['S', 'M', 'L', 'XL']
  }), 'M');
});

test('clothing estimate rejects invalid measurements and unknown size systems', () => {
  const product = { category: 'clothing' };
  assert.equal(estimateProductSize({ product, heightCm: 0, weightKg: 70, availableSizes: ['S', 'M'] }), null);
  assert.equal(estimateProductSize({ product, heightCm: 175, weightKg: 500, availableSizes: ['S', 'M'] }), null);
  assert.equal(estimateProductSize({ product, heightCm: 175, weightKg: 70, availableSizes: ['One Size'] }), null);
});

test('no recommendation is returned when the closest available size is too far away', () => {
  assert.equal(estimateProductSize({
    product: { category: 'shoes' },
    footLengthCm: 25,
    availableSizes: ['35', '46']
  }), null);
});
