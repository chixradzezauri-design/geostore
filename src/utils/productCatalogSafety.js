export const isValidProductCatalogueResponse = (rows) => {
  if (!Array.isArray(rows)) return false;

  const ids = new Set();
  return rows.every((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
    const id = String(row.id ?? '').trim();
    const price = Number(row.price_gel);
    const stock = row.stock === null || row.stock === undefined ? 0 : Number(row.stock);
    if (!id || ids.has(id)) return false;
    if (!Number.isFinite(price) || price < 0 || price > 1000000000) return false;
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1000000) return false;
    ids.add(id);
    return true;
  });
};
