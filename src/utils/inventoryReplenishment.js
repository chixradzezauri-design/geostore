const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const DEFAULT_TARGET_STOCK = 20;

export const getInventoryPositionKey = (productId, variantId = null) =>
  JSON.stringify([String(productId ?? ''), variantId == null ? null : String(variantId)]);

/** Builds read-only replenishment recommendations from the existing catalogue. */
export const buildInventoryReplenishmentPlan = (products, settings = [], defaults = {}) => {
  if (!Array.isArray(products)) return [];
  const defaultThreshold = Number.isSafeInteger(Number(defaults.threshold)) && Number(defaults.threshold) >= 0
    ? Number(defaults.threshold) : DEFAULT_LOW_STOCK_THRESHOLD;
  const defaultTarget = Number.isSafeInteger(Number(defaults.target)) && Number(defaults.target) > defaultThreshold
    ? Number(defaults.target) : Math.max(DEFAULT_TARGET_STOCK, defaultThreshold + 1);
  const settingMap = new Map();
  (Array.isArray(settings) ? settings : []).forEach(setting => {
    if (setting?.product_id == null) return;
    settingMap.set(getInventoryPositionKey(setting.product_id, setting.variant_id), setting);
  });
  const positions = [];
  products.forEach(product => {
    if (!product || typeof product !== 'object' || product.id == null) return;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const rows = variants.length
      ? variants.map(variant => ({ variantId: variant?.id ?? null, variantName: variant?.name ?? variant?.label ?? null, stock: variant?.stock }))
      : [{ variantId: null, variantName: null, stock: product.stock }];
    rows.forEach(row => {
      if (row.stock == null || String(row.stock).trim() === '') return;
      const stock = Number(row.stock);
      if (!Number.isSafeInteger(stock) || stock < 0) return;
      const key = getInventoryPositionKey(product.id, row.variantId);
      const saved = settingMap.get(key);
      const threshold = Number(saved?.low_stock_threshold ?? defaultThreshold);
      const target = Number(saved?.target_stock ?? defaultTarget);
      if (!Number.isSafeInteger(threshold) || threshold < 0 || !Number.isSafeInteger(target) || target <= threshold) return;
      const isLowStock = stock <= threshold;
      positions.push({
        key, productId: String(product.id), productName: String(product.name || 'უსახელო პროდუქტი'),
        sku: String(product.sku || ''), category: String(product.category || ''),
        variantId: row.variantId == null ? null : String(row.variantId),
        variantName: row.variantName == null ? null : String(row.variantName),
        stock, threshold, target, isLowStock, isOutOfStock: stock === 0,
        suggestedQuantity: isLowStock ? Math.max(0, target - stock) : 0,
        settingId: saved?.id ?? null, hasCustomSetting: Boolean(saved)
      });
    });
  });
  return positions.sort((a, b) =>
    Number(b.isLowStock) - Number(a.isLowStock) || a.stock - b.stock
    || a.productName.localeCompare(b.productName)
    || String(a.variantName || '').localeCompare(String(b.variantName || ''))
  );
};

export const filterInventoryReplenishmentPlan = (positions, query = '') => {
  const normalized = String(query || '').trim().toLocaleLowerCase();
  if (!Array.isArray(positions)) return [];
  if (!normalized) return positions;
  return positions.filter(position => [
    position.productName, position.productId, position.sku, position.category,
    position.variantName, position.variantId
  ].some(value => String(value || '').toLocaleLowerCase().includes(normalized)));
};
