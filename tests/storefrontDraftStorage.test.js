import test from 'node:test';
import assert from 'node:assert/strict';
import { saveStorefrontCategoryDraft, saveStorefrontDraftSection } from '../src/utils/storefrontDraftStorage.js';

test('saves category drafts without overwriting the public category cache', () => {
  const values = new Map([
    ['geostore_cats', JSON.stringify([{ id: 'published-1', name: 'Published' }])]
  ]);
  const storage = { setItem: (key, value) => values.set(key, value) };
  const draft = [{ id: 'draft-1', name: 'Draft category' }];

  assert.equal(saveStorefrontCategoryDraft(storage, draft), draft);
  assert.deepEqual(JSON.parse(values.get('geostore_cats')), [{ id: 'published-1', name: 'Published' }]);
  assert.deepEqual(JSON.parse(values.get('geostore_cats_draft')), draft);
});

test('persists banner and site-setting drafts in isolated keys', () => {
  const values = new Map([
    ['geostore_banners', JSON.stringify([{ id: 'published-banner' }])],
    ['geostore_site_settings', JSON.stringify({ storeName: 'Published Store' })]
  ]);
  const storage = { setItem: (key, value) => values.set(key, value) };
  const banners = [{ id: 'draft-banner', title: 'Draft banner' }];
  const settings = { storeName: 'Draft Store' };

  saveStorefrontDraftSection(storage, 'banners', banners);
  saveStorefrontDraftSection(storage, 'siteSettings', settings);

  assert.deepEqual(JSON.parse(values.get('geostore_banners')), [{ id: 'published-banner' }]);
  assert.deepEqual(JSON.parse(values.get('geostore_site_settings')), { storeName: 'Published Store' });
  assert.deepEqual(JSON.parse(values.get('geostore_banners_draft')), banners);
  assert.deepEqual(JSON.parse(values.get('geostore_site_settings_draft')), settings);
});

test('rejects invalid draft sections and values without writing', () => {
  const values = new Map();
  const storage = { setItem: (key, value) => values.set(key, value) };

  assert.throws(() => saveStorefrontDraftSection(storage, 'unknown', []), /Unknown storefront draft section/);
  assert.throws(() => saveStorefrontDraftSection(storage, 'categories', null), /must be an array/);
  assert.throws(() => saveStorefrontDraftSection(storage, 'banners', {}), /must be an array/);
  assert.throws(() => saveStorefrontDraftSection(storage, 'siteSettings', []), /must be an object/);
  assert.throws(() => saveStorefrontDraftSection(null, 'categories', []), /unavailable/);
  assert.equal(values.size, 0);
});

test('does not claim success when local draft storage fails', () => {
  const storage = {
    setItem() {
      throw new Error('QuotaExceededError');
    }
  };

  assert.throws(
    () => saveStorefrontCategoryDraft(storage, [{ id: 'draft-2' }]),
    /QuotaExceededError/
  );
});
