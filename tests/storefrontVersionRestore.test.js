import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261119190000_restore_storefront_version_to_draft.sql', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
const staffPermissions = await readFile(new URL('../supabase/migrations/20261117150000_staff_settings_permission.sql', import.meta.url), 'utf8');
const publishMigration = await readFile(new URL('../supabase/migrations/20261107083528_atomic_storefront_publish_and_append_only_versions.sql', import.meta.url), 'utf8');

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
  assert.doesNotMatch(rpc, /'snapshot', v_snapshot/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.restore_storefront_draft_from_version\(uuid, timestamptz\) FROM PUBLIC, anon/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.restore_storefront_draft_from_version\(uuid, timestamptz\) TO authenticated/);
});

test('published version comparison is read-only and compares the full draft snapshot', () => {
  assert.match(editor, /const flattenStorefrontSnapshot =/);
  assert.match(editor, /const compareStorefrontSnapshots =/);
  assert.ok(editor.includes('categories: safeCategories,'));
  assert.ok(editor.includes('banners: safeBanners,'));
  assert.ok(editor.includes('siteSettings: siteSettings || {}'));
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
test('version history is readable only by settings staff and append-only to browser clients', () => {
  assert.match(staffPermissions, /Staff with settings permission can read storefront versions/);
  assert.match(staffPermissions, /USING \(public\.has_staff_permission\('settings'\)\)/);
  assert.match(publishMigration, /revoke insert, update, delete on table public\.storefront_versions from authenticated/i);
  assert.match(publishMigration, /insert into public\.storefront_versions[\s\S]*returning id into v_version_id/i);
  assert.match(editor, /from\('storefront_versions'\)[\s\S]*limit\(20\)/);
  assert.match(editor, /if \(published === true\)[\s\S]*setVersionHistory\(Array\.isArray\(data\) \? data : \[\]\)/);
  assert.match(editor, /const versionInspectRequestRef = useRef\(0\)/);
  assert.match(editor, /versionInspectRequestRef\.current === requestId/);
  assert.match(editor, /versionInspectRequestRef\.current \+= 1/);
});

test('successful restore refreshes the shared timestamp and all storefront draft sections before a later save', () => {
  const restoreHandler = app.split('const handleRestoreStorefrontVersion')[1]?.split('const handlePublishStorefront')[0] || '';
  assert.match(restoreHandler, /storefrontDraftUpdatedAtRef\.current = result\.draft_updated_at/);
  assert.match(restoreHandler, /setCategoriesList\(restoredCategories\)/);
  assert.match(restoreHandler, /setBannersList\(restoredBanners\)/);
  assert.match(restoreHandler, /setSiteSettings\(restoredSettings\)/);
  assert.match(app, /p_expected_draft_updated_at: storefrontDraftUpdatedAtRef\.current/);
});
