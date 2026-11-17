import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const polish = await readFile(new URL('../src/adminDashboardPolish.css', import.meta.url), 'utf8');
const entry = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('Stage 101 admin polish is loaded after all existing dashboard styles', () => {
  const polishImport = entry.indexOf("import './adminDashboardPolish.css'");
  assert.ok(polishImport > entry.indexOf("import './adminDashboardModals.css'"));
  assert.match(polish, /\.admin-dashboard-pro\.admin-dashboard-shell/);
});

test('Stage 101 visual refinements retain all core admin sections and interactions', () => {
  for (const section of ['command', 'orders', 'products', 'staff', 'support', 'analytics', 'settings']) {
    assert.match(admin, new RegExp(`visibleAdminTab === ['"]${section}['"]`));
  }
  assert.match(admin, /handleUpdateOrderStatus/);
  assert.match(admin, /handleConfirmOrderReactivation/);
  assert.match(admin, /handleInviteStaff/);
  assert.match(admin, /handleAddExistingUser/);
});

test('admin polish remains responsive, keyboard visible and reduced-motion aware', () => {
  assert.match(polish, /@media \(max-width: 1023px\)/);
  assert.match(polish, /@media \(max-width: 640px\)/);
  assert.match(polish, /@media \(max-width: 380px\)/);
  assert.match(polish, /:focus-visible/);
  assert.match(polish, /prefers-reduced-motion:\s*reduce/);
});

test('visual polish does not hide or disable existing admin controls', () => {
  assert.doesNotMatch(polish, /display:\s*none/i);
  assert.doesNotMatch(polish, /pointer-events:\s*none/i);
  assert.doesNotMatch(polish, /visibility:\s*hidden/i);
});


test('Stage 104 keeps the admin navigation usable on tablet and mobile', () => {
  assert.match(polish, /flex-direction:\s*row/);
  assert.match(polish, /overflow-x:\s*auto/);
  assert.match(polish, /scroll-snap-type:\s*x\s+proximity/);
  assert.match(polish, /min-height:\s*46px/);
  assert.match(polish, /max-width:\s*1023px/);
});

test('Stage 104 improves narrow-screen readability and prevents horizontal layout overflow', () => {
  assert.match(polish, /\[class~="text-\[8px\]"\]/);
  assert.match(polish, /font-size:\s*10px\s*!important/);
  assert.match(polish, /overflow-wrap:\s*anywhere/);
  assert.match(polish, /max-width:\s*100%/);
  assert.match(polish, /min-height:\s*44px/);
  assert.match(polish, /> :not\(\[hidden\]\) ~ :not\(\[hidden\]\)/);
  assert.match(polish, /margin-top:\s*0 !important/);
});
