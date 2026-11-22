import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const contract=readFileSync(new URL('./sql/stage56_staff_auth_contract.sql',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');
const source=readFileSync(new URL('../supabase/migrations/20261117231455_admin_staff_auth_foundation.sql',import.meta.url),'utf8');
const notes=readFileSync(new URL('../docs/release-security-preflight-stage53.md',import.meta.url),'utf8');

test('Stage56 tests original staff authorization source in disposable PostgreSQL',()=>{
 assert.match(contract,/\\ir \.\.\/\.\.\/supabase\/migrations\/20261117231455_admin_staff_auth_foundation\.sql/);
 assert.match(source,/CREATE OR REPLACE FUNCTION public\.has_staff_permission\(p_permission text\)/);
 assert.match(source,/CREATE OR REPLACE FUNCTION public\.get_my_admin_access\(\)/);
 assert.match(workflow,/postgres:17-alpine/);
 assert.match(workflow,/psql -v ON_ERROR_STOP=1 -f tests\/sql\/stage56_staff_auth_contract\.sql/);
 assert.doesNotMatch(workflow,/DATABASE_URL|SUPABASE_SERVICE_ROLE|SUPABASE_ACCESS_TOKEN/);
});

test('Stage56 isolated integration covers no-session, spoofing, membership and permission separation',()=>{
 for (const phrase of [
  'no-session privilege escalation',
  'forged owner metadata authorized',
  'unconfirmed email staff authorized',
  'products-only permission isolation failed',
  'inactive staff permissions not revoked',
  'finance-only permission isolation failed',
  'owner without verified role authorized',
  'genuine owner identity failed',
  'unsafe staff membership grants'
 ]) assert.ok(contract.includes(phrase),phrase);
 assert.match(contract,/has_function_privilege\('anon','public\.has_staff_permission\(text\)','EXECUTE'\)/);
 assert.match(contract,/SET ROLE authenticated/);
 assert.match(contract,/RESET ROLE/);
});

test('Stage56 documents unmitigated staff orders raw-finance exposure as a release blocker',()=>{
 assert.match(notes,/Newly found release blocker/);
 assert.match(notes,/orders\?select=\*/);
 assert.match(notes,/purchase_cost/);
 assert.match(notes,/permission-filtered server projection/);
 assert.match(notes,/Keep PR #149 Draft/);
});
