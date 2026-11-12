import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('admin order mapping preserves all database fields for the detail modal', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const mappingStart = source.indexOf('setOrders(data.map((o) => {');
  assert.notEqual(mappingStart, -1, 'admin order mapping must exist');
  const mappingEnd = source.indexOf('}));', mappingStart);
  assert.notEqual(mappingEnd, -1, 'admin order mapping must close');
  const mapping = source.slice(mappingStart, mappingEnd);
  assert.match(
    mapping,
    /return\s*\{\s*\/\/ Preserve every database order field[\s\S]*?\.\.\.o\s*,/,
    'the mapper must retain optional fields such as surname, region and postal code'
  );
  assert.match(mapping, /customerName:\s*o\.customer_name/);
  assert.match(mapping, /items\s*,/);
});

test('admin order contact email does not display the guest sentinel as an email address', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(
    source,
    /user_email:\s*o\.customer_email\s*\|\|\s*\(o\.user_email\s*&&\s*o\.user_email\s*!==\s*'guest'\s*\?\s*o\.user_email\s*:\s*''\)/
  );
});
