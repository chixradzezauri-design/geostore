const normalizeOptions = (values) => {
  const list = Array.isArray(values) ? values : typeof values === 'string' ? values.split(',') : [];
  return [...new Set(list.map(value => String(value ?? '').trim()).filter(Boolean))];
};

// Accept both normalized frontend keys and raw Supabase/PostgREST keys.
// For size/color inventory products, the variant matrix is the source of truth.
// This avoids stale or missing available_sizes / available_colors fields hiding real options
// or showing options that do not exist in the saved inventory matrix.
export const getAvailableProductSizes = (product) => {
  const inventoryRows = Array.isArray(product?.variants)
    ? product.variants.filter(variant => variant?.variantType === 'size_color')
    : [];
  if (inventoryRows.length > 0) {
    return normalizeOptions(inventoryRows.map(variant => variant?.size));
  }
  return normalizeOptions(product?.availableSizes ?? product?.available_sizes);
};

export const getAvailableProductColors = (product) => {
  const inventoryRows = Array.isArray(product?.variants)
    ? product.variants.filter(variant => variant?.variantType === 'size_color')
    : [];
  if (inventoryRows.length > 0) {
    return normalizeOptions(inventoryRows.map(variant => variant?.color));
  }
  return normalizeOptions(
    (product?.availableColors?.length ? product.availableColors : undefined) ??
    (product?.available_colors?.length ? product.available_colors : undefined) ??
    product?.colors
  );
};

const isSizeColorInventoryRow = (variant) => (
  variant && typeof variant === 'object' && !Array.isArray(variant) &&
  variant.variantType === 'size_color'
);

export const getSizeColorInventoryVariants = (product) => {
  const raw = Array.isArray(product?.variants) ? product.variants : [];
  return raw.flatMap((variant) => {
    if (!isSizeColorInventoryRow(variant)) return [];
    const id = String(variant.id ?? '').trim();
    const name = String(variant.name ?? '').trim();
    const size = String(variant.size ?? '').trim() || null;
    const color = String(variant.color ?? '').trim() || null;
    const priceGEL = Number(variant.priceGEL ?? variant.price_gel);
    const stock = Number(variant.stock);
    if (!id || id.length > 120 || !name || name.length > 80 ||
        (!size && !color) || !Number.isFinite(priceGEL) || priceGEL < 0 ||
        !Number.isSafeInteger(stock) || stock < 0) return [];
    return [{ ...variant, id, name, size, color, priceGEL, stock, variantType: 'size_color' }];
  });
};

export const hasSizeColorInventory = (product) => (
  Array.isArray(product?.variants) && product.variants.some(isSizeColorInventoryRow)
);

export const getProductSizeColorVariant = (product, size, color) => {
  const normalizedSize = String(size ?? '').trim() || null;
  const normalizedColor = String(color ?? '').trim() || null;
  return getSizeColorInventoryVariants(product).find((variant) =>
    variant.size === normalizedSize && variant.color === normalizedColor
  ) || null;
};

export const getAvailableSizeColorSizes = (product, color) => {
  const normalizedColor = String(color ?? '').trim() || null;
  const variants = getSizeColorInventoryVariants(product);
  return [...new Set(variants
    .filter(variant => variant.stock > 0 && (!normalizedColor || variant.color === normalizedColor))
    .map(variant => variant.size)
    .filter(Boolean))];
};

export const getAvailableSizeColorColors = (product, size) => {
  const normalizedSize = String(size ?? '').trim() || null;
  const variants = getSizeColorInventoryVariants(product);
  return [...new Set(variants
    .filter(variant => variant.stock > 0 && (!normalizedSize || variant.size === normalizedSize))
    .map(variant => variant.color)
    .filter(Boolean))];
};

export const getFirstAvailableSizeColorVariant = (product) => (
  getSizeColorInventoryVariants(product).find(variant => variant.stock > 0) || null
);

export const getCustomProductVariants = (product) => {
  const raw = Array.isArray(product?.variants) ? product.variants : [];
  return raw.flatMap((variant) => {
    if (!variant || typeof variant !== 'object' || Array.isArray(variant) || isSizeColorInventoryRow(variant)) return [];
    const id = String(variant.id ?? '').trim();
    const name = String(variant.name ?? '').trim();
    const rawPrice = variant.priceGEL ?? variant.price_gel;
    const rawStock = variant.stock;
    const priceGEL = Number(rawPrice);
    const stock = Number(rawStock);
    if (!id || id.length > 120 || !name || name.length > 80 ||
        rawPrice == null || String(rawPrice).trim() === '' ||
        rawStock == null || String(rawStock).trim() === '' ||
        !Number.isFinite(priceGEL) || priceGEL < 0 ||
        !Number.isSafeInteger(stock) || stock < 0) return [];
    return [{ ...variant, id, name, priceGEL, stock }];
  });
};
export const getAvailableCustomProductVariants = (product) => getCustomProductVariants(product).filter(v => v.stock > 0);
export const getCustomProductVariant = (product, variantId) => getCustomProductVariants(product).find(v => v.id === String(variantId ?? '').trim()) || null;
export const hasCustomProductVariants = (product) => (
  Array.isArray(product?.variants) && product.variants.some(variant => !isSizeColorInventoryRow(variant))
);
export const getProductAvailableStock = (product) => {
  if (Array.isArray(product?.variants) && product.variants.length > 0) {
    return [
      ...getCustomProductVariants(product),
      ...getSizeColorInventoryVariants(product)
    ].reduce((total, variant) => total + variant.stock, 0);
  }
  return Math.max(0, Number(product?.stock) || 0);
};

export const getProductStartingPrice = (product) => {
  if (hasCustomProductVariants(product)) {
    const prices = getCustomProductVariants(product).map(variant => variant.priceGEL);
    return prices.length ? Math.min(...prices) : null;
  }
  if (hasSizeColorInventory(product)) {
    const rawPrice = product?.priceGEL ?? product?.price_gel;
    const price = Number(rawPrice);
    return rawPrice != null && String(rawPrice).trim() !== '' && Number.isFinite(price) && price >= 0 ? price : null;
  }
  if (Array.isArray(product?.variants) && product.variants.length > 0) return null;
  const rawPrice = product?.priceGEL ?? product?.price_gel;
  if (rawPrice == null || String(rawPrice).trim() === '') return null;
  const price = Number(rawPrice);
  return Number.isFinite(price) && price >= 0 ? price : null;
};
export const hasProductVariantOptions = (product) => (
  getAvailableProductSizes(product).length > 0 ||
  getAvailableProductColors(product).length > 0 ||
  hasCustomProductVariants(product) ||
  hasSizeColorInventory(product)
);
