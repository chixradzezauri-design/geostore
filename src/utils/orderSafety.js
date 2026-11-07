// Remove duplicate rows before financial aggregation. For repeated IDs, keep the
// most recently updated snapshot; stable input order breaks timestamp ties.
export const deduplicateOrdersById = (orders) => {
  if (!Array.isArray(orders)) return [];
  const selected = new Map();
  const timestamp = (order) => {
    const values = [order?.updated_at, order?.updatedAt, order?.status_changed_at, order?.statusChangedAt, order?.created_at, order?.createdAt, order?.date];
    for (const value of values) {
      if (!value) continue;
      const parsed = new Date(value).getTime();
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  };
  orders.forEach((order) => {
    if (!order || typeof order !== 'object' || Array.isArray(order)) return;
    const id = String(order.id ?? '').trim().toUpperCase();
    if (!id) return;
    const current = selected.get(id);
    if (!current || timestamp(order) > timestamp(current)) selected.set(id, order);
  });
  return Array.from(selected.values());
};

// Keep order payload normalization pure so malformed legacy rows cannot crash
// customer history, admin details, or invoice rendering.
// Normalize server order totals identically in customer history and admin finance.
// Reject negative, malformed, NaN and infinite values before they reach the UI.
export const roundGEL = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) / 100 : 0;
};

export const normalizeOrderTotal = (value) => {
  const total = Number(value);
  return Number.isFinite(total) && total >= 0 ? roundGEL(total) : 0;
};

// Checkout appends the authoritative fee after the customer's free-form address.
// Use the last marker so address text cannot spoof the reporting fee.
export const parseOrderDeliveryChargeGEL = (address, orderTotal) => {
  const total = normalizeOrderTotal(orderTotal);
  const matches = [...String(address ?? '').matchAll(/მიწოდება:\s*([\d.,]+)\s*₾/gi)];
  if (!matches.length) return 0;
  const raw = Number(String(matches[matches.length - 1][1]).replace(',', '.'));
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.round(Math.min(total, raw) * 100) / 100;
};

// Missing legacy quantities default to one; explicitly invalid/non-positive quantities
// contribute zero rather than silently inventing a sale.
export const normalizeOrderQuantity = (value) => {
  if (value === null || value === undefined || value === '') return 1;
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0;
};

// Server order snapshots already store the final unit price (including add-ons).
// Prefer that authoritative total and never add the same fees a second time.
export const resolveOrderDeliveryChargeGEL = (order, orderTotal) => {
  const total = normalizeOrderTotal(orderTotal);
  const serverValue = order?.deliveryGEL ?? order?.delivery_gel ?? order?.checkout_result?.delivery_gel;
  if (serverValue !== null && serverValue !== undefined && serverValue !== '') {
    const parsed = Number(serverValue);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.min(total, Math.round((parsed + Number.EPSILON) * 100) / 100);
    }
  }
  return parseOrderDeliveryChargeGEL(order?.address, total);
};

export const calculateOrderLineRevenueGEL = (item) => {
  const rawPrice = Number(item?.price ?? item?.priceGEL ?? item?.base_price);
  const unitPrice = Number.isFinite(rawPrice) ? Math.max(0, roundGEL(rawPrice)) : 0;
  const quantity = normalizeOrderQuantity(item?.quantity);
  return roundGEL(unitPrice * quantity);
};

export const normalizeOrderItems = (items) => (
  Array.isArray(items)
    ? items.filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    : []
);

// Pure checkout safety helpers. Kept separate so Node's built-in test runner
// can verify retry and item-grouping rules without browser or Supabase access.

export const buildCheckoutFingerprintPayload = ({
  ownerId,
  customerName,
  phone,
  address,
  userEmail,
  customerEmail,
  items,
  couponCode,
  deliveryRegion
}) => ({
  // Bind retries to the authenticated Supabase identity, not only its email.
  // Guest orders share a distinct sentinel and cannot collide with user orders.
  owner_id: ownerId || 'guest',
  customer_name: customerName,
  phone,
  address,
  user_email: userEmail || 'guest',
  customer_email: String(customerEmail || '').toLowerCase(),
  items: groupCheckoutItems(items),
  coupon_code: String(couponCode || '').trim().toUpperCase(),
  delivery_region: deliveryRegion
});

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

export const PENDING_CHECKOUT_TTL_MS = 24 * 60 * 60 * 1000;

const MAX_PENDING_CHECKOUT_ENTRIES = 20;

/** Read the v3 multi-checkout store and transparently migrate the legacy v2 single entry. */
export const parsePendingCheckoutEntries = (rawValue, now = Date.now()) => {
  if (typeof now !== 'number' || !Number.isSafeInteger(now)) return [];
  if (typeof rawValue !== 'string' || !rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    const candidates = Array.isArray(parsed?.entries)
      ? parsed.entries
      : [parsed]; // v2 compatibility
    const byFingerprint = new Map();
    candidates.forEach((entry) => {
      if (!isReusableCheckout(entry, entry?.fingerprint, now)) return;
      byFingerprint.set(entry.fingerprint, {
        fingerprint: entry.fingerprint,
        orderId: entry.orderId,
        createdAt: entry.createdAt
      });
    });
    return Array.from(byFingerprint.values())
      .sort((left, right) => left.createdAt - right.createdAt)
      .slice(-MAX_PENDING_CHECKOUT_ENTRIES);
  } catch {
    return [];
  }
};

export const findReusablePendingCheckout = (rawValue, fingerprint, now = Date.now()) => (
  parsePendingCheckoutEntries(rawValue, now)
    .find((entry) => isReusableCheckout(entry, fingerprint, now)) || null
);

/** Merge the current multi-entry store with the legacy single-entry slot. */
export const mergePendingCheckoutStores = (primaryRaw, legacyRaw, now = Date.now()) => {
  const merged = new Map();
  [...parsePendingCheckoutEntries(legacyRaw, now), ...parsePendingCheckoutEntries(primaryRaw, now)]
    .forEach((entry) => merged.set(entry.fingerprint, entry));
  const entries = Array.from(merged.values())
    .sort((left, right) => left.createdAt - right.createdAt)
    .slice(-MAX_PENDING_CHECKOUT_ENTRIES);
  return entries.length ? JSON.stringify({ version: 3, entries }) : '';
};

/** Synchronous read/modify/write payload; localStorage operations run atomically per JS task. */
export const upsertPendingCheckoutEntry = (rawValue, entry, now = Date.now()) => {
  const entries = parsePendingCheckoutEntries(rawValue, now)
    .filter((saved) => saved.fingerprint !== entry?.fingerprint);
  if (isReusableCheckout(entry, entry?.fingerprint, now)) {
    entries.push({
      fingerprint: entry.fingerprint,
      orderId: entry.orderId,
      createdAt: entry.createdAt
    });
  }
  return JSON.stringify({
    version: 3,
    entries: entries.slice(-MAX_PENDING_CHECKOUT_ENTRIES)
  });
};

export const removePendingCheckoutEntry = (rawValue, orderId, now = Date.now()) => {
  const entries = parsePendingCheckoutEntries(rawValue, now)
    .filter((entry) => entry.orderId !== orderId);
  return entries.length
    ? JSON.stringify({ version: 3, entries })
    : null;
};

export const isReusableCheckout = (entry, fingerprint, now = Date.now()) => {
  if (
    !entry ||
    typeof fingerprint !== 'string' ||
    !fingerprint ||
    entry.fingerprint !== fingerprint ||
    typeof entry.orderId !== 'string' ||
    !/^ORD-[A-F0-9]{32}$/.test(entry.orderId) ||
    !Number.isSafeInteger(entry.createdAt) ||
    !Number.isSafeInteger(now)
  ) return false;

  const age = now - entry.createdAt;
  return age >= 0 && age <= PENDING_CHECKOUT_TTL_MS;
};

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
export const isValidGELAmount = (value, { min = 0, max = 1000000000 } = {}) => {
  const raw = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return false;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount >= min && amount <= max;
};

export const calculateCartSubtotalGEL = (items) => {
  const lines = Array.isArray(items) ? items : [];
  const totalCents = lines.reduce((sum, item) => {
    const price = Number(item?.priceGEL ?? item?.price);
    const rawQuantity = Number(item?.quantity ?? 1);
    const quantity = Number.isFinite(rawQuantity) ? Math.max(1, Math.floor(rawQuantity)) : 1;
    if (!Number.isFinite(price) || price < 0) return sum;
    const priceCents = Math.round((price + Number.EPSILON) * 100);
    return sum + priceCents * quantity;
  }, 0);
  return totalCents / 100;
};

/**
 * Uses integer tetri (GEL cents) throughout so browser totals and minimum
 * coupon thresholds do not drift due to binary floating-point arithmetic.
 * The server RPC independently recalculates all values from database prices.
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

  const subtotalCents = Math.round((safeSubtotal + Number.EPSILON) * 100);
  const deliveryCents = Math.round((safeDeliveryFee + Number.EPSILON) * 100);
  // Convert the validated two-decimal percentage to integer basis points.
  // BigInt keeps the multiplication exact and matches PostgreSQL numeric ROUND
  // for positive half-tetri values (e.g. 3.75 GEL at 34.80%).
  const discountBasisPoints = Math.round(safeDiscountPercent * 100);
  const discountCents = Number(
    (BigInt(subtotalCents) * BigInt(discountBasisPoints) + 5000n) / 10000n
  );

  return {
    subtotalGEL: subtotalCents / 100,
    discountGEL: discountCents / 100,
    deliveryGEL: deliveryCents / 100,
    totalGEL: (Math.max(0, subtotalCents - discountCents) + deliveryCents) / 100
  };
};

/**
 * Compares cart snapshots with a fresh public catalogue response.
 * The server RPC remains authoritative; this is a customer-facing stale-cart
 * guard so changed prices/stock are reviewed before the order is submitted.
 */
/** Classify stale-cart changes so checkout explains the actual action needed. */
export const classifyCartReconciliationChanges = (changes) => {
  const entries = Array.isArray(changes) ? changes : [];
  const types = new Set(entries.map((change) => change?.type));
  if (['unavailable', 'invalid_price', 'variant_custom_unavailable'].some((type) => types.has(type))) {
    return 'unavailable';
  }
  if ([
    'variant_size', 'variant_color', 'variant_size_missing', 'variant_color_missing',
    'variant_custom_missing'
  ].some((type) => types.has(type))) {
    return 'options';
  }
  if (types.has('stock') || types.has('unavailable_stock')) return 'stock';
  if (types.has('price')) return 'price';
  return 'review';
};

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

    if (hasSizeConfiguration && sizeOptions.length > 0 && !selectedSize) {
      changes.push({ id: item?.id, name: product.name || item?.name || '', type: 'variant_size_missing' });
    } else if (selectedSize && hasSizeConfiguration && !sizeOptions.includes(selectedSize)) {
      changes.push({ id: item?.id, name: product.name || item?.name || '', type: 'variant_size', selected: selectedSize });
    }
    if (hasColorConfiguration && colorOptions.length > 0 && !selectedColor) {
      changes.push({ id: item?.id, name: product.name || item?.name || '', type: 'variant_color_missing' });
    } else if (selectedColor && hasColorConfiguration && !colorOptions.includes(selectedColor)) {
      changes.push({ id: item?.id, name: product.name || item?.name || '', type: 'variant_color', selected: selectedColor });
    }

    if (!Number.isFinite(oldPrice) || oldPrice !== currentPrice) {
      changes.push({
        id: item?.id,
        customVariantId: customVariantId || null,
        name: product.name || item?.name || '',
        type: 'price',
        oldValue: oldPrice,
        newValue: currentPrice
      });
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


// Accept checkout only when the RPC confirms the exact ID and its complete
// server-calculated financial snapshot. Never turn a malformed total into 0 GEL.
export const validateOrderCreationResponse = (serverResult, expectedOrderId) => {
  const expectedId = String(expectedOrderId || '').trim();
  const receivedId = String(serverResult?.order_id || '').trim();
  if (!/^ORD-[A-F0-9]{32}$/.test(expectedId)) {
    return { valid: false, reason: 'invalid_expected_id' };
  }
  if (!receivedId) return { valid: false, reason: 'missing_order_id' };
  if (receivedId !== expectedId) return { valid: false, reason: 'order_id_mismatch' };

  const totals = ['subtotal_gel', 'discount_gel', 'delivery_gel', 'total_gel']
    .map((field) => {
      const value = serverResult?.[field];
      return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : NaN;
    });
  if (totals.some((value) => !Number.isFinite(value))) {
    return { valid: false, reason: 'invalid_totals' };
  }
  const [subtotal, discount, delivery, total] = totals;
  const toCents = (value) => Math.round((value + Number.EPSILON) * 100);
  if (toCents(discount) > toCents(subtotal) ||
      toCents(total) !== Math.max(0, toCents(subtotal) - toCents(discount)) + toCents(delivery)) {
    return { valid: false, reason: 'inconsistent_totals' };
  }
  if (!Array.isArray(serverResult?.items) || serverResult.items.length === 0) {
    return { valid: false, reason: 'missing_items' };
  }
  return { valid: true, orderId: receivedId };
};


// Keep every field required by the pre-checkout cart reconciliation in one tested selection.
export const CHECKOUT_CATALOG_SELECT = 'id,name,price_gel,stock,available_sizes,available_colors,variants';
