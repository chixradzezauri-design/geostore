import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration=readFileSync(new URL('../supabase/migrations/20261121190000_redact_alternate_costs_from_order_history.sql',import.meta.url),'utf8');
const previous=readFileSync(new URL('../supabase/migrations/20261109152039_sanitize_customer_order_history_item_fields.sql',import.meta.url),'utf8');
const contract=readFileSync(new URL('./sql/stage54_order_history_contract.sql',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');

test('Stage54: new history migration adds precisely the missing alt-cost aliases',()=>{
  for(const v of ["'purchase_cost'","'purchaseCost'","'cost_price'","'costPrice'",
    "'vendor'","'unit_cost'","'unitCost'","'margin'","'supplier'"]) {
    assert.ok(migration.includes(v),v);
  }
  assert.doesNotMatch(previous,/'cost_price'|'costPrice'/);
  assert.match(migration,/WHERE o\.user_id = auth\.uid\(\)/);
  assert.match(migration,/ORDER BY o\.created_at DESC, o\.id DESC/);
  assert.match(migration,/SECURITY DEFINER[\s\S]*?SET search_path TO ''/);
  assert.match(migration,/GRANT EXECUTE ON FUNCTION private\.get_my_orders\(\) TO authenticated, service_role/);
  assert.doesNotMatch(migration,/UPDATE public\.orders|DELETE FROM public\.orders|INSERT INTO public\.orders|CREATE POLICY/i);
});

test('Stage54: actual SQL runs on ephemeral database with A/B/guest and private snapshots',()=>{
  assert.match(contract,/\\ir \.\.\/\.\.\/supabase\/migrations\/20261121190000_redact_alternate_costs_from_order_history\.sql/);
  assert.match(contract,/SET ROLE authenticated/);
  assert.match(contract,/signed-in user A can see unexpected order count/);
  assert.match(contract,/user B sees another account/);
  assert.match(contract,/underlying finance snapshots were modified/);
  assert.match(contract,/has_function_privilege\('anon','public\.get_my_orders\(\)'/);
  assert.match(workflow,/psql -v ON_ERROR_STOP=1 -f tests\/sql\/stage54_order_history_contract\.sql/);
  assert.match(workflow,/supabase\/migrations\/20261121190000_redact_alternate_costs_from_order_history\.sql/);
});
