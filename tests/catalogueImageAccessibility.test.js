import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const storeView = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

test('catalogue product image opens details with a keyboard-accessible button', () => {
  const start = storeView.indexOf('<div className="gs-catalog-product-media');
  const end = storeView.indexOf('<div className="gs-catalog-product-info', start);
  assert.ok(start >= 0 && end > start, 'product media region must exist');
  const media = storeView.slice(start, end);
  assert.ok(!media.includes('<div \n                  onClick='), 'media wrapper must not be a non-semantic click target');
  assert.ok(media.includes('<button\n                    type="button"\n                    onClick={() => handleOpenProduct(prod)}'));
  assert.ok(media.includes('aria-label={`${storeText.viewDetails}: ${prod.name || \'product\'}`}'));
  assert.ok(media.includes('gs-catalog-image-open pointer-events-auto absolute inset-0'));
  assert.ok(media.includes('focus-visible:outline-amber-400'));
  assert.ok(media.includes('alt="" aria-hidden="true"'));
  assert.ok(media.includes('gs-catalog-image-overlay pointer-events-none'));
  assert.ok(media.includes('aria-label={storeText.wishlistTitle}'));
  assert.ok(media.includes('aria-label={storeText.compareTitle}'));
});

test('product card detail targets remain semantic and image controls keep their own sizing', () => {
  assert.doesNotMatch(storeView, /<h3[^>]*onClick=/);
  assert.ok(css.includes('.gs-catalog-product-media>button[aria-pressed]{'));
  assert.ok(css.includes('.gs-catalog-product-media>button:focus-visible'));
  assert.ok(css.includes('.gs-category-card:focus-visible'));
});

test('final mobile catalogue polish selectors match storefront cascade specificity', () => {
  const finalMobileBlock = css.slice(css.lastIndexOf('GEOSTORE visual polish — mobile admin navigation and storefront cards'));
  assert.ok(finalMobileBlock.includes('.geostore-fashion-store .geostore-storefront .gs-catalog-product-meta'));
  assert.ok(finalMobileBlock.includes('.geostore-fashion-store .geostore-storefront .gs-editorial-category-card h4'));
  assert.ok(finalMobileBlock.includes('.geostore-fashion-store .geostore-storefront .gs-catalog-product-grid'));
  assert.ok(finalMobileBlock.includes('.geostore-fashion-store .geostore-storefront .gs-catalog-product-info'));
});
