import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const publishMigration = await readFile(new URL('../supabase/migrations/20261107083528_atomic_storefront_publish_and_append_only_versions.sql', import.meta.url), 'utf8');
const publicReadMigration = await readFile(new URL('../supabase/migrations/20261109151806_restrict_public_storefront_config_to_published_fields.sql', import.meta.url), 'utf8');
const draftMigration = await readFile(new URL('../supabase/migrations/20261119170000_storefront_draft_concurrency.sql', import.meta.url), 'utf8');
const restoreMigration = await readFile(new URL('../supabase/migrations/20261119190000_restore_storefront_version_to_draft.sql', import.meta.url), 'utf8');

test('admin editor loads only the shared draft through an authenticated request', () => {
  const adminLoader = app.split('const loadStorefrontDraft = async () => {')[1]?.split('};')[0] || '';
  assert.match(adminLoader, /select=draft_config,draft_updated_at/);
  assert.match(adminLoader, /getSupabaseHeaders\(\{ authenticated: true \}\)/);
});

test('public storefront loader reads only the published snapshot and never overwrites an admin draft', () => {
  const publicLoader = app.split('const loadPublishedStorefront = async () => {')[1]?.split('};')[0] || '';
  assert.match(publicLoader, /if \(hasSettingsAccess\) return undefined/);
  assert.match(publicLoader, /select=published_config,is_published/);
  assert.match(publicLoader, /rows\?\.\[0\]\?\.is_published \? rows\[0\]\.published_config : null/);
  assert.doesNotMatch(publicLoader, /draft_config/);
});

test('anonymous visitors receive column-level access only to published storefront fields', () => {
  assert.match(publicReadMigration, /revoke select on table public\.storefront_config from anon/i);
  assert.match(publicReadMigration, /grant select \([\s\S]*published_config[\s\S]*is_published[\s\S]*\) on table public\.storefront_config to anon/i);
  assert.doesNotMatch(publicReadMigration, /grant select \([^)]*draft_config/i);
});

test('saving or restoring a draft cannot mutate the currently published snapshot', () => {
  const saveRpc = draftMigration.split('create or replace function private.save_storefront_draft')[1] || '';
  const restoreRpc = restoreMigration.split('create or replace function private.restore_storefront_draft_from_version')[1] || '';
  assert.match(saveRpc, /set draft_config = p_snapshot/i);
  assert.doesNotMatch(saveRpc, /set[\s\S]{0,200}published_config\s*=/i);
  assert.match(restoreRpc, /set draft_config = v_snapshot/i);
  assert.doesNotMatch(restoreRpc, /set[\s\S]{0,200}published_config\s*=/i);
});

test('publishing updates the live snapshot and its matching draft atomically with history', () => {
  assert.match(publishMigration, /set draft_config = excluded\.draft_config,[\s\S]*published_config = excluded\.published_config,[\s\S]*is_published = true/i);
  assert.match(publishMigration, /insert into public\.storefront_versions/i);
  assert.match(publishMigration, /returning id into v_version_id/i);
});
