import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('admin support ticket history paginates beyond the PostgREST default row cap', () => {
  assert.match(admin, /const allTickets = \[\];[\s\S]*?const pageSize = 1000;/);
  assert.match(admin, /for \(let offset = 0; offset < 100000; offset \+= pageSize\)/);
  assert.match(admin, /headers\.Range = \x60\$\{offset\}-\$\{offset \+ pageSize - 1\}\x60/);
  assert.match(admin, /headers\['Range-Unit'\] = 'items'/);
  assert.match(admin, /support_tickets\?select=\*&order=created_at\.desc,id\.asc/);
  assert.match(admin, /allTickets\.push\(\.\.\.page\)/);
  assert.match(admin, /setSupportTickets\(allTickets\.map/);
});

test('incomplete support ticket pagination preserves the last successful ticket list', () => {
  assert.match(admin, /if \(page\.length < pageSize\) \{\s*completed = true;\s*break;\s*\}/);
  assert.match(admin, /მხარდაჭერის ტიკეტების სრული ისტორიის შემოწმება ვერ დასრულდა/);
  assert.match(admin, /if \(!completed\) throw new Error\('მხარდაჭერის ტიკეტების სრული ისტორიის ჩატვირთვა ვერ დასრულდა\.'\)/);
  assert.match(admin, /catch \(error\) \{[\s\S]*?setSupportTicketsError\(error\?\.message[\s\S]*?\n    \}/);
  assert.doesNotMatch(admin, /catch \(error\) \{[\s\S]{0,300}?setSupportTickets\(\[\]\)/);
});
