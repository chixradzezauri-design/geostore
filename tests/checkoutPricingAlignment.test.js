import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const orderSafety = await readFile(new URL('../src/utils/orderSafety.js', import.meta.url), 'utf8');
const checkoutSql = await readFile(new URL('../supabase/migrations/20261107115218_persist_checkout_addons_server_pricing.sql', import.meta.url), 'utf8');

test('storefront checkout subtotal includes the same paid add-ons charged by the server', () => {
  assert.match(app, /calculateCartSubtotalGEL/);
  assert.match(orderSafety, /item\?\.gift_wrap === true \|\| item\?\.giftWrap === true/);
  assert.match(orderSafety, /item\?\.vip_warranty === true \|\| item\?\.vipWarranty === true/);
  assert.match(orderSafety, /giftWrap \? 500 : 0/);
  assert.match(orderSafety, /vipWarranty \? 1500 : 0/);
  assert.match(checkoutSql, /gift_wrap[^\n]*then 5 else 0/);
  assert.match(checkoutSql, /vip_warranty[^\n]*then 15 else 0/);
  assert.match(checkoutSql, /v_subtotal := v_subtotal \+ v_addon_subtotal;[\s\S]*?v_discount := round\(v_subtotal \* v_coupon\.discount_percent/);
});

test('admin delivery fee persistence uses strict two-decimal validation', () => {
  assert.match(admin, /import \{ parseDeliveryFeeDrafts \} from '\.\.\/utils\/deliveryFeeSafety\.js';/);
  assert.match(admin, /rows = parseDeliveryFeeDrafts\(deliveryFeeDraft\)/);
  assert.match(admin, /min="0" step="0\.01" onChange=\{e => \{ const value = e\.target\.value; setDeliveryFeeDraft\(previous => \(\{ \.\.\.\(previous \|\| deliveryFees\), tbilisi: value \}\)\); \}\}/);
  assert.match(admin, /bigCities: value/);
  assert.match(admin, /other: value/);
});
