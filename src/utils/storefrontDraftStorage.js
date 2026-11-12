const DRAFT_STORAGE_KEYS = Object.freeze({
  categories: 'geostore_cats_draft',
  banners: 'geostore_banners_draft',
  siteSettings: 'geostore_site_settings_draft'
});

export const saveStorefrontDraftSection = (storage, section, value) => {
  if (!storage || typeof storage.setItem !== 'function') {
    throw new Error('Storefront draft storage is unavailable.');
  }

  const key = DRAFT_STORAGE_KEYS[section];
  if (!key) throw new Error('Unknown storefront draft section.');

  if (section === 'categories' || section === 'banners') {
    if (!Array.isArray(value)) {
      throw new Error(`Storefront ${section} draft must be an array.`);
    }
  } else if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new Error('Storefront site settings draft must be an object.');
  }

  storage.setItem(key, JSON.stringify(value));
  return value;
};

export const saveStorefrontCategoryDraft = (storage, categories) =>
  saveStorefrontDraftSection(storage, 'categories', categories);
