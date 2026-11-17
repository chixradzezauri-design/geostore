import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/adminDashboardSections.css', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('finance sections retain analytics, calculator and expense workflows', () => {
  for (const name of ['admin-analytics-toolbar', 'admin-analytics-kpis', 'admin-analytics-card', 'admin-calculator-layout', 'admin-expense-form', 'admin-expense-row']) {
    assert.ok(admin.includes(name), `missing existing finance class: ${name}`);
  }
});

test('analytics controls and KPI cards adapt to narrow screens', () => {
  assert.match(css, /\.admin-analytics-toolbar select,[\s\S]*?width: 100%/);
  assert.match(css, /\.admin-analytics-kpis \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 380px\)[\s\S]*?\.admin-analytics-kpis \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
});

test('expense rows stack on mobile and preserve accessible action sizes', () => {
  assert.match(css, /\.admin-expense-row \{[\s\S]*?flex-direction: column/);
  assert.match(css, /\.admin-expense-delete \{[\s\S]*?min-height: 44px/);
  assert.match(css, /\.admin-expense-form > button \{[\s\S]*?min-height: 48px/);
});
