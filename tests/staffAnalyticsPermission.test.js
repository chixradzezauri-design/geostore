import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117153000_staff_analytics_summary.sql', import.meta.url), 'utf8');
const foundation = await readFile(new URL('../supabase/migrations/20261117100000_admin_staff_auth_foundation.sql', import.meta.url), 'utf8');

test('analytics RPC requires the analytics module permission and limits date range', () => {
  assert.match(migration, /public\.has_staff_permission\('analytics'\)/);
  assert.match(migration, /v_to - v_from > interval '366 days'/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /SET search_path = ''/);
  assert.match(foundation, /'analytics'/);
});

test('analytics returns aggregates only and financial aggregates require expenses permission', () => {
  for (const key of ['order_count', 'cancelled_count', 'revenue', 'expenses', 'cost_of_goods', 'net_profit_estimate', 'status_counts', 'daily', 'top_products']) {
    assert.match(migration, new RegExp(`'${key}'`));
  }
  assert.doesNotMatch(migration, /customer_name|user_email|customer_email|phone|address/);
  assert.match(migration, /sum\(e\.amount\)/);
  assert.match(migration, /purchase_cost/);
  assert.match(migration, /v_can_view_financials boolean := public\.has_staff_permission\('expenses'\)/);
  assert.match(migration, /financials_available/);
});

test('analytics is read-only and cannot mutate orders, products or expenses', () => {
  assert.doesNotMatch(migration, /INSERT INTO public\.(orders|products|expenses)/i);
  assert.doesNotMatch(migration, /UPDATE public\.(orders|products|expenses)/i);
  assert.doesNotMatch(migration, /DELETE FROM public\.(orders|products|expenses)/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_staff_analytics_summary/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_staff_analytics_summary.*TO authenticated/);
});
