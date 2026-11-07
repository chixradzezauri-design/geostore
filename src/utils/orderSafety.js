// Keep order payload normalization pure so malformed legacy rows cannot crash
// customer history, admin details, or invoice rendering.
// Normalize server order totals identically in customer history and admin finance.
// Reject negative, malformed, NaN and infinite values before they reach the UI.
export const normalizeOrderTotal = (value) => {
  const total = Number(value);
  return Number.isFinite(total) && total >= 0 ? total : 0;
};

export const normalizeOrderItems = (items) => (
  Array.isArray(items)
    ? items.filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    : []
);

// Pure checkout safety helpers. Kept separate so Node's built-in test runner
// can verify retry and item-grouping rules without browser or Supabase access.

export const groupCheckoutItems = (items) => {
  const groupedItems = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const selectedSize = item?.selected_size || null;
    const selectedColor = item?.selected_color || null;
    const customVariantId = String(item?.custom_variant_id ?? '').trim() || null;
    const giftWrap = item?.gift_wrap === true;
    const vipWarranty = item?.vip_warranty === true;
    const giftMessage = giftWrap ? String(item?.gift_message ?? '').trim().slice(0, 240) : '';
    const hasCustomization = giftWrap || vipWarranty || giftMessage.length > 0;
    const key = JSON.stringify([String(item?.id), selectedSize, selectedColor, customVariantId, giftWrap, vipWarranty, giftMessage]);
    const current = groupedItems.get(key) || {
      id: String(item?.id),
      selected_size: selectedSize,
      selected_color: selectedColor,
      ...(customVariantId ? { custom_variant_id: customVariantId } : {}),
      quantity: 0
    };
    // Preserve the old fingerprint shape for ordinary orders.
    if (hasCustomization) {
      current.gift_wrap = giftWrap;
      current.vip_warranty = vipWarranty;
      current.gift_message = giftMessage || null;
    }
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

export const normalizeTrackingLookup = (orderId, phone) => {
  const normalizedOrderId = String(orderId || '').trim().replace(/^#+/, '').toUpperCase();
  const normalizedPhone = String(phone || '').replace(/[^0-9]/g, '');
  if (!/^[A-Z0-9_-]{6,64}$/.test(normalizedOrderId)) return { valid: false, reason: 'order_id' };
  if (!/^\d{9,15}$/.test(normalizedPhone)) return { valid: false, reason: 'phone' };
  return { valid: true, orderId: normalizedOrderId, phone: normalizedPhone };
};

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
  const requestedByInventoryUnit = new Map();

  for (const item of cart) {
    const id = String(item?.id ?? '');
    const customVariantId = String(item?.customVariantId ?? '').trim();
    const key = JSON.stringify([id, customVariantId || null]);
    const quantity = Number(item?.quantity ?? 1);
    if (!id) continue;
    requestedByInventoryUnit.set(key, (requestedByInventoryUnit.get(key) || 0) +
      (Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1));
  }

  const changes = [];
  const refreshedCart = cart.map((item) => {
    const product = byId.get(String(item?.id ?? ''));
    if (!product) {
      changes.push({ id: item?.id, name: item?.name || String(item?.id || ''), type: 'unavailable' });
      return item;
    }

    const customVariantId = String(item?.customVariantId ?? '').trim();
    const customVariant = customVariantId && Array.isArray(product.variants)
      ? product.variants.find(variant => String(variant?.id ?? '') === customVariantId)
      : null;
    const hasCustomVariants = Array.isArray(product.variants) && product.variants.length > 0;
    const currentPrice = customVariantId ? Number(customVariant?.priceGEL ?? customVariant?.price_gel) : Number(product.price_gel);
    const currentStock = customVariantId ? Number(customVariant?.stock ?? 0) : Number(product.stock ?? 0);
    const safeStock = Number.isFinite(currentStock) ? Math.max(0, Math.floor(currentStock)) : 0;
    const oldPrice = Number(item?.basePriceGEL ?? item?.priceGEL ?? item?.price);
    const hasValidPrice = Number.isFinite(currentPrice) && currentPrice >= 0 && (!customVariantId || Boolean(customVariant));
    if (hasCustomVariants && !customVariantId) {
      changes.push({ id: item?.id, name: product.name || item?.name || '', type: 'variant_custom_missing' });
      return item;
    }
    if (customVariantId && !customVariant) {
      changes.push({ id: item?.id, name: product.name || item?.name || '', type: 'variant_custom_unavailable', selected: customVariantId });
      return item;
    }
    if (!hasValidPrice) {
      changes.push({ id: item?.id, name: product.name || item?.name || '', type: 'invalid_price' });
      return item;
    }

    const selectedSize = String(item?.selectedSize ?? item?.selected_size ?? '').trim();
    const selectedColor = String(item?.selectedColor ?? item?.selected_color ?? '').trim();
    const sizeOptions = Array.isArray(product.available_sizes)
      ? product.available_sizes.map((value) => String(value ?? '').trim()).filter(Boolean)
      : Array.isArray(product.availableSizes)
        ? product.availableSizes.map((value) => String(value ?? '').trim()).filter(Boolean)
        : [];
    const colorOptions = Array.isArray(product.available_colors)
      ? product.available_colors.map((value) => String(value ?? '').trim()).filter(Boolean)
      : Array.isArray(product.availableColors)
        ? product.availableColors.map((value) => String(value ?? '').trim()).filter(Boolean)
        : Array.isArray(product.colors)
          ? product.colors.map((value) => String(value ?? '').trim()).filter(Boolean)
          : [];

    // Older catalogue rows may not expose variant columns at all. In that
    // legacy case, do not invalidate a cart selection based on missing data.
    // An explicitly supplied empty array is different: it means no options
    // are currently offered and must invalidate any selected option.
    const hasSizeConfiguration = Array.isArray(product.available_sizes) ||
      Array.isArray(product.availableSizes);
    const hasColorConfiguration = Array.isArray(product.available_colors) ||
      Array.isArray(product.availableColors) ||
      Array.isArray(product.colors);

    if (selectedSize && hasSizeConfiguration && !sizeOptions.includes(selectedSize)) {
      changes.push({ id: item?.id, name: product.name || item?.name || '', type: 'variant_size', selected: selectedSize });
    }
    if (selectedColor && hasColorConfiguration && !colorOptions.includes(selectedColor)) {
      changes.push({ id: item?.id, name: product.name || item?.name || '', type: 'variant_color', selected: selectedColor });
    }

    if (!Number.isFinite(oldPrice) || oldPrice !== currentPrice) {
      changes.push({ id: item?.id, name: product.name || item?.name || '', type: 'price', oldValue: oldPrice, newValue: currentPrice });
    }
    const inventoryKey = JSON.stringify([String(item?.id ?? ''), customVariantId || null]);
    const requestedQuantity = requestedByInventoryUnit.get(inventoryKey) || 0;
    if (requestedQuantity > safeStock) {
      if (!changes.some((change) => String(change.id) === String(item?.id) && change.type === 'stock' && String(change.customVariantId || '') === customVariantId)) {
        changes.push({ id: item?.id, customVariantId: customVariantId || null, name: product.name || item?.name || '', type: safeStock > 0 ? 'stock' : 'unavailable_stock', requested: requestedQuantity, available: safeStock });
      }
    }

    return {
      ...item,
      name: product.name || item.name,
      priceGEL: currentPrice + (item?.giftWrap === true ? 5 : 0) + (item?.vipWarranty === true ? 15 : 0),
      basePriceGEL: currentPrice,
      stock: safeStock,
      customVariantName: customVariant ? String(customVariant.name || '') : ''
    };
  });

  return { cartItems: refreshedCart, changes, hasChanges: changes.length > 0 };
};


// Accept a checkout response only when it confirms the exact secure ID sent by the client.
export const validateOrderCreationResponse = (serverResult, expectedOrderId) => {
  const expectedId = String(expectedOrderId || '').trim();
  const receivedId = String(serverResult?.order_id || '').trim();
  if (!/^ORD-[A-F0-9]{32}$/.test(expectedId)) {
    return { valid: false, reason: 'invalid_expected_id' };
  }
  if (!receivedId) return { valid: false, reason: 'missing_order_id' };
  if (receivedId !== expectedId) return { valid: false, reason: 'order_id_mismatch' };
  return { valid: true, orderId: receivedId };
};


// Keep every field required by the pre-checkout cart reconciliation in one tested selection.
export const CHECKOUT_CATALOG_SELECT = 'id,name,price_gel,stock,available_sizes,available_colors,variants';
