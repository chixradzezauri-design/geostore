const normalizeOptions = (values) => {
  const list = Array.isArray(values) ? values : typeof values === 'string' ? values.split(',') : [];
  return [...new Set(list.map(value => String(value ?? '').trim()).filter(Boolean))];
};

// Accept both normalized frontend keys and raw Supabase/PostgREST keys.
export const getAvailableProductSizes = (product) => {
  const normalized = normalizeOptions(product?.availableSizes);
  return normalized.length ? normalized : normalizeOptions(product?.available_sizes);
};

export const getAvailableProductColors = (product) => {
  const normalized = normalizeOptions(product?.availableColors);
  if (normalized.length) return normalized;
  const raw = normalizeOptions(product?.available_colors);
  return raw.length ? raw : normalizeOptions(product?.colors);
};

export const getCustomProductVariants = (product) => {
  const raw = Array.isArray(product?.variants) ? product.variants : [];
  if (raw.length > 50) return [];
  const normalized = raw.flatMap((variant) => {
    if (!variant || typeof variant !== 'object' || Array.isArray(variant)) return [];
    const id = String(variant.id ?? '').trim();
    const name = String(variant.name ?? '').trim();
    const rawPrice = variant.priceGEL ?? variant.price_gel;
    const rawStock = variant.stock;
    const priceGEL = Number(rawPrice);
    const stock = Number(rawStock);
    if (!id || id.length > 80 || !name || name.length > 80 ||
        rawPrice == null || String(rawPrice).trim() === '' ||
        rawStock == null || String(rawStock).trim() === '' ||
        !Number.isFinite(priceGEL) || priceGEL < 0 ||
        !Number.isSafeInteger(stock) || stock < 0) return [];
    return [{ ...variant, id, name, priceGEL, stock }];
  });
  const ids = new Set();
  const names = new Set();
  for (const variant of normalized) {
    const normalizedName = variant.name.toLocaleLowerCase();
    if (ids.has(variant.id) || names.has(normalizedName)) return [];
    ids.add(variant.id);
    names.add(normalizedName);
  }
  return normalized;
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

export const getProductStartingPrice = (product) => {
  if (Array.isArray(product?.variants) && product.variants.length > 0) {
    const variants = getCustomProductVariants(product);
    const availableVariants = variants.filter(variant => variant.stock > 0);
    const priceSource = availableVariants.length ? availableVariants : variants;
    const prices = priceSource.map(variant => variant.priceGEL);
    return prices.length ? Math.min(...prices) : null;
  }
  const rawPrice = product?.priceGEL ?? product?.price_gel;
  if (rawPrice == null || String(rawPrice).trim() === '') return null;
  const price = Number(rawPrice);
  return Number.isFinite(price) && price >= 0 ? price : null;
};
export const hasProductVariantOptions = (product) => (
  getAvailableProductSizes(product).length > 0 || getAvailableProductColors(product).length > 0 || hasCustomProductVariants(product)
);
