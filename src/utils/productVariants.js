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

export const getCustomProductVariants = (product) => {
  const raw = Array.isArray(product?.variants) ? product.variants : [];
  return raw.flatMap((variant) => {
    if (!variant || typeof variant !== 'object' || Array.isArray(variant)) return [];
    const id = String(variant.id ?? '').trim();
    const name = String(variant.name ?? '').trim();
    const priceGEL = Number(variant.priceGEL ?? variant.price_gel);
    const stock = Number(variant.stock);
    if (!id || id.length > 120 || !name || name.length > 80 || !Number.isFinite(priceGEL) || priceGEL < 0 || !Number.isSafeInteger(stock) || stock < 0) return [];
    return [{ ...variant, id, name, priceGEL, stock }];
  });
};
export const getAvailableCustomProductVariants = (product) => getCustomProductVariants(product).filter(v => v.stock > 0);
export const getCustomProductVariant = (product, variantId) => getCustomProductVariants(product).find(v => v.id === String(variantId ?? '').trim()) || null;
export const hasCustomProductVariants = (product) => Array.isArray(product?.variants) && product.variants.length > 0;
export const getProductAvailableStock = (product) => {
  if (Array.isArray(product?.variants) && product.variants.length > 0) {
    return getCustomProductVariants(product).reduce((total, variant) => total + variant.stock, 0);
  }
  return Math.max(0, Number(product?.stock) || 0);
};
export const hasProductVariantOptions = (product) => (
  getAvailableProductSizes(product).length > 0 || getAvailableProductColors(product).length > 0 || hasCustomProductVariants(product)
);
