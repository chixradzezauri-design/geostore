const normalizeOptions = (values) => {
  const list = Array.isArray(values) ? values : typeof values === 'string' ? values.split(',') : [];
  return [...new Set(list.map(value => String(value ?? '').trim()).filter(Boolean))];
};

// Accept both normalized frontend keys and raw Supabase/PostgREST keys.
export const getAvailableProductSizes = (product) => normalizeOptions(
  product?.availableSizes ?? product?.available_sizes
);

export const getAvailableProductColors = (product) => normalizeOptions(
  (product?.availableColors?.length ? product.availableColors : undefined) ??
  (product?.available_colors?.length ? product.available_colors : undefined) ??
  product?.colors
);

export const hasProductVariantOptions = (product) => (
  getAvailableProductSizes(product).length > 0 || getAvailableProductColors(product).length > 0
);
