import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261119170000_storefront_draft_concurrency.sql', import.meta.url), 'utf8');
const compatibilityMigration = await readFile(new URL('../supabase/migrations/20261119200000_legacy_storefront_draft_save_compat.sql', import.meta.url), 'utf8');

test('storefront draft loader captures the shared version used by the next save', () => {
  assert.match(app, /select=draft_config,draft_updated_at/);
  assert.match(app, /storefrontDraftUpdatedAtRef\.current = typeof rows\?\.\[0\]\?\.draft_updated_at === 'string'/);
  assert.match(app, /p_expected_draft_updated_at: storefrontDraftUpdatedAtRef\.current/);
  assert.match(app, /const savedDraftUpdatedAt = savedDraftState\?\.draft_updated_at/);
});

test('draft RPC migration replaces the old signature and exposes only the authenticated invoker wrapper', () => {
  const publicDrop = migration.indexOf('DROP FUNCTION IF EXISTS public.save_storefront_draft(jsonb)');
  const privateDrop = migration.indexOf('DROP FUNCTION IF EXISTS private.save_storefront_draft(jsonb)');
  const privateCreate = migration.indexOf('CREATE OR REPLACE FUNCTION private.save_storefront_draft');
  const publicCreate = migration.indexOf('CREATE OR REPLACE FUNCTION public.save_storefront_draft');
  assert.ok(publicDrop >= 0 && privateDrop > publicDrop && privateCreate > privateDrop && publicCreate > privateCreate);
  assert.match(migration, /CREATE OR REPLACE FUNCTION private\.save_storefront_draft\([\s\S]*?SECURITY DEFINER/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.save_storefront_draft\([\s\S]*?SECURITY INVOKER/);
  assert.match(migration, /REVOKE ALL ON FUNCTION private\.save_storefront_draft\(jsonb, timestamptz\) FROM PUBLIC, anon/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION private\.save_storefront_draft\(jsonb, timestamptz\) TO authenticated/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.save_storefront_draft\(jsonb, timestamptz\) FROM PUBLIC, anon/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.save_storefront_draft\(jsonb, timestamptz\) TO authenticated/);
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
test('legacy deployed clients retain a temporary permission-checked compatibility RPC', () => {
  assert.match(compatibilityMigration, /CREATE OR REPLACE FUNCTION public\.save_storefront_draft\(\s*p_snapshot jsonb\s*\)/);
  assert.match(compatibilityMigration, /SECURITY INVOKER/);
  assert.match(compatibilityMigration, /SELECT config\.draft_updated_at[\s\S]*?config_key = 'storefront'/);
  assert.match(compatibilityMigration, /private\.save_storefront_draft\(\s*p_snapshot,[\s\S]*?\)/);
  assert.match(compatibilityMigration, /REVOKE ALL ON FUNCTION public\.save_storefront_draft\(jsonb\) FROM PUBLIC, anon/);
  assert.match(compatibilityMigration, /GRANT EXECUTE ON FUNCTION public\.save_storefront_draft\(jsonb\) TO authenticated/);
  assert.match(compatibilityMigration, /remove this overload[\\s\\S]*after all deployed clients use the two-argument RPC/i);
});

test('committed draft saves never clean up media when the response cannot be verified', () => {
  const saveHandler = app.split('const handleSaveStorefrontDraft')[1]?.split('const handleRestoreStorefrontVersion')[0] || '';
  assert.match(saveHandler, /let draftSaveCommitted = false/);
  assert.match(saveHandler, /draftSaveCommitted = true;[\s\S]*savedDraftState = await response\.json\(\)/);
  assert.match(saveHandler, /Number\.isFinite\(Date\.parse\(savedDraftUpdatedAt\)\)/);
  assert.match(saveHandler, /if \(!draftSaveCommitted && uploadedAssets\.length\)/);
  assert.match(saveHandler, /else if \(draftSaveCommitted && uploadedAssets\.length\)/);
});
