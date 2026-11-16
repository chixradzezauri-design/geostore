import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('desktop admin navigation stays reachable without changing tablet/mobile navigation', () => {
  const stage47 = css.slice(css.lastIndexOf('GEOSTORE ADMIN DESIGN — STAGE 47'));
  assert.match(stage47, /@media\s*\(min-width:\s*1024px\)/);
  assert.match(stage47, /position:\s*sticky\s*!important/);
  assert.match(stage47, /max-height:\s*calc\(100dvh - 32px\)\s*!important/);
  assert.match(stage47, /overflow-y:\s*auto\s*!important/);
  assert.match(css, /@media\s*\(max-width:\s*1023px\)[\s\S]*?position:\s*relative\s*!important/);
  assert.match(css, /scroll-snap-type:\s*x proximity\s*!important/);
  assert.match(admin, /admin-dashboard-pro admin-dashboard-shell/);
});

test('Stage 47 changes only presentation and leaves admin tab behavior intact', () => {
  assert.match(admin, /onClick=\{\(\) => setAdminTab\(tab\.id\)\}/);
  assert.match(admin, /onClick=\{handleExportOrders\}/);
  assert.match(admin, /handleUpdateOrderStatus\(o\.id,/);
  assert.match(admin, /handleSaveOrderAdminNote\(selectedOrderForModal\.id\)/);
});
