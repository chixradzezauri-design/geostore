import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261119190000_restore_storefront_version_to_draft.sql', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');

test('storefront version restore is permission-checked and uses optimistic concurrency', () => {
  const rpc = migration.split('CREATE OR REPLACE FUNCTION private.restore_storefront_draft_from_version')[1]?.split('CREATE OR REPLACE FUNCTION public.restore_storefront_draft_from_version')[0] || '';
  assert.match(rpc, /public\.has_staff_permission\('settings'\)/);
  assert.match(rpc, /pg_advisory_xact_lock/);
  assert.match(rpc, /p_expected_draft_updated_at IS DISTINCT FROM v_current_updated_at/);
  assert.match(rpc, /ERRCODE = '40001'/);
  assert.match(rpc, /version\.config_key = 'storefront'/);
  assert.match(rpc, /jsonb_typeof\(v_snapshot->'categories'\)/);
  assert.match(rpc, /octet_length\(v_snapshot::text\) > 4194304/);
});

test('restoring a storefront version updates draft fields only and never publishes', () => {
  const rpc = migration.split('CREATE OR REPLACE FUNCTION private.restore_storefront_draft_from_version')[1]?.split('CREATE OR REPLACE FUNCTION public.restore_storefront_draft_from_version')[0] || '';
  const update = rpc.split('UPDATE public.storefront_config')[1] || '';
  assert.match(update, /draft_config = v_snapshot/);
  assert.match(update, /updated_by = auth\.uid\(\)/);
  assert.match(update, /draft_updated_at = GREATEST/);
  assert.doesNotMatch(update, /published_config|is_published|published_at/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.restore_storefront_draft_from_version\(uuid, timestamptz\) FROM PUBLIC, anon/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.restore_storefront_draft_from_version\(uuid, timestamptz\) TO authenticated/);
});

test('published version comparison is read-only and compares the full draft snapshot', () => {
  assert.match(editor, /const flattenStorefrontSnapshot =/);
  assert.match(editor, /const compareStorefrontSnapshots =/);
  assert.match(editor, /categories: safeCategories, banners: safeBanners, siteSettings: siteSettings/);
  assert.match(editor, /მიმდინარე მონახაზთან შედარება/);
  assert.match(editor, /განსხვავება არ არის/);
  assert.match(editor, /გამოქვეყნებული:/);
  assert.match(editor, /მონახაზი:/);
  assert.match(editor, /selectedVersionDiff\.differences\.map/);
  assert.match(editor, /differences\.slice\(0, 60\)/);
});

test('storefront history UI loads immutable versions and restore remains a draft-only action', () => {
  assert.match(editor, /from\('storefront_versions'\)/);
  assert.match(editor, /გამოქვეყნებული ვერსიების ისტორია/);
  assert.match(editor, /ამ ვერსიის მონახაზში აღდგენა/);
  assert.match(editor, /გამოქვეყნებული საიტი უცვლელი დარჩება/);
  assert.match(admin, /onRestoreStorefrontVersion/);
  assert.match(app, /rpc\/restore_storefront_draft_from_version/);
  assert.match(app, /storefrontDraftUpdatedAtRef\.current/);
  assert.match(app, /ძველი ვერსია აღდგა საერთო მონახაზში/);
});
