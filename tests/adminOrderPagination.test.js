import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('admin order refresh paginates the complete order ledger beyond the PostgREST row cap', () => {
  assert.match(app, /const allOrderRows = \[\];[\s\S]*?const pageSize = 1000;/);
  assert.match(app, /for \(let offset = 0; offset < 100000; offset \+= pageSize\)/);
  assert.match(app, /headers\.Range = \x60\$\{offset\}-\$\{offset \+ pageSize - 1\}\x60/);
  assert.match(app, /headers\['Range-Unit'\] = 'items'/);
  assert.match(app, /orders\?select=\*&order=created_at\.desc,id\.asc/);
  assert.match(app, /allOrderRows\.push\(\.\.\.page\)/);
  assert.match(app, /const data = allOrderRows;[\s\S]*?setOrders\(data\.map/);
});

test('partial order pagination never replaces the last complete admin order snapshot', () => {
  assert.match(app, /if \(page\.length < pageSize\) \{\s*completed = true;\s*break;\s*\}/);
  assert.match(app, /შეკვეთების სრული ისტორიის შემოწმება ვერ დასრულდა/);
  assert.match(app, /if \(!completed\) throw new Error\('შეკვეთების სრული ისტორიის ჩატვირთვა ვერ დასრულდა\.'\)/);
  assert.match(app, /if \(!adminOrdersSessionActive\.current \|\| requestSessionVersion !== adminOrdersSessionVersion\.current\) return;[\s\S]*?setOrders\(data\.map/);
  assert.match(app, /finally \{\s*adminOrdersFetchLock\.current = false;/);
});
