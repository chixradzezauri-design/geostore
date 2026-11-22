import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const script = read('../scripts/stage78AuthPostgrest.mjs');
const sql = read('./stage78-supabase/prepare.sql');
const workflow = read('../.github/workflows/stage78-free-supabase-auth-postgrest.yml');
const config = read('./stage78-supabase/supabase/config.toml');
const notes = read('../docs/stage78-free-auth-postgrest-ci.md');

test('Stage78 runs a real local Auth + PostgREST stack, with no remote secrets or deploy action', () => {
  assert.match(workflow, /supabase\/setup-cli@v3/);
  assert.match(workflow, /supabase start --exclude/);
  assert.match(workflow, /supabase status -o env/);
  assert.match(workflow, /stage78AuthPostgrest\.mjs/);
  assert.match(workflow, /supabase stop --no-backup/);
  assert.doesNotMatch(workflow, /supabase (link|db push|migration up)|SUPABASE_ACCESS_TOKEN|secrets\./);
  assert.match(config, /project_id = "geostore-stage78-ci"/);
  assert.match(config, /major_version = 17/);
  assert.match(script, /Refusing non-local Supabase API/);
  assert.match(script, /signInWithPassword/);
  assert.match(script, /Auth\/PostgREST\/RLS/);
});

test('Stage78 applies exact versioned staff-auth and Phase A ledger SQL, no Phase B or live rows', () => {
  assert.match(sql, /\\ir \.\.\/\.\.\/supabase\/migrations\/20261117231455_admin_staff_auth_foundation\.sql/);
  assert.match(sql, /\\ir \.\.\/\.\.\/supabase\/migrations\/20261121210000_scope_admin_order_ledger_permissions\.sql/);
  assert.doesNotMatch(sql, /20261121213000_revoke_legacy/);
  assert.match(sql, /STAGE78-ORDER/);
  assert.match(sql, /ALTER TABLE public\.orders ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /NOTIFY pgrst, 'reload schema'/);
});

test('Stage78 exercises real permission paths and retains honest release caveats', () => {
  for (const term of [
    'admin_order_image_refs_page', 'admin_order_ledger_page', 'purchase_cost',
    'user_metadata', 'Tampered JWT', 'server-side staff revocation', 'inactive'
  ]) assert.ok(script.includes(term), 'Missing integration scenario: ' + term);
  for (const phrase of ['NOT RELEASE-READY', 'full-schema', 'Phase A', 'Phase B',
    'Production unchanged', 'no paid staging']) assert.ok(notes.includes(phrase), 'Missing release warning: ' + phrase);
});
