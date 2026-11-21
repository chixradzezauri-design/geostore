import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const admin=readFileSync(new URL('../src/components/AdminDashboardPro.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/videoAuditMobileAdmin.css',import.meta.url),'utf8');
const browser=readFileSync(new URL('./browser/responsiveLayout.mjs',import.meta.url),'utf8');

test('mobile selector and desktop sidebar share one permission-filtered admin module list',()=>{
  const i=admin.indexOf('  const visibleAdminNavigationItems = [');
  const j=admin.indexOf('  return (\n    <div className="admin-dashboard-pro admin-dashboard-shell');
  assert.ok(i>=0&&j>i);
  const nav=admin.slice(i,j);
  assert.equal((nav.match(/\{ id: '/g)||[]).length,23);
  assert.match(nav,/\.filter\(tab => canAccessAdminTab\(tab\.id\)\)/);
  assert.match(admin,/visibleAdminNavigationItems\.map\(tab => \{/);
  assert.match(admin,/visibleAdminNavigationItems\.map\(tab => \(/);
  assert.match(admin,/value=\{visibleAdminTab\}/);
  assert.match(admin,/onChange=\{\(event\) => setAdminTab\(event\.target\.value\)\}/);
  assert.match(admin,/htmlFor="geostore-admin-mobile-section"/);
});
test('mobile-only post-design-system stylesheet compacts the welcome without hiding actions',()=>{
  const rules=css.slice(css.indexOf('/* STAGE 33 — video-derived'));
  const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
  assert.ok(main.indexOf("import './videoAuditMobileAdmin.css'") > main.indexOf("import './designSystemV2.css'"));
  assert.match(rules,/@media \(max-width: 767px\)/);
  assert.match(rules,/grid-template-rows: auto auto/);
  assert.match(rules,/height: auto !important/);
  assert.match(rules,/font-size: 16px !important/);
  assert.match(admin,/onSaveStorefrontDraft\(\)/);
  assert.match(admin,/onPublishStorefront\(\)/);
  assert.match(browser,/welcomeHeight < 230/);
  assert.match(browser,/navRailDisplay, 'none'/);
});
