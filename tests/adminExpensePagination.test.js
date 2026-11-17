import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('admin expense history is loaded in stable PostgREST pages beyond the default row cap', () => {
  assert.match(admin, /const allExpenses = \[\];[\s\S]*?const pageSize = 1000;/);
  assert.match(admin, /for \(let offset = 0; offset < 100000; offset \+= pageSize\)/);
  assert.match(admin, /headers\.Range = \x60\$\{offset\}-\$\{offset \+ pageSize - 1\}\x60/);
  assert.match(admin, /headers\['Range-Unit'\] = 'items'/);
  assert.match(admin, /expenses\?select=\*&order=created_at\.desc,id\.desc/);
  assert.match(admin, /allExpenses\.push\(\.\.\.page\)/);
  assert.match(admin, /setExpenses\(allExpenses\)/);
});

test('incomplete expense pagination fails without replacing the last successful ledger', () => {
  assert.match(admin, /if \(page\.length < pageSize\) \{\s*completed = true;\s*break;\s*\}/);
  assert.match(admin, /ხარჯების სრული ისტორიის შემოწმება ვერ დასრულდა/);
  assert.match(admin, /if \(!completed\) throw new Error\('ხარჯების სრული ისტორიის ჩატვირთვა ვერ დასრულდა\.'\)/);
  assert.match(admin, /catch \(error\) \{[\s\S]*?setExpensesError\(error\?\.message[\s\S]*?return false;/);
  assert.doesNotMatch(admin, /catch \(error\) \{[\s\S]{0,300}?setExpenses\(\[\]\)/);
});
