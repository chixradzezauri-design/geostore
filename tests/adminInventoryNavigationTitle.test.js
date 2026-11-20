import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('inventory tab uses configured title rather than a literal template placeholder', () => {
  assert.equal(dashboard.includes("label: '📚 {adminVisualDesign.content.inventoryTitle}'"), false);
  assert.equal(dashboard.includes('label: '+String.fromCharCode(96)+'📚 ${adminVisualDesign.content.inventoryTitle}'+String.fromCharCode(96)), true);
});

test('command center visibility condition avoids redundant nested checks', () => {
  assert.equal(dashboard.includes("(visibleAdminTab === 'command' || (visibleAdminTab === 'command' || adminContentTab === 'command'))"), false);
  assert.equal(dashboard.includes("(visibleAdminTab === 'command' || adminContentTab === 'command')"), true);
});

test('admin navigation keeps long Georgian labels readable and focus visible', () => {
  assert.match(dashboard, /className="flex min-w-0 items-center gap-2\.5"/);
  assert.match(dashboard, /className="min-w-0 break-words">\{tab\.label\}/);
  assert.match(dashboard, /focus-visible:outline-emerald-300/);
  assert.match(dashboard, /shrink-0 px-2 py-0\.5 rounded-full/);
});
