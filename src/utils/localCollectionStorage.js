// Persist browser-local admin collections before updating UI state.
// This deliberately does not imply cross-device synchronization or server authorization.
export const saveLocalCollection = (storage, key, rows) => {
  if (!storage || typeof storage.setItem !== 'function') {
    throw new TypeError('Browser storage is unavailable.');
  }
  if (typeof key !== 'string' || !key.trim()) {
    throw new TypeError('A storage key is required.');
  }
  if (!Array.isArray(rows)) {
    throw new TypeError('Local collection must be an array.');
  }

  const serialized = JSON.stringify(rows);
  if (typeof serialized !== 'string') {
    throw new TypeError('Local collection could not be serialized.');
  }
  storage.setItem(key, serialized);
  return rows;
};
