export function parseProductRoute(pathname = '') {
  const match = String(pathname).match(new RegExp('^/products/([^/]+)/?$'));
  if (!match) return null;

  let productId;
  try {
    productId = decodeURIComponent(match[1]);
  } catch {
    return { productId: null };
  }

  if (!/^[A-Za-z0-9_-]{1,128}$/.test(productId)) {
    return { productId: null };
  }

  return { productId };
}

export function buildProductRoutePath(productId) {
  const value = String(productId ?? '').trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(value)) return null;
  return `/products/${encodeURIComponent(value)}`;
}
