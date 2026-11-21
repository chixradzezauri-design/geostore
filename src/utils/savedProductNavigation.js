// Find the current catalog record, never a potentially stale wish/compare snapshot.
export const findCurrentSavedProduct = (catalog, savedProduct) => {
  const id = savedProduct?.id;
  if (id === null || id === undefined || String(id).trim() === '') return null;
  if (!Array.isArray(catalog)) return null;
  return catalog.find(product => product && String(product.id) === String(id)) || null;
};
