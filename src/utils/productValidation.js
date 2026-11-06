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
