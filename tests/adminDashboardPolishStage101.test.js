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

test('Stage 101 uses valid attribute selectors for Tailwind arbitrary text-size classes', () => {
  assert.ok(polish.includes('[class~="text-[8px]"]'));
  assert.ok(polish.includes('[class~="text-[9px]"]'));
  assert.ok(polish.includes('[class~="text-[10px]"]'));
  assert.ok(!polish.includes('.text-\\\\[8px\\\\]'));
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

test('Stage 112 keeps the mobile Command Center compact and its main action visible', () => {
  assert.match(admin, /className="admin-command-hero/);
  assert.match(admin, /className="admin-command-kpis/);
  assert.match(admin, /onClick=\{\(\) => setAdminTab\('analytics'\)\}/);
  assert.match(polish, /STAGE 112 — compact Command Center/);
  assert.match(polish, /\.admin-command-kpis \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
  assert.match(polish, /\.admin-command-hero button \{[\s\S]*?width: 100%[\s\S]*?min-height: 48px/);
  assert.match(polish, /\.admin-command-kpi > strong \{[\s\S]*?font-size: 24px/);
});

test('Stage 113 staff invitation form stays readable and touch-accessible on phones', () => {
  assert.match(admin, /className="admin-staff-create-form/);
  assert.match(admin, /className="admin-staff-create-fields/);
  assert.match(admin, /className="admin-staff-permission-grid/);
  assert.match(admin, /className="admin-staff-create-submit/);
  assert.match(polish, /STAGE 113 — responsive staff invitation form/);
  assert.match(polish, /\.admin-staff-create-fields > :is\(input, select\)[\s\S]*?min-height: 46px/);
  assert.match(polish, /\.admin-staff-permission-grid > label[\s\S]*?min-height: 42px/);
  assert.match(polish, /\.admin-staff-create-submit[\s\S]*?min-height: 48px/);
  assert.match(polish, /@media \(min-width: 420px\) and \(max-width: 640px\)[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});
