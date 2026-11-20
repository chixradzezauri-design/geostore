import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('inventory tab uses the configured visual editor title, not literal template text', () => {
  assert.doesNotMatch(dashboard, /label:\s*'📚 \\{adminVisualDesign\\.content\\.inventoryTitle\\}'/);
  assert.match(dashboard, /label:\s*\`📚 \\$\\{adminVisualDesign\\.content\\.inventoryTitle\\}\`/);
});
