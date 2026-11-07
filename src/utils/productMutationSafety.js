/**
 * Lock keys used by the admin product editor:
 *   <field>:<productId>
 *   variant-stock:<productId>:<variantId>
 *
 * Treat any active lock for the same product as a conflict so a metadata
 * save, stock change, and delete cannot race one another in this tab.
 */
export const hasProductMutationLock = (locks, productId) => {
  const id = String(productId ?? '');
  if (!id || !locks || typeof locks.has !== 'function') return false;
  for (const key of locks) {
    const value = String(key);
    if (value.endsWith(`:${id}`) || value.startsWith(`variant-stock:${id}:`)) return true;
  }
  return false;
};

/**
 * Build a PostgREST compare-and-swap filter from the exact database version
 * captured when the product editor was opened.
 */
export const buildProductVersionFilter = (version) => {
  if (typeof version !== 'string' || !version.trim()) return null;
  const timestamp = Date.parse(version);
  if (!Number.isFinite(timestamp)) return null;
  return `updated_at=eq.${encodeURIComponent(version)}`;
};
