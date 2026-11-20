import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const design = readFileSync(new URL('../src/designSystemV2.css', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/Header.jsx', import.meta.url), 'utf8');
const browser = readFileSync(new URL('./browser/realStorefrontSmoke.mjs', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('Design System 2.0 is appended after all legacy admin and storefront styles', () => {
  assert.equal(main.match(/import '\.\/designSystemV2\.css'/g)?.length, 1);
  assert.ok(main.indexOf("import './designSystemV2.css'") > main.indexOf("import './adminDashboardPolish.css'"));
  assert.match(design, /GEOSTORE Design System 2\.0/);
  assert.match(design, /--gs-v2-space-2: 8px/);
});

test('first design-system pass does not overwrite editable storefront colors, sizes, typography or stored state', () => {
  assert.match(design, /\.geostore-fashion-store/);
  assert.match(design, /\.admin-dashboard-pro\.admin-dashboard-shell/);
  assert.doesNotMatch(design, /(?:background(?:-color)?|font-family|font-weight|color)\s*:/i);
  assert.doesNotMatch(design, /localStorage|supabase|persist|onclick|display:\s*none/i);
  assert.doesNotMatch(design, /\[data-visual-editor-target=/);
});

test('command-center KPI density is compact without removing operational navigation', () => {
  assert.match(admin, /className="admin-command-kpi group/);
  assert.match(admin, /onClick=\{\(\) => setAdminTab\('orders'\)\}/);
  assert.match(admin, /onClick=\{\(\) => setAdminTab\('replenishment'\)\}/);
  assert.match(design, /\.admin-command-kpi > strong\s*\{\s*font-size:\s*clamp\(18px, 1\.9vw, 25px\)/);
  assert.match(design, /\.admin-command-panel\s*\{\s*min-inline-size:\s*0/);
});

test('long menu labels and storefront search cannot force intrinsic horizontal overflow', () => {
  assert.match(header, /className="gs-main-menu"/);
  assert.match(header, /className="gs-header-search-row"/);
  assert.match(design, /\.gs-menu-link > span:not\(\.gs-menu-count\):not\(\.gs-menu-category-dot\)/);
  assert.match(design, /max-inline-size:\s*calc\(100vw - 16px\)/);
  assert.match(design, /\.gs-header-search input\s*\{\s*min-inline-size:\s*0/);
});

test('escape closes the menu and returns keyboard focus to the opener', () => {
  assert.match(header, /const menuToggleRef = useRef\(null\)/);
  assert.match(header, /ref=\{menuToggleRef\}/);
  assert.match(header, /if \(event\.key === 'Escape'\) \{\s*closeMenu\(\);\s*\/\/[^\n]*\s*menuToggleRef\.current\?\.focus\(\)/);
  assert.match(header, /aria-expanded=\{menuOpen\}/);
  assert.match(browser, /page\.keyboard\.press\('Escape'\)/);
  assert.match(browser, /document\.activeElement === node/);
});

test('focus and reduced-motion protections are scoped to storefront and admin', () => {
  assert.match(design, /:focus-visible\s*\{/);
  assert.match(design, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(design, /--gs-v2-focus-offset: 3px/);
});
