import test from 'node:test';
import assert from 'node:assert/strict';
import { collectReferencedStorefrontImageUrls } from '../src/utils/productImageCleanup.js';

test('collects banner, category and published storefront image URLs', () => {
  const refs = collectReferencedStorefrontImageUrls({
    banners: [{ image: 'https://cdn.example/banner.webp' }],
    categories: [{ image: 'https://cdn.example/category.png' }]
  });
  assert.deepEqual([...refs].sort(), [
    'https://cdn.example/banner.webp',
    'https://cdn.example/category.png'
  ]);
});

test('collects nested historical snapshot URLs and ignores non-HTTP values', () => {
  const refs = collectReferencedStorefrontImageUrls({
    snapshot: { hero: { desktopImage: 'https://cdn.example/old.webp' }, invalid: 'javascript:alert(1)' }
  });
  assert.deepEqual([...refs], ['https://cdn.example/old.webp']);
});

test('handles null values and cyclic objects safely', () => {
  const value = { image: 'https://cdn.example/safe.webp' };
  value.self = value;
  assert.deepEqual([...collectReferencedStorefrontImageUrls(null, value)], ['https://cdn.example/safe.webp']);
});


test('storefront uploads are tracked before the Storage request', async () => {
  const { readFile } = await import('node:fs/promises');
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const start = app.indexOf('const uploadStorefrontImage =');
  const end = app.indexOf('const cleanupStorefrontUploads =', start);
  assert.ok(start >= 0 && end > start);
  const upload = app.slice(start, end);
  const track = upload.indexOf('uploadedAssets.push({ path, publicUrl })');
  const request = upload.indexOf('await fetch(');
  assert.ok(track >= 0 && request > track, 'track the unique path before the network request');
  assert.equal((upload.match(/uploadedAssets\.push\(\{ path, publicUrl \}\)/g) || []).length, 1);
});

test('ambiguous storefront draft and publish HTTP failures retain uploaded images', async () => {
  const { readFile } = await import('node:fs/promises');
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const draftStart = app.indexOf('const handleSaveStorefrontDraft =');
  const publishStart = app.indexOf('const handlePublishStorefront =', draftStart);
  const draft = app.slice(draftStart, publishStart);
  const publishEnd = app.indexOf('useEffect(() =>', publishStart);
  const publish = app.slice(publishStart, publishEnd);
  assert.match(draft, /draftSaveRequestStarted = true;[\s\S]*?await fetch\(/);
  assert.equal((draft.match(/draftSaveRequestStarted = false;/g) || []).length, 1, 'only the initial false declaration is allowed');
  assert.match(draft, /if \(draftSaveRequestStarted\)[\s\S]*?uploaded assets were retained/i);
  assert.match(publish, /publishRequestStarted = true;[\s\S]*?await fetch\(/);
  assert.equal((publish.match(/publishRequestStarted = false;/g) || []).length, 1, 'only the initial false declaration is allowed');
  assert.match(publish, /if \(publishRequestStarted\)[\s\S]*?uploaded files rather than risk deleting assets/i);
});


test('storefront cleanup removes metadata only after Storage deletion succeeds or returns 404', async () => {
  const { readFile } = await import('node:fs/promises');
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const start = app.indexOf('const cleanupStorefrontUploads =');
  const end = app.indexOf('const DEFAULT_CATEGORIES =', start);
  assert.ok(start >= 0 && end > start);
  const cleanup = app.slice(start, end);
  const storageDelete = cleanup.indexOf("method: 'DELETE'");
  const metadataDelete = cleanup.indexOf('storefront_media?storage_path=eq.');
  assert.ok(storageDelete >= 0 && metadataDelete > storageDelete);
  assert.match(cleanup, /!storageResponse\.ok && storageResponse\.status !== 404/);
  assert.match(cleanup, /storefront\/categories\/|storefront\/banners\//);
});
