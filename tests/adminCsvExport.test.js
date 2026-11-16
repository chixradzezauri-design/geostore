import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../src/components/AdminDashboardPro.jsx', import.meta.url),
  'utf8'
);

test('admin CSV export writes real CRLF row separators', () => {
  assert.ok(source.includes("join('\\r\\n')"));
  assert.ok(!source.includes("join('\\\\r\\\\n')"));
});

test('admin CSV export prefixes a real UTF-8 BOM character', () => {
  assert.ok(source.includes("new Blob(['\\uFEFF', csv]"));
  assert.ok(!source.includes("new Blob(['\\\\uFEFF', csv]"));
});
