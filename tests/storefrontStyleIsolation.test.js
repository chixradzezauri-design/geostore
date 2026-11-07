import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/Header.jsx', import.meta.url), 'utf8');
const storeView = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
const modals = readFileSync(new URL('../src/components/Modals.jsx', import.meta.url), 'utf8');
const imageSearch = readFileSync(new URL('../src/components/ImageSearchModal.jsx', import.meta.url), 'utf8');
const productCompare = readFileSync(new URL('../src/components/ProductCompareModal.jsx', import.meta.url), 'utf8');
const wardrobe = readFileSync(new URL('../src/components/AIDigitalWardrobe.jsx', import.meta.url), 'utf8');
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
  assert.ok(!['gs-product-grid', 'gs-product-card', 'gs-product-media', 'gs-product-title', 'gs-product-price', 'gs-product-action', 'gs-product-card-action'].some(className => new RegExp(`(?:^|[\\s"'])${className}(?:$|[\\s"'])`).test(storeView)));
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

test('mobile category imagery and the catalogue filter panel retain readable contrast', () => {
  assert.match(css, /\.gs-editorial-category-card \.gs-category-photo\{\s*opacity:1!important;/s);
  const finalFilterTheme = css.slice(css.lastIndexOf('GEOSTORE maintenance: unify catalogue filters'));
  assert.match(finalFilterTheme, /\.gs-catalog-controls\{[^}]*background:#f7f4ef!important;/s);
  assert.match(finalFilterTheme, /\.gs-catalog-controls \.gs-price-filter>div:first-child,[\s\S]*?color:#66594d!important;/);
  assert.match(finalFilterTheme, /\.gs-catalog-controls \.gs-price-filter input,[\s\S]*?background:#fffdfa!important;/);
});


test('image search and product comparison use the shared editorial modal theme', () => {
  assert.match(imageSearch, /gs-image-search-overlay/);
  assert.match(imageSearch, /gs-image-search-dialog/);
  assert.match(productCompare, /gs-product-compare-overlay/);
  assert.match(productCompare, /gs-product-compare-card/);
  assert.match(css, /\.gs-image-search-dialog,\s*\.gs-product-compare-dialog,\s*\.gs-wardrobe-add-form\{[^}]*background:#fffdfa!important;/s);
  assert.match(css, /\.gs-product-compare-card\{[^}]*background:#fffdfa!important;/s);
});

test('digital wardrobe and its add-item dialog use the shared responsive design system', () => {
  assert.match(wardrobe, /gs-digital-wardrobe/);
  assert.match(wardrobe, /gs-wardrobe-hero/);
  assert.match(wardrobe, /gs-wardrobe-add-form/);
  assert.match(css, /\.gs-wardrobe-hero\{[^}]*background:linear-gradient\(115deg,#f5f0e9 0%,#ebe3d9 100%\)!important;/s);
  assert.match(css, /\.gs-wardrobe-add-form\{[^}]*max-height:min\(90dvh,780px\)!important;/s);
});
 
test('product comparison uses variant-aware prices and actual available stock', () => {
  assert.match(productCompare, /getProductStartingPrice\(prod\)/);
  assert.match(productCompare, /getProductAvailableStock\(prod\)/);
  assert.doesNotMatch(productCompare, /prod\.stock\s*\|\|\s*1/);
});


 
test('mobile navigation retains login and registration inside the hamburger menu', () => {
  assert.match(header, /<nav id="geostore-main-menu"/);
  assert.match(header, /<div className="gs-menu-auth">/);
  assert.match(header, /openAuth\('login'\)/);
  assert.match(header, /openAuth\('register'\)/);
  const authRuleStart = css.lastIndexOf('.geostore-fashion-store .gs-menu-auth{');
  const authRuleEnd = css.indexOf('}', authRuleStart);
  const authRule = css.slice(authRuleStart, authRuleEnd + 1);
  const mobileAuthMediaStart = css.lastIndexOf('@media(max-width:640px)', authRuleStart);
  assert.ok(authRuleStart >= 0 && authRuleEnd > authRuleStart && mobileAuthMediaStart >= 0);
  assert.match(authRule, /display:grid!important;/);
});

test('mobile footer policy links use a compact responsive layout', () => {
  assert.match(app, /className="geostore-footer-links/);
  const footerStyles = css.slice(css.lastIndexOf('GEOSTORE — compact footer and floating assistance dock'));
  assert.match(footerStyles, /\.geostore-footer-links\{[\s\S]*?display:grid!important;/);
  assert.match(footerStyles, /grid-template-columns:1fr!important/);
});


test('retired catalogue information selectors are removed after style isolation', () => {
  assert.doesNotMatch(storeView, /gs-product-info/);
  assert.doesNotMatch(css, /\.gs-product-info\b/);
});

test('legacy catalogue card selectors are removed after migrating to semantic card classes', () => {
  assert.doesNotMatch(storeView, /\bgs-product-(?:grid|card|media|title|price|action|card-action)(?![\w-])/);
  assert.doesNotMatch(css, /\.gs-product-(?:grid|card|media|title|price|action|card-action)(?![\w-])/);
});


test('customer-facing pages share one centralized premium design-token palette', () => {
  assert.match(css, /:root\\{[\\s\\S]*?--gs-page:#f7f4ef;[\\s\\S]*?--gs-surface:#fffdfa;[\\s\\S]*?--gs-ink:#302a24;[\\s\\S]*?--gs-accent:#80684f;/);
  assert.match(css, /\\.gs-catalog-product-card\\{[\\s\\S]*?background:var\\(--gs-surface\\)!important;/);
  assert.match(css, /\\.gs-product-compare-card\\{[\\s\\S]*?background:var\\(--gs-surface\\)!important;/);
  assert.match(css, /\\.gs-wardrobe-summary,[\\s\\S]*?background:var\\(--gs-surface\\)!important;/);
});
