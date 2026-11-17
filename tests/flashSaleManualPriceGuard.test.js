import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const expiry = await readFile(new URL('../supabase/migrations/20261116133134_flash_sale_expiry_compatibility.sql', import.meta.url), 'utf8');

test('full product editor blocks manual price changes while a persisted flash sale is active', () => {
  assert.match(admin, /const editingProductForPriceGuard = editingProductId[\s\S]*?const activeFlashSaleEnd = Date\.parse\([\s\S]*?activeFlashSaleEnd > Date\.now\(\)[\s\S]*?priceValue !== Number\(editingProductForPriceGuard\.priceGEL[\s\S]*?originalPrice !== Number\(editingProductForPriceGuard\.oldPriceGEL/);
  assert.match(admin, /მიმდინარე ან ძველი ფასის შეცვლა შესაძლებელი იქნება აქციის დასრულების შემდეგ/);
});

test('quick product price editing cannot conflict with automatic flash-sale restoration', () => {
  assert.match(admin, /const activeFlashSaleEnd = Date\.parse\(current\.flashSaleEndsAt/);
  assert.match(admin, /field === 'priceGEL' && Number\.isFinite\(activeFlashSaleEnd\) && activeFlashSaleEnd > Date\.now\(\)/);
  assert.match(admin, /ფასის სწრაფი შეცვლა შესაძლებელი იქნება აქციის დასრულების შემდეგ/);
});

test('scheduled expiry restores the saved original price and clears persisted sale metadata', () => {
  assert.match(expiry, /price_gel = CASE[\s\S]*?p\.old_price_gel/);
  assert.match(expiry, /old_price_gel = NULL/);
  assert.match(expiry, /flash_sale_ends_at = NULL/);
});
