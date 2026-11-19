import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('shared storefront draft refreshes on focus, visibility and a bounded polling interval', () => {
  const refresh = app.split('const refreshSharedStorefrontDraft = async () =>')[1]?.split('const handleVisibilityChange')[0] || '';
  assert.match(refresh, /draft_updated_at/);
  assert.match(refresh, /remoteUpdatedAt === storefrontDraftUpdatedAtRef\.current/);
  assert.match(app, /window\.addEventListener\('focus', refreshSharedStorefrontDraft\)/);
  assert.match(app, /document\.addEventListener\('visibilitychange', handleVisibilityChange\)/);
  assert.match(app, /window\.setInterval\(\(\) => void refreshSharedStorefrontDraft\(\), 30000\)/);
});

test('cross-device refresh never overwrites local unsaved changes or an active save/publish', () => {
  const refresh = app.split('const refreshSharedStorefrontDraft = async () =>')[1]?.split('const handleVisibilityChange')[0] || '';
  assert.match(refresh, /storefrontDraftLocalDirtyRef\.current/);
  assert.match(refresh, /storefrontSaveLock\.current \|\| storefrontPublishLock\.current/);
  assert.match(refresh, /latestSnapshot !== storefrontDraftBaselineRef\.current/);
  assert.match(app, /storefrontDraftLocalDirtyRef\.current = currentSnapshot !== storefrontDraftBaselineRef\.current/);
});

test('successful save and version restore advance the shared baseline and timestamp together', () => {
  const save = app.split('const handleSaveStorefrontDraft')[1]?.split('const handleRestoreStorefrontVersion')[0] || '';
  const restore = app.split('const handleRestoreStorefrontVersion')[1]?.split('const handlePublishStorefront')[0] || '';
  assert.match(save, /storefrontDraftBaselineRef\.current = JSON\.stringify\(\{ categories: draftCategories, banners: draftBanners, siteSettings: draftSiteSettings \}\)/);
  assert.match(save, /storefrontDraftLocalDirtyRef\.current = editsArrivedDuringSave/);
  assert.match(restore, /storefrontDraftBaselineRef\.current = JSON\.stringify\(\{ categories: restoredCategories, banners: restoredBanners, siteSettings: restoredSettings \}\)/);
  assert.match(restore, /storefrontDraftLocalDirtyRef\.current = false/);
  assert.match(restore, /p_expected_draft_updated_at: storefrontDraftUpdatedAtRef\.current/);
});

test('version restore rejects unsaved local changes before calling the server', () => {
  const restore = app.split('const handleRestoreStorefrontVersion')[1]?.split('const handlePublishStorefront')[0] || '';
  assert.match(restore, /storefrontDraftLocalDirtyRef\.current/);
  assert.match(restore, /JSON\.stringify\(\{ categories, banners: bannersList, siteSettings \}\) !== storefrontDraftBaselineRef\.current/);
  assert.ok(restore.indexOf('storefrontDraftLocalDirtyRef.current') < restore.indexOf('rpc/restore_storefront_draft_from_version'));
});

test('successful version restore resets editor history without marking the restored draft dirty', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  const restore = editor.split('const restoreSelectedStorefrontVersion')[1]?.split('const activeResponsive')[0] || '';
  assert.match(restore, /localDesignDirtyRef\.current = false/);
  assert.match(restore, /historyRef\.current = \[restoredDesign\]/);
  assert.match(restore, /historyIndexRef\.current = 0/);
  assert.match(restore, /setDesign\(restoredDesign\)/);
  assert.doesNotMatch(restore, /commitDesign\(/);
});

test('late initial draft hydration preserves edits made while loading', () => {
  const initial = app.split('const loadStorefrontDraft = async () =>')[1]?.split('}, [hasSettingsAccess]')[0] || '';
  assert.match(initial, /storefrontCurrentSnapshotRef\.current !== snapshotBeforeLoad/);
  assert.match(initial, /storefrontSaveLock\.current \|\| storefrontPublishLock\.current/);
  assert.ok(initial.indexOf('storefrontCurrentSnapshotRef.current !== snapshotBeforeLoad') < initial.indexOf('setCategoriesList(sharedSnapshot.categories)'));
});

test('in-flight shared refresh rechecks the active effect and latest editor snapshot', () => {
  const refresh = app.split('const refreshSharedStorefrontDraft = async () =>')[1]?.split('const handleVisibilityChange')[0] || '';
  assert.match(refresh, /const latestSnapshot = storefrontCurrentSnapshotRef\.current/);
  assert.match(refresh, /if \(!active \|\| storefrontDraftLocalDirtyRef\.current/);
  assert.match(app, /storefrontCurrentSnapshotRef\.current = JSON\.stringify\(\{ categories, banners: bannersList, siteSettings \}\)/);
});

test('successful publication advances the local draft baseline as well as its timestamp', () => {
  const publish = app.split('const handlePublishStorefront = async () =>')[1]?.split('  useEffect(() => {')[0] || '';
  assert.match(publish, /storefrontDraftUpdatedAtRef\.current = publishResult\.draft_updated_at/);
  assert.match(publish, /storefrontDraftBaselineRef\.current = JSON\.stringify\(\{ categories: publishedCategories, banners: publishedBanners, siteSettings: publishedSiteSettings \}\)/);
  assert.match(publish, /storefrontDraftLocalDirtyRef\.current = editsArrivedDuringPublish/);
});

test('publish rejects a stale editor snapshot before sending the publication RPC', () => {
  const publish = app.split('const handlePublishStorefront = async () =>')[1]?.split('  useEffect(() => {')[0] || '';
  assert.match(publish, /const publishEditorSnapshotAtStart = storefrontCurrentSnapshotRef\.current/);
  assert.match(publish, /storefrontCurrentSnapshotRef\.current !== publishEditorSnapshotAtStart/);
  assert.ok(publish.indexOf('storefrontCurrentSnapshotRef.current !== publishEditorSnapshotAtStart') < publish.indexOf('publishRequestStarted = true'));
  assert.match(publish, /if \(!storefrontPublished && uploadedAssets\.length\)/);
});

test('draft save rejects obsolete snapshots before the save RPC', () => {
  const save = app.split('const handleSaveStorefrontDraft = async (')[1]?.split('const handlePublishStorefront = async () =>')[0] || '';
  assert.match(save, /const saveEditorSnapshotAtStart = storefrontCurrentSnapshotRef\.current/);
  assert.match(save, /storefrontCurrentSnapshotRef\.current !== saveEditorSnapshotAtStart/);
  assert.ok(save.indexOf('storefrontCurrentSnapshotRef.current !== saveEditorSnapshotAtStart') < save.indexOf('rpc/save_storefront_draft'));
  assert.match(save, /if \(!draftSaveCommitted && uploadedAssets\.length\)/);
});

test('edits made during an in-flight save stay in the editor after server commit', () => {
  const save = app.split('const handleSaveStorefrontDraft = async (')[1]?.split('const handleRestoreStorefrontVersion = async (')[0] || '';
  assert.match(save, /const editsArrivedDuringSave = storefrontCurrentSnapshotRef\.current !== saveEditorSnapshotAtStart/);
  assert.match(save, /storefrontDraftLocalDirtyRef\.current = editsArrivedDuringSave/);
  assert.ok(save.indexOf('if (editsArrivedDuringSave)') < save.indexOf('setCategoriesList(draftCategories)'));
});

test('edits made during an in-flight publish stay unpublished in the editor', () => {
  const publish = app.split('const handlePublishStorefront = async () =>')[1]?.split('  useEffect(() => {')[0] || '';
  assert.match(publish, /const editsArrivedDuringPublish = storefrontCurrentSnapshotRef\.current !== publishEditorSnapshotAtStart/);
  assert.match(publish, /storefrontDraftLocalDirtyRef\.current = editsArrivedDuringPublish/);
  assert.ok(publish.indexOf('if (editsArrivedDuringPublish)') < publish.indexOf('setCategoriesList(publishedCategories)'));
});
