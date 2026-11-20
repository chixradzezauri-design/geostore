import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getActiveFlashSaleProducts,
  getFlashSaleNextTickDelay,
} from '../src/utils/flashSaleTime.js';

const anchor = Date.parse('2026-11-20T10:00:00Z');
const promo = (startOffsetMs, endOffsetMs, extra = {}) => ({
  id: 'sale',
  flashSaleStartedAt: new Date(anchor + startOffsetMs).toISOString(),
  flashSaleEndsAt: new Date(anchor + endOffsetMs).toISOString(),
  oldPriceGEL: 120,
  priceGEL: 99,
  ...extra
});

test('no active or upcoming valid sale means no store-wide timer', () => {
  assert.equal(getFlashSaleNextTickDelay([], anchor), null);
  assert.equal(getFlashSaleNextTickDelay(null, anchor), null);
  assert.equal(getFlashSaleNextTickDelay([promo(-5000, -1)], anchor), null);
  assert.equal(getFlashSaleNextTickDelay([promo(5000, 12000, { priceGEL: 140 })], anchor), null);
  assert.equal(getFlashSaleNextTickDelay([promo(5000, 12000, { flashSaleStartedAt: 'not-a-date' })], anchor), null);
});

test('active promotions tick at second boundary and end at server timestamp', () => {
  const sale = promo(-2000, 3600000);
  assert.equal(getFlashSaleNextTickDelay([sale], anchor + 250), 750);
  assert.equal(getFlashSaleNextTickDelay([sale], anchor + 999), 1);
  assert.equal(getActiveFlashSaleProducts([sale], anchor).length, 1);
  assert.equal(getFlashSaleNextTickDelay([sale], anchor + 3600000), null);
});

test('upcoming promotion schedules its start and does not poll continuously', () => {
  const next = promo(5500, 50000);
  assert.equal(getFlashSaleNextTickDelay([next], anchor), 5500);
  assert.equal(getFlashSaleNextTickDelay([next], anchor + 5500), 500);
  const farther = promo(180000, 240000);
  assert.equal(getFlashSaleNextTickDelay([farther], anchor), 60000);
  assert.equal(getFlashSaleNextTickDelay([farther], anchor + 179500), 500);
  assert.equal(getFlashSaleNextTickDelay([next, farther], anchor), 5500);
});

test('invalid, undated, non-discounted and ended sales never register timers', () => {
  assert.equal(getFlashSaleNextTickDelay([{ id: 'other' }], anchor), null);
  assert.equal(getFlashSaleNextTickDelay([promo(3000, 2500)], anchor), null);
  assert.equal(getFlashSaleNextTickDelay([promo(0, 5000, { priceGEL: 120 })], anchor), null);
  assert.equal(getFlashSaleNextTickDelay([promo(-1, 5000, { priceGEL: -2 })], anchor), null);
});
