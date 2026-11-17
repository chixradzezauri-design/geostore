import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('analytics-only staff call the aggregate RPC, not the owner raw-data analytics view', () => {
  assert.match(source, /supabase\.rpc\('get_staff_analytics_summary'/);
  assert.match(source, /visibleAdminTab === 'analytics' && !isOwner && <StaffAnalyticsSummary \/>/);
  assert.match(source, /visibleAdminTab === 'analytics' && isOwner && \(/);
  assert.match(source, /მომხმარებლის პირადი ინფორმაცია და შეკვეთების დეტალები არ ჩანს/);
  assert.match(source, /summary\?\.financials_available/);
});
