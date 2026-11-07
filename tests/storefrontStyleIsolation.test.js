import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/Header.jsx', import.meta.url), 'utf8');
const storeView = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
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
});

test('customer tabs share the storefront theme while admin stays separate', () => {
  assert.match(app, /activeTab !== 'admin'\s*\?\s*'geostore-fashion-store'/);
});

test('wishlist markup and styles use the shared customer storefront theme', () => {
  assert.match(app, /gs-wishlist-page/);
  assert.match(app, /gs-wishlist-card/);
  assert.match(css, /\.geostore-fashion-store\s+\.gs-wishlist-card/);
});
