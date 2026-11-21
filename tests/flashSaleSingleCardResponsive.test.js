import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const storeView = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');

const flashSaleTargetIndex = storeView.indexOf('data-visual-editor-target="flashSale"');
const flashSaleStart = storeView.lastIndexOf('<div', flashSaleTargetIndex);
const flashSaleEnd = storeView.indexOf('PREMIUM REDESIGNED CATEGORIES', flashSaleStart);
const flashSaleMarkup = storeView.slice(flashSaleStart, flashSaleEnd);
const stage43FixStart = css.lastIndexOf('GEOSTORE — Stage 43.2: iPhone Flash Sale card width and text flow');
const stage43Fix = css.slice(stage43FixStart);

test('Flash Sale CSS selectors match the actual StoreView card DOM', () => {
  assert.ok(flashSaleStart >= 0 && flashSaleEnd > flashSaleStart);
  assert.match(flashSaleMarkup, /^<div data-visual-editor-target="flashSale"[\s\S]*?className="gs-flash-sale-section/);
  assert.match(flashSaleMarkup, /className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4/);
  assert.match(flashSaleMarkup, /className="gs-flash-sale-card[^"]*"/);
  assert.match(flashSaleMarkup, /className="gs-flash-sale-media/);
  assert.match(flashSaleMarkup, /className="py-3 space-y-1\.5"/);
  assert.match(flashSaleMarkup, /className="flex items-baseline gap-2"/);
  assert.match(flashSaleMarkup, /<button[\s\S]*?className="w-full/);
  assert.match(flashSaleMarkup, /flashSaleProducts\.map\(prod =>/);
  assert.match(flashSaleMarkup, /handleOpenProduct\(prod, event\.currentTarget\)/);
  assert.match(flashSaleMarkup, /addToCart\(prod\)/);
});

test('one Flash Sale product spans the full mobile grid width', () => {
  assert.ok(stage43FixStart >= 0);
  assert.match(stage43Fix, /@media\s*\(max-width:\s*640px\)/);
  assert.match(
    stage43Fix,
    /\.gs-flash-sale-section\s*>\s*\.grid\s*>\s*\.gs-flash-sale-card:only-child\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1\s*!important;/
  );
  assert.match(
    stage43Fix,
    /\.gs-flash-sale-section\s*>\s*\.grid\s*>\s*\.gs-flash-sale-card:only-child\s*\{[^}]*width:\s*100%\s*!important;/
  );
});

test('two Flash Sale products keep card text and prices shrink-safe and horizontal', () => {
  assert.match(
    stage43Fix,
    /\.gs-flash-sale-section\s*>\s*\.grid\s*>\s*\.gs-flash-sale-card\s*\{[\s\S]*?min-width:\s*0\s*!important;[\s\S]*?writing-mode:\s*horizontal-tb\s*!important;/
  );
  assert.match(
    stage43Fix,
    /\.gs-flash-sale-card\s*>\s*\.py-3\s*\{[\s\S]*?min-width:\s*0\s*!important;[\s\S]*?writing-mode:\s*horizontal-tb\s*!important;/
  );
  assert.match(
    stage43Fix,
    /\.gs-flash-sale-card\s*>\s*\.py-3\s*>\s*\.flex\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?flex-wrap:\s*wrap\s*!important;/
  );
  assert.match(
    stage43Fix,
    /\.gs-flash-sale-card\s*>\s*button\s*\{[\s\S]*?writing-mode:\s*horizontal-tb\s*!important;/
  );
});

test('Visual Studio keeps a readable Flash Sale grid on narrow iPhones', () => {
  const marker = 'GEOSTORE — Stage 43.3 compatibility for Visual Studio';
  const start = css.lastIndexOf(marker);
  assert.ok(start >= 0, 'mobile compatibility override is present');
  const override = css.slice(start);
  assert.match(override, /@media\s*\(max-width:\s*640px\)/);
  assert.match(override, /\.gs-flash-sale-section\s*>\s*\.grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*220px\),\s*1fr\)\)\s*!important;/s);
  assert.match(override, /\.gs-flash-sale-card\s*\{[^}]*width:\s*100%\s*!important;[^}]*min-width:\s*0\s*!important;[^}]*max-width:\s*100%\s*!important;/s);
  const columns = (width, gap = 12) => Math.max(1, Math.floor((width + gap) / (220 + gap)));
  for (const width of [272, 327, 382]) assert.equal(columns(width), 1);
  assert.equal(columns(560), 2);
});
