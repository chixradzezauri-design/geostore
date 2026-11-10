export const validateProductVariants = (variants) => {
  if (!Array.isArray(variants) || variants.length > 50) {
    return { valid: false, reason: 'count' };
  }

  const seenIds = new Set();
  for (const variant of variants) {
    if (!variant || typeof variant !== 'object' || Array.isArray(variant)) {
      return { valid: false, reason: 'shape' };
    }

    const id = String(variant.id ?? '').trim();
    const name = String(variant.name ?? '').trim();
    const price = Number(variant.priceGEL ?? variant.price_gel);
    const stock = Number(variant.stock);

    if (!id || id.length > 80 || seenIds.has(id) || !name || name.length > 80) {
      return { valid: false, reason: 'identity' };
    }
    seenIds.add(id);

    if (!Number.isFinite(price) || price < 0 || price > 1000000000 ||
        !/^\d+(?:\.\d{1,2})?$/.test(String(variant.priceGEL ?? variant.price_gel ?? '').trim())) {
      return { valid: false, reason: 'price' };
    }

    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1000000) {
      return { valid: false, reason: 'stock' };
    }
  }

  return { valid: true };
};


export const validateSizeColorInventoryVariants = (variants, sizes, colors) => {
  if (!Array.isArray(variants) || variants.length > 50) {
    return { valid: false, reason: 'count' };
  }
  if (variants.length === 0) return { valid: true };

  const normalizedSizes = Array.isArray(sizes) ? sizes.map(value => String(value ?? '').trim()).filter(Boolean) : [];
  const normalizedColors = Array.isArray(colors) ? colors.map(value => String(value ?? '').trim()).filter(Boolean) : [];
  const expectedPairs = normalizedSizes.length && normalizedColors.length
    ? normalizedSizes.flatMap(size => normalizedColors.map(color => ({ size, color })))
    : normalizedSizes.length
      ? normalizedSizes.map(size => ({ size, color: null }))
      : normalizedColors.map(color => ({ size: null, color }));

  if (expectedPairs.length === 0 || expectedPairs.length > 50 || variants.length !== expectedPairs.length) {
    return { valid: false, reason: 'coverage' };
  }

  const seenIds = new Set();
  const seenPairs = new Set();
  for (const variant of variants) {
    if (!variant || typeof variant !== 'object' || Array.isArray(variant) || variant.variantType !== 'size_color') {
      return { valid: false, reason: 'shape' };
    }
    const id = String(variant.id ?? '').trim();
    const name = String(variant.name ?? '').trim();
    const size = String(variant.size ?? '').trim() || null;
    const color = String(variant.color ?? '').trim() || null;
    const pairKey = JSON.stringify([size, color]);
    const price = Number(variant.priceGEL ?? variant.price_gel);
    const stock = Number(variant.stock);

    if (!id || id.length > 120 || seenIds.has(id) || !name || name.length > 80) {
      return { valid: false, reason: 'identity' };
    }
    if (seenPairs.has(pairKey) || !expectedPairs.some(pair => pair.size === size && pair.color === color)) {
      return { valid: false, reason: 'combination' };
    }
    seenIds.add(id);
    seenPairs.add(pairKey);

    if (!Number.isFinite(price) || price < 0 || price > 1000000000) {
      return { valid: false, reason: 'price' };
    }
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1000000) {
      return { valid: false, reason: 'stock' };
    }
  }

  return { valid: true };
};
