import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getActiveFlashSaleProducts,
  getEarliestFlashSaleEnd,
  getFlashSaleCountdown
} from '../src/utils/flashSaleTime.js';

const fixedNow = Date.parse('2026-11-16T12:00:00.000Z');

test('flash sale countdown uses the same persisted end timestamp after a page reload', () => {
  const saleEnd = '2026-11-16T18:00:00.000Z';
  const firstVisit = getFlashSaleCountdown(Date.parse(saleEnd), fixedNow);
  const laterVisit = getFlashSaleCountdown(Date.parse(saleEnd), fixedNow + 30 * 60 * 1000);

  assert.deepEqual(firstVisit, { hours: 6, minutes: 0, seconds: 0 });
  assert.deepEqual(laterVisit, { hours: 5, minutes: 30, seconds: 0 });
});

test('only currently active, persisted flash-sale products are shown', () => {
  const products = [
    {
      id: 'active',
      priceGEL: 70,
      oldPriceGEL: 100,
      flashSaleStartedAt: '2026-11-16T11:00:00.000Z',
      flashSaleEndsAt: '2026-11-16T14:00:00.000Z',
      variants: []
    },
    {
      id: 'expired',
      priceGEL: 70,
      oldPriceGEL: 100,
      flashSaleStartedAt: '2026-11-16T08:00:00.000Z',
      flashSaleEndsAt: '2026-11-16T11:59:00.000Z',
      variants: []
    },
    {
      id: 'without-deadline',
      priceGEL: 70,
      oldPriceGEL: 100,
      variants: []
    }
  ];

  assert.deepEqual(
    getActiveFlashSaleProducts(products, fixedNow).map(product => product.id),
    ['active']
  );
});

test('custom-variant products are not incorrectly included in base-price flash sales', () => {
  const products = [{
    id: 'custom',
    priceGEL: 70,
    oldPriceGEL: 100,
    flashSaleEndsAt: '2026-11-16T14:00:00.000Z',
    variants: [{ id: 'variant-1', variantType: 'custom', price: 70, stock: 2 }]
  }];

  assert.deepEqual(getActiveFlashSaleProducts(products, fixedNow), []);
});

test('the global countdown follows the earliest active product expiry', () => {
  const products = [
    { flashSaleEndsAt: '2026-11-16T17:00:00.000Z' },
    { flashSaleEndsAt: '2026-11-16T15:00:00.000Z' },
    { flashSaleEndsAt: '2026-11-16T16:00:00.000Z' }
  ];

  assert.equal(getEarliestFlashSaleEnd(products), Date.parse('2026-11-16T15:00:00.000Z'));
});

test('expired countdowns clamp to zero and never restart at a new twelve-hour cycle', () => {
  assert.deepEqual(
    getFlashSaleCountdown(Date.parse('2026-11-16T11:59:00.000Z'), fixedNow),
    { hours: 0, minutes: 0, seconds: 0 }
  );
});

test('storefront, admin and database all use the persisted flash-sale deadline', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const storeView = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  const migration = readFileSync(
    new URL('../supabase/migrations/20261116150000_persist_flash_sale_expiry_and_auto_restore.sql', import.meta.url),
    'utf8'
  );

  assert.match(app, /flash_sale_started_at,flash_sale_ends_at,flash_sale_percent/);
  assert.match(app, /flashSaleEndsAt: p\.flash_sale_ends_at/);
  assert.match(storeView, /getFlashSaleCountdown\(flashSaleEndAt, flashSaleClock\)/);
  assert.doesNotMatch(storeView, /hours: 11, minutes: 45, seconds: 30/);
  assert.match(admin, /p_duration_hours: durationHours/);
  assert.match(admin, /აქციის ხანგრძლივობა/);
  assert.match(migration, /cron\.schedule\([\s\S]*?'\* \* \* \* \*'/);
  assert.match(migration, /price_gel = CASE[\s\S]*?old_price_gel/);
  assert.match(css, /GEOSTORE — stage 41: persistent flash-sale countdown and premium sale cards/);
});
