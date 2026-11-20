import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const footer = readFileSync(new URL('../src/components/StorefrontFooter.jsx', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');

const compact = css.slice(css.indexOf('/* GEOSTORE compact responsive pass 2026-11-20'));

test('compact layout rules follow all legacy storefront and admin CSS overrides', () => {
  assert.ok(css.includes('/* GEOSTORE compact responsive pass 2026-11-20'));
  assert.match(compact, /\.admin-dashboard-pro\.admin-dashboard-shell/);
  assert.match(compact, /\[data-admin-visual-header="true"\]/);
  assert.doesNotMatch(compact, /(?:background-color|font-size|color)\s*:/i);
  assert.doesNotMatch(compact, /(?:display\s*:\s*none\s*!important)[\s\S]{0,80}admin-dashboard/i);
});

test('admin navigation remains scrollable on desktop and compact on tablets', () => {
  assert.match(dashboard, /className="admin-dashboard-pro admin-dashboard-shell/);
  assert.match(dashboard, /data-admin-visual-nav-item="true"/);
  assert.match(compact, /@media \(min-width: 1024px\)/);
  assert.match(compact, /max-height: calc\(100dvh - 24px\)/);
  assert.match(compact, /overflow-y: auto !important/);
  assert.match(compact, /@media \(max-width: 1023px\)/);
  assert.match(compact, /overscroll-behavior-x: contain/);
  assert.doesNotMatch(compact, /pointer-events:\s*none/);
});

test('existing owner-only design and publish controls remain present and clickable', () => {
  assert.match(dashboard, /onSaveStorefrontDraft\(\)/);
  assert.match(dashboard, /onPublishStorefront\(\)/);
  assert.match(dashboard, /data-admin-visual-header="true"/);
  assert.match(compact, /overflow-wrap: anywhere/);
});

test('mobile footer links use flex-wrap and decorative separators do not occupy cells', () => {
  assert.match(footer, /className="geostore-footer-links/);
  assert.equal((footer.match(/<span aria-hidden="true">•<\/span>/g) ?? []).length, 2);
  assert.match(compact, /@media \(max-width: 640px\)/);
  assert.match(compact, /\.geostore-fashion-store \.geostore-footer-links\s*\{\s*display: flex !important/);
  assert.match(compact, /\.geostore-footer-links > span\[aria-hidden="true"\]\s*\{\s*display: none !important/);
  assert.match(compact, /\.geostore-footer-links > button\s*\{[\s\S]*?min-height: 40px !important/);
});

test('320px catalog is single-column while normal phones keep the existing two-column design', () => {
  assert.match(store, /gs-catalog-product-grid grid grid-cols-1 sm:grid-cols-2/);
  assert.match(compact, /@media \(max-width: 359px\)/);
  assert.match(compact, /\.geostore-fashion-store \.geostore-storefront \.gs-catalog-product-grid,\s*\.gs-visual-preview-frame--mobile \.gs-catalog-product-grid/);
  assert.match(compact, /grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.doesNotMatch(compact, /grid-template-columns:\s*repeat\(2/);
});

test('compact mobile header keeps search input and existing photo-search action', () => {
  assert.match(compact, /\.gs-header-search input\s*\{\s*min-width: 0 !important/);
  assert.match(css, /\.gs-header-search-row/);
  assert.match(store, /gs-flash-sale-section/);
});
