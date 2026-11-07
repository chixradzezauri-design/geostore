import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/Header.jsx', import.meta.url), 'utf8');
const storeView = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
const modals = readFileSync(new URL('../src/components/Modals.jsx', import.meta.url), 'utf8');
const aiAssistant = readFileSync(new URL('../src/components/AiAssistantModal.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('storefront navigation styles do not leak into the AI assistant header', () => {
  assert.doesNotMatch(css, /\.geostore-fashion-store\s+header\b/);
  assert.match(css, /\.gs-ai-header\s*\{[^}]*background:\s*#29241f/s);
  assert.match(header, /gs-site-header/);
  assert.match(aiAssistant, /className="gs-ai-header"/);
});

test('catalogue card styles are isolated from the product detail information panel', () => {
  assert.match(storeView, /className="gs-catalog-product-grid/);
  assert.match(storeView, /className="gs-catalog-product-info/);
  assert.match(storeView, /className="gs-product-detail-info/);
  assert.doesNotMatch(storeView, /className="[^"]*gs-product-info/);
  assert.match(css, /\.gs-product-detail-info\{display:flex!important;flex-direction:column!important;/);
});

test('customer tabs share the storefront theme while admin stays separate', () => {
  assert.match(app, /activeTab !== 'admin'\s*\?\s*'geostore-fashion-store'/);
});

test('flash-sale layout rules do not capture category tiles', () => {
  assert.doesNotMatch(css, /\.geostore-fashion-store\s+\.geostore-storefront\s+\.grid:has\(\s*>div\.group\)/);
  assert.match(css, /\.gs-flash-sale-section\s*>\s*\.grid/);
});

test('mobile product-detail form controls use an iOS-safe text size', () => {
  const mobileRule = css.split('@media(max-width:767px){').slice(1).find(block => block.includes('.gs-product-modal-body input'));
  assert.ok(mobileRule);
  assert.match(mobileRule, /font-size:16px!important/);
});

test('wishlist markup and styles use the shared customer storefront theme', () => {
  assert.match(app, /gs-wishlist-page/);
  assert.match(app, /gs-wishlist-card/);
  assert.match(css, /\.geostore-fashion-store\s+\.gs-wishlist-card/);
});


test('order confirmation code uses responsive wrapping styles on its actual code element', () => {
  assert.match(modals, /className="gs-order-code-value/);
  assert.match(css, /\.gs-order-success-dialog \.gs-order-code-value\{/);
  assert.match(css, /\.gs-order-code-value\{[^}]*overflow-wrap:anywhere!important;/s);
});

test('mobile category imagery and dark catalogue controls retain readable contrast', () => {
  assert.match(css, /\.gs-editorial-category-card \.gs-category-photo\{\s*opacity:1!important;/s);
  assert.match(css, /\.gs-catalog-controls \.gs-price-filter>div:first-child,[\s\S]*?color:#e8ded2!important;/);
});
