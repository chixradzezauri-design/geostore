export const resolveProductCreatedAt = ({ isEditing, savedRow, existingProduct, now = () => new Date().toISOString() }) => {
  if (isEditing) {
    // Legacy rows may legitimately have no creation timestamp. Preserve that
    // absence instead of making an edit look like a newly created product.
    return savedRow?.created_at ?? existingProduct?.createdAt ?? existingProduct?.created_at ?? null;
  }

  return savedRow?.created_at ?? now();
};


/** Returns low-stock inventory positions, checking custom variants independently. */
export const getLowStockInventory = (products, threshold = 5) => {
  const limit = Number(threshold);
  if (!Array.isArray(products) || !Number.isFinite(limit) || limit < 0) return [];

  const positions = [];
  products.forEach((product) => {
    if (!product || typeof product !== 'object') return;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const inventoryRows = variants.length > 0
      ? variants.map((variant) => ({
          stock: variant?.stock,
          variantId: variant?.id,
          variantName: variant?.name
        }))
      : [{ stock: product.stock, variantId: null, variantName: null }];

    inventoryRows.forEach((row) => {
      if (row.stock === null || row.stock === undefined || String(row.stock).trim() === '') return;
      const stock = Number(row.stock);
      if (!Number.isSafeInteger(stock) || stock < 0 || stock > limit) return;
      positions.push({
        ...product,
        variantId: row.variantId ?? null,
        variantName: row.variantName ?? null,
        _stockValue: stock,
        _inventoryKey: row.variantId == null
          ? String(product.id ?? product.sku ?? product.name ?? 'product')
          : `${String(product.id ?? 'product')}::variant::${String(row.variantId)}`
      });
    });
  });

  return positions.sort((a, b) =>
    a._stockValue - b._stockValue ||
    String(a.name || '').localeCompare(String(b.name || '')) ||
    String(a.variantName || '').localeCompare(String(b.variantName || ''))
  );
};


/** Groups low-stock positions by product without dropping individual variant details. */
export const groupLowStockInventory = (positions) => {
  if (!Array.isArray(positions)) return [];

  const groups = new Map();
  positions.forEach((position) => {
    if (!position || typeof position !== 'object') return;
    const key = String(position.id ?? position.sku ?? position.name ?? position._inventoryKey ?? 'product');
    const group = groups.get(key) || {
      key,
      id: position.id ?? null,
      name: position.name || 'უსახელო პროდუქტი',
      sku: position.sku || position.category || 'პროდუქტი',
      positions: []
    };
    group.positions.push(position);
    groups.set(key, group);
  });

  return Array.from(groups.values());
};
