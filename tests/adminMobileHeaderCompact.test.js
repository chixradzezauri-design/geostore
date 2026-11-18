import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const polish = readFileSync(new URL('../src/adminDashboardPolish.css', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('mobile admin greeting header stays compact instead of distributing empty vertical space', () => {
  assert.match(polish, /height:\s*auto\s*!important/);
  assert.match(polish, /min-height:\s*0\s*!important/);
  assert.match(polish, /justify-content:\s*flex-start\s*!important/);
});

test('mobile storefront actions use a compact two-column layout with full-width access status', () => {
  assert.match(polish, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(polish, /grid-column:\s*1\s*\/\s*-1/);
  assert.match(dashboard, /მონახაზის შენახვა/);
  assert.match(dashboard, /ცვლილებების გამოქვეყნება/);
});

test('admin action handlers and role guards remain in place', () => {
  assert.match(dashboard, /onSaveStorefrontDraft\(\)/);
  assert.match(dashboard, /onPublishStorefront\(\)/);
  assert.match(dashboard, /hasModulePermission\('settings'\)/);
  assert.match(dashboard, /isOwner &&/);
});

test('admin typography is consistently compact across desktop, tablet and mobile', () => {
  assert.match(polish, /STAGE 108 — consistent compact typography across the entire admin workspace/);
  assert.match(polish, /max-width:\s*1023px/);
  assert.match(polish, /max-width:\s*640px/);
  assert.match(polish, /max-width:\s*380px/);
  assert.match(polish, /p, span, label, small, th, td, li, dt, dd, figcaption/);
  assert.match(polish, /:is\(h1, h2\)[\s\S]*?font-size:\s*13px/);
});

test('compact typography overrides oversized utility classes and shrinks the admin greeting header', () => {
  assert.match(polish, /STAGE 109 — hard compact typography/);
  assert.doesNotMatch(polish, /\.admin-dashboard-pro\.admin-dashboard-shell \* \{[\s\S]*?font-size: inherit !important/);
  assert.match(polish, /\.admin-dashboard-pro\.admin-dashboard-shell > div:nth-child\(2\) > div:first-child > div:first-child h2[\s\S]*?font-size: 12px !important/);
  assert.match(polish, /min-height: 34px !important/);
  assert.match(polish, /\.admin-command-kpi > strong[\s\S]*?font-size: 18px !important/);
});


test('storefront typography uses a scoped responsive scale and preserves mobile form usability', () => {
  const storefront = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(storefront, /VISUAL SYSTEM — STAGE 47/);
  assert.match(storefront, /--gs-type-body:\s*clamp\(/);
  assert.match(storefront, /\.geostore-fashion-store \.geostore-storefront h1/);
  assert.match(storefront, /max-width:\s*767px/);
  assert.match(storefront, /font-size:\s*16px !important/);
});

test('admin typography preserves semantic hierarchy and mobile input zoom protection', () => {
  assert.match(polish, /STAGE 110 — restore a clear type hierarchy/);
  assert.match(polish, /:is\(h1, h2\)[\s\S]*?font-size:\s*17px !important/);
  assert.match(polish, /max-width:\s*640px/);
  assert.match(polish, /:is\(input, select, textarea\)[\s\S]*?font-size:\s*16px !important/);
  assert.doesNotMatch(polish, /\.admin-dashboard-pro\.admin-dashboard-shell \* \{[\s\S]*?font-size: inherit !important/);
});


test('storefront first-screen sections have responsive layout guardrails', () => {
  const storefront = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(storefront, /VISUAL SYSTEM — STAGE 48/);
  assert.match(storefront, /\.geostore-fashion-store \.gs-site-header-inner/);
  assert.match(storefront, /\.geostore-fashion-store \.gs-fashion-hero__content/);
  assert.match(storefront, /\.geostore-fashion-store \.geostore-storefront \.gs-flash-sale-countdown/);
  assert.match(storefront, /max-width: 760px/);
  assert.match(storefront, /max-width: 390px/);
});


test('storefront category tiles, catalog controls and product cards have responsive layout rules', () => {
  const storefront = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  const view = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
  assert.match(storefront, /VISUAL SYSTEM — STAGE 49/);
  assert.match(storefront, /\.gs-catalog-category-grid[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(storefront, /\.gs-catalog-controls[\s\S]*?flex-direction:\s*column/);
  assert.match(storefront, /\.gs-catalog-product-card[\s\S]*?border-radius:\s*16px/);
  assert.match(storefront, /\.gs-catalog-product-media[\s\S]*?aspect-ratio:/);
  assert.match(view, /gs-category-card/);
  assert.match(view, /gs-catalog-product-card/);
  assert.match(view, /setMinPrice\(/);
  assert.match(view, /setMaxPrice\(/);
  assert.match(view, /setSortBy\(/);
  assert.match(view, /handleOpenProduct\(prod\)/);
});


test('product detail modal and gallery retain compact responsive sizing', () => {
  const storefront = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  const view = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
  assert.match(storefront, /VISUAL SYSTEM — STAGE 50/);
  assert.match(storefront, /\.gs-product-dialog[\s\S]*?max-height:/);
  assert.match(storefront, /\.gs-product-detail-image-stage[\s\S]*?height:/);
  assert.match(storefront, /\.gs-product-modal-body > \.grid[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(storefront, /env\(safe-area-inset-bottom\)/);
  assert.match(view, /setActiveImage\(img\)/);
  assert.match(view, /setSelectedSize\(size\)/);
  assert.match(view, /setSelectedColor\(colName\)/);
  assert.match(view, /addToCart\(/);
  assert.match(view, /handleAddReview\(/);
});
