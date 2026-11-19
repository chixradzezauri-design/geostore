import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261119170000_storefront_draft_concurrency.sql', import.meta.url), 'utf8');

test('storefront draft loader captures the shared version used by the next save', () => {
  assert.match(app, /select=draft_config,draft_updated_at/);
  assert.match(app, /storefrontDraftUpdatedAtRef\.current = typeof rows\?\.\[0\]\?\.draft_updated_at === 'string'/);
  assert.match(app, /p_expected_draft_updated_at: storefrontDraftUpdatedAtRef\.current/);
  assert.match(app, /storefrontDraftUpdatedAtRef\.current = typeof savedDraftState\?\.draft_updated_at === 'string'/);
});

test('storefront draft RPC rejects stale device versions and serializes first-time writes', () => {
  assert.match(migration, /DROP FUNCTION IF EXISTS public\.save_storefront_draft\(jsonb\)/);
  assert.match(migration, /p_expected_draft_updated_at timestamptz/);
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\('geostore:storefront-draft', 0\)\)/);
  assert.match(migration, /p_expected_draft_updated_at IS DISTINCT FROM v_current_updated_at/);
  assert.match(migration, /USING ERRCODE = '40001'/);
  assert.match(migration, /draft_updated_at = GREATEST\(clock_timestamp\(\), v_current_updated_at \+ interval '1 microsecond'\)/);
});

test('draft conflict is reported without silently replacing the local edit or published snapshot', () => {
  assert.match(app, /if \(errorCode === '40001'\)/);
  assert.match(app, /თქვენი ცვლილებები ამჯერად არ გადაგვიწერია/);
  const privateRpc = migration.split('CREATE OR REPLACE FUNCTION private.save_storefront_draft')[1]?.split('CREATE OR REPLACE FUNCTION public.save_storefront_draft')[0] || '';
  assert.doesNotMatch(privateRpc, /published_config|is_published|published_at/);
});
