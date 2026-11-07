const WARDROBE_STORAGE_PREFIX = 'geostore_digital_wardrobe';

export const getWardrobeStorageKey = (userId) => {
  const ownerId = String(userId ?? '').trim();
  return ownerId
    ? `${WARDROBE_STORAGE_PREFIX}:user:${ownerId}`
    : `${WARDROBE_STORAGE_PREFIX}:guest`;
};

// Legacy unscoped wardrobe data is deliberately not read: its account owner
// cannot be determined safely on a shared device.
export const readWardrobeItems = (userId, storage) => {
  try {
    const targetStorage = storage ?? globalThis.localStorage;
    const saved = targetStorage?.getItem?.(getWardrobeStorageKey(userId));
    if (typeof saved !== 'string') return null;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeWardrobeItems = (userId, items, storage) => {
  try {
    const targetStorage = storage ?? globalThis.localStorage;
    if (typeof targetStorage?.setItem !== 'function') return false;
    targetStorage.setItem(
      getWardrobeStorageKey(userId),
      JSON.stringify(Array.isArray(items) ? items : [])
    );
    return true;
  } catch {
    return false;
  }
};
