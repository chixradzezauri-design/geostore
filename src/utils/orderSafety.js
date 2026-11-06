// Pure checkout safety helpers. Kept separate so Node's built-in test runner
// can verify retry and item-grouping rules without browser or Supabase access.

export const groupCheckoutItems = (items) => {
  const groupedItems = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const selectedSize = item?.selected_size || null;
    const selectedColor = item?.selected_color || null;
    const key = JSON.stringify([String(item?.id), selectedSize, selectedColor]);
    const current = groupedItems.get(key) || {
      id: String(item?.id),
      selected_size: selectedSize,
      selected_color: selectedColor,
      quantity: 0
    };

    current.quantity += Number(item?.quantity) || 0;
    groupedItems.set(key, current);
  });

  return Array.from(groupedItems.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, item]) => item);
};

export const isReusableCheckout = (entry, fingerprint) => (
  Boolean(
    entry &&
    typeof fingerprint === 'string' &&
    entry.fingerprint === fingerprint &&
    typeof entry.orderId === 'string' &&
    /^ORD-[A-F0-9]{32}$/.test(entry.orderId)
  )
);

export const createSecureOrderId = (cryptoApi) => {
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('უსაფრთხო შეკვეთის ნომრის გენერირება ვერ მოხერხდა.');
  }

  const randomBytes = new Uint8Array(16);
  cryptoApi.getRandomValues(randomBytes);
  return `ORD-${Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};


/**
 * Mirrors the server checkout calculation: coupon discount is rounded to
 * two GEL decimal places before it is subtracted; delivery is added after.
 */
export const calculateCheckoutTotals = ({ subtotal, discountPercent, deliveryFee }) => {
  const rawSubtotal = Number(subtotal);
  const safeSubtotal = Number.isFinite(rawSubtotal) ? Math.max(0, rawSubtotal) : 0;

  const rawDiscountPercent = Number(discountPercent);
  const safeDiscountPercent = Number.isFinite(rawDiscountPercent)
    ? Math.min(100, Math.max(0, rawDiscountPercent))
    : 0;

  const rawDeliveryFee = Number(deliveryFee);
  const safeDeliveryFee = Number.isFinite(rawDeliveryFee) ? Math.max(0, rawDeliveryFee) : 0;

  const discountGEL = Math.round(
    (safeSubtotal * safeDiscountPercent / 100 + Number.EPSILON) * 100
  ) / 100;

  return {
    subtotalGEL: safeSubtotal,
    discountGEL,
    deliveryGEL: safeDeliveryFee,
    totalGEL: Number((Math.max(0, safeSubtotal - discountGEL) + safeDeliveryFee).toFixed(10))
  };
};


/**
 * Compares cart snapshots with a fresh public catalogue response.
 * The server RPC remains authoritative; this is a customer-facing stale-cart
 * guard so changed prices/stock are reviewed before the order is submitted.
 */
export const reconcileCartWithCatalog = (cartItems, catalogProducts) => {
  const cart = Array.isArray(cartItems) ? cartItems : [];
  const catalog = Array.isArray(catalogProducts) ? catalogProducts : [];
  const byId = new Map(catalog.map((product) => [String(product?.id ?? ''), product]));
  const requestedById = new Map();

  for (const item of cart) {
    const id = String(item?.id ?? '');
    const quantity = Number(item?.quantity ?? 1);
    if (!id) continue;
    requestedById.set(id, (requestedById.get(id) || 0) +
      (Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1));
  }

  const changes = [];
  const refreshedCart = cart.map((item) => {
    const product = byId.get(String(item?.id ?? ''));
    if (!product) {
      changes.push({ id: item?.id, name: item?.name || String(item?.id || ''), type: 'unavailable' });
      return item;
    }

    const currentPrice = Number(product.price_gel);
    const currentStock = Number(product.stock ?? 0);
    const safeStock = Number.isFinite(currentStock) ? Math.max(0, Math.floor(currentStock)) : 0;
    const oldPrice = Number(item?.priceGEL ?? item?.price);
    const hasValidPrice = Number.isFinite(currentPrice) && currentPrice >= 0;

    if (!hasValidPrice) {
      changes.push({ id: item?.id, name: product.name || item?.name || '', type: 'invalid_price' });
      return item;
    }
    if (!Number.isFinite(oldPrice) || oldPrice !== currentPrice) {
      changes.push({ id: item?.id, name: product.name || item?.name || '', type: 'price', oldValue: oldPrice, newValue: currentPrice });
    }
    if ((requestedById.get(String(item?.id ?? '')) || 0) > safeStock) {
      if (!changes.some((change) => String(change.id) === String(item?.id) && change.type === 'stock')) {
        changes.push({ id: item?.id, name: product.name || item?.name || '', type: safeStock > 0 ? 'stock' : 'unavailable_stock', requested: requestedById.get(String(item?.id ?? '')) || 0, available: safeStock });
      }
    }

    return {
      ...item,
      name: product.name || item.name,
      priceGEL: currentPrice,
      stock: safeStock
    };
  });

  return { cartItems: refreshedCart, changes, hasChanges: changes.length > 0 };
};
