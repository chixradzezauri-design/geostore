import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('admin invoice adapts to narrow mobile viewports without changing invoice data', () => {
  assert.match(admin, /@media screen and \(max-width: 640px\)/);
  assert.match(admin, /table \{ display: block; width: 100%; max-width: 100%; overflow-x: auto/);
  assert.match(admin, /-webkit-overflow-scrolling: touch/);
  assert.match(admin, /\.header \{ flex-direction: column/);
  assert.match(admin, /\.totals-breakdown \{ width: 100%; max-width: 100%; \}/);
});

test('invoice print stylesheet restores printable table layout', () => {
  assert.match(admin, /@media print[\s\S]*?table \{ display: table; width: 100%; overflow: visible; \}/);
  assert.match(admin, /th, td \{ white-space: normal; \}/);
  assert.match(admin, /<tbody>[\s\S]*?\$\{itemsRows\}[\s\S]*?<\/tbody>/);
});
