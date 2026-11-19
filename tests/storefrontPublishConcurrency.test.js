import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261119210000_storefront_publish_concurrency.sql', import.meta.url), 'utf8');

test('storefront publication serializes with draft saves and rejects stale device versions', () => {
  const publishRpc = migration.split('create or replace function private.publish_storefront_config(')[1]?.split('create or replace function private.publish_storefront_config(p_snapshot jsonb, p_version_label text default null)')[0] || '';
  assert.match(publishRpc, /p_expected_draft_updated_at timestamptz/);
  assert.match(publishRpc, /pg_advisory_xact_lock\(hashtextextended\('geostore:storefront-draft', 0\)\)/);
  assert.match(publishRpc, /p_expected_draft_updated_at is distinct from v_current_draft_updated_at/i);
  assert.match(publishRpc, /using errcode = '40001'/i);
  assert.match(publishRpc, /for update/i);
});

test('successful publication returns the new shared draft timestamp for subsequent saves', () => {
  assert.match(migration, /returning draft_updated_at into v_saved_draft_updated_at/i);
  assert.match(migration, /'draft_updated_at', v_saved_draft_updated_at/i);
  assert.match(app, /p_expected_draft_updated_at: storefrontDraftUpdatedAtRef\.current/);
  assert.match(app, /storefrontDraftUpdatedAtRef\.current = publishResult\.draft_updated_at/);
});

test('legacy publication calls fail closed because they cannot provide an observed draft version', () => {
  const legacyRpc = migration.split('create or replace function private.publish_storefront_config(p_snapshot jsonb, p_version_label text default null)')[1] || '';
  assert.match(legacyRpc, /raise exception[\s\S]*?using errcode = '40001'/i);
  assert.match(migration, /grant execute on function public\.publish_storefront_config\(jsonb, text, timestamptz\) to authenticated/i);
  assert.match(migration, /revoke all on function public\.publish_storefront_config\(jsonb, text\) from public, anon/i);
});

test('publish conflicts are explained to the admin without claiming publication succeeded', () => {
  const handler = app.split('const handlePublishStorefront')[1]?.split('const handle')[0] || app.slice(app.indexOf('const handlePublishStorefront'));
  assert.match(handler, /publishErrorCode === '40001'/);
  assert.match(handler, /სხვა მოწყობილობაზე მონახაზი შეიცვალა/);
  assert.match(handler, /ხელახლა გადაამოწმეთ ცვლილებები/);
});
