import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAdminStorefrontSnapshot, normalizeRestorableStorefrontSnapshot } from '../src/utils/storefrontSnapshots.js';

const fallback = {
  categories: [{ id: 'public-category' }],
  banners: [{ id: 'public-banner' }],
  siteSettings: { storeName: 'GEOSTORE public' }
};

test('prefers the private draft over the published snapshot for the admin editor', () => {
  const result = resolveAdminStorefrontSnapshot({
    is_published: true,
    draft_config: {
      categories: [{ id: 'draft-category' }],
      banners: [{ id: 'draft-banner' }],
      siteSettings: { storeName: 'GEOSTORE draft' }
    },
    published_config: {
      categories: [{ id: 'published-category' }],
      banners: [],
      siteSettings: { storeName: 'GEOSTORE published' }
    }
  }, fallback);

  assert.equal(result.categories[0].id, 'draft-category');
  assert.equal(result.banners[0].id, 'draft-banner');
  assert.equal(result.siteSettings.storeName, 'GEOSTORE draft');
});

test('uses published snapshot when no draft exists and the config is published', () => {
  const result = resolveAdminStorefrontSnapshot({
    is_published: true,
    draft_config: null,
    published_config: {
      categories: [{ id: 'published-category' }],
      banners: [],
      siteSettings: { storeName: 'GEOSTORE published' }
    }
  }, fallback);

  assert.equal(result.categories[0].id, 'published-category');
  assert.deepEqual(result.banners, []);
  assert.equal(result.siteSettings.storeName, 'GEOSTORE published');
});

test('preserves the existing public fallback when no saved snapshot exists', () => {
  assert.deepEqual(resolveAdminStorefrontSnapshot(null, fallback), fallback);
});

test('falls back safely for malformed snapshot sections', () => {
  const result = resolveAdminStorefrontSnapshot({
    draft_config: {
      categories: 'invalid',
      banners: null,
      siteSettings: []
    }
  }, fallback);

  assert.deepEqual(result, fallback);
});


const validHistoricalSnapshot = () => ({
  categories: [
    { id: 'root', name: 'ტანსაცმელი', parentId: null, image: '' },
    { id: 'child', name: 'ქურთუკები', parentId: 'root', image: '' }
  ],
  banners: [{ id: 'banner-1', title: 'ახალი კოლექცია', subtitle: '', image: '', link: 'https://geostore.example/shop' }],
  siteSettings: { storeName: 'GEOSTORE', topBarText: '', heroTitle: '', heroSubtitle: '' }
});

test('normalizes a valid historical snapshot without mutating its source', () => {
  const source = validHistoricalSnapshot();
  const restored = normalizeRestorableStorefrontSnapshot(source);

  assert.notEqual(restored, source);
  assert.notEqual(restored.categories, source.categories);
  assert.equal(restored.categories[1].parentId, 'root');
  assert.equal(restored.banners[0].link, 'https://geostore.example/shop');
  assert.equal(source.categories[0].name, 'ტანსაცმელი');
});

test('rejects malformed or duplicate historical categories before restore', () => {
  const snapshot = validHistoricalSnapshot();
  snapshot.categories.push({ id: 'child', name: 'დუბლიკატი', parentId: null });
  assert.throws(() => normalizeRestorableStorefrontSnapshot(snapshot), /ID ცარიელია ან დუბლირებულია/);
});

test('rejects invalid banner destinations and oversized settings', () => {
  const badLink = validHistoricalSnapshot();
  badLink.banners[0].link = 'javascript:alert(1)';
  assert.throws(() => normalizeRestorableStorefrontSnapshot(badLink), /არასწორ ბმულს/);

  const longSetting = validHistoricalSnapshot();
  longSetting.siteSettings.heroSubtitle = 'x'.repeat(241);
  assert.throws(() => normalizeRestorableStorefrontSnapshot(longSetting), /დასაშვებ სიგრძეს/);
});

test('rejects invalid category parent references and malformed snapshot sections', () => {
  const badParent = validHistoricalSnapshot();
  badParent.categories[1].parentId = 'missing';
  assert.throws(() => normalizeRestorableStorefrontSnapshot(badParent), /არასწორ მთავარ კატეგორიას/);
  assert.throws(() => normalizeRestorableStorefrontSnapshot({ categories: [], banners: [], siteSettings: [] }), /პარამეტრები არასწორია/);
});
