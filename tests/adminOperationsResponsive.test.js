import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/adminDashboardSections.css', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('AI, audit, staff and settings sections keep their existing interfaces', () => {
  for (const name of ['admin-ai-analyst', 'admin-ai-composer', 'admin-staff-panel', 'admin-audit-logs-panel', 'admin-broadcasts-panel', 'admin-settings-panel', 'admin-delivery-settings', 'admin-global-settings-form']) {
    assert.ok(admin.includes(name), `missing admin section class: ${name}`);
  }
});

test('AI and settings forms remain usable on mobile', () => {
  assert.ok(css.includes('.admin-ai-composer > button'));
  assert.ok(css.includes('max-height: min(55vh, 400px)'));
  assert.ok(css.includes('.admin-delivery-fee-fields'));
  assert.ok(css.includes('grid-template-columns: minmax(0, 1fr)'));
  assert.ok(css.includes('.admin-global-settings-form'));
});

test('staff and audit actions retain readable wrapping and touch targets', () => {
  assert.ok(css.includes('.admin-staff-actions'));
  assert.ok(css.includes('min-height: 44px'));
  assert.ok(css.includes('.admin-audit-logs-panel'));
  assert.ok(css.includes('overflow-wrap: anywhere'));
});
