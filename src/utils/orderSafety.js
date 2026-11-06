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
    totalGEL: Math.max(0, safeSubtotal - discountGEL) + safeDeliveryFee
  };
};
