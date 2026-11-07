const normalizeOptions = (values) => {
  const list = Array.isArray(values) ? values : typeof values === 'string' ? values.split(',') : [];
  return [...new Set(list.map(value => String(value ?? '').trim()).filter(Boolean))];
};

export const getAvailableProductSizes = (product) => normalizeOptions(product?.availableSizes);

export const getAvailableProductColors = (product) => normalizeOptions(
  product?.availableColors?.length ? product.availableColors : product?.colors
);

export const hasProductVariantOptions = (product) => (
  getAvailableProductSizes(product).length > 0 || getAvailableProductColors(product).length > 0
);
