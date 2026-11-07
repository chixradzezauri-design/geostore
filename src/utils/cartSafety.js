const LEGACY_GIFT_WRAP_LABELS = ['სასაჩუქრე პრემიუმ შეფუთვა', 'Premium gift wrapping', 'Премиальная подарочная упаковка'];
const LEGACY_VIP_LABELS = ['VIP დაზღვევა და გაფართოებული გარანტია (+1 წელი)', 'VIP protection and extended warranty (+1 year)', 'VIP-защита и расширенная гарантия (+1 год)'];
const LEGACY_GIFT_MESSAGE_LABELS = ['სასაჩუქრე ბარათის ტექსტი (უფასო)', 'Gift card message (free)', 'Текст подарочной открытки (бесплатно)'];

const extractLegacyCartAddons = (rawName) => {
  let name = String(rawName ?? '');
  let giftWrap = false;
  let vipWarranty = false;
  let giftMessage = '';
  for (const label of LEGACY_VIP_LABELS) {
    const marker = ` + ${label}`;
    if (name.includes(marker)) { vipWarranty = true; name = name.replace(marker, ''); break; }
  }
  for (const label of LEGACY_GIFT_MESSAGE_LABELS) {
    const marker = ` [${label}: "`;
    const start = name.lastIndexOf(marker);
    if (start >= 0 && name.endsWith('"]')) {
      giftMessage = name.slice(start + marker.length, -2).trim().slice(0, 240);
      name = name.slice(0, start);
      break;
    }
  }
  for (const label of LEGACY_GIFT_WRAP_LABELS) {
    const marker = ` + ${label}`;
    if (name.includes(marker)) { giftWrap = true; name = name.replace(marker, ''); break; }
  }
  return { name: name.trim(), giftWrap, vipWarranty, giftMessage };
};

export const addProductToCart = (cart, product, quantity = 1) => {
  const currentCart = Array.isArray(cart) ? cart : [];
  const requestedQuantity = Number(quantity);
  if (!product?.id || !Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 100) {
    return { valid: false, reason: 'quantity', cart: currentCart, remaining: 0 };
  }

  const rawStock = Number(product.stock ?? 0);
  const stock = Number.isFinite(rawStock) ? Math.max(0, Math.floor(rawStock)) : 0;
  const productId = String(product.id);
  const size = String(product.selectedSize || '').trim() || null;
  const color = String(product.selectedColor || '').trim() || null;
  const customVariantId = String(product.customVariantId || '').trim() || null;
  const sameProduct = item => String(item?.id) === productId;
  const sameInventoryUnit = item => sameProduct(item) && (String(item?.customVariantId || '').trim() || null) === customVariantId;
  const sameLine = item =>
    sameProduct(item) &&
    (String(item?.selectedSize || '').trim() || null) === size &&
    (String(item?.selectedColor || '').trim() || null) === color &&
    (String(item?.customVariantId || '').trim() || null) === customVariantId &&
    String(item?.name ?? '') === String(product?.name ?? '') &&
    (item?.giftWrap === true) === (product?.giftWrap === true) &&
    (item?.vipWarranty === true) === (product?.vipWarranty === true) &&
    String(item?.giftMessage ?? '') === String(product?.giftWrap === true ? product?.giftMessage ?? '' : '') &&
    Number(item?.priceGEL ?? item?.price) === Number(product?.priceGEL ?? product?.price);
  const alreadyInCart = currentCart
    .filter(sameInventoryUnit)
    .reduce((total, item) => {
      const itemQuantity = Number(item?.quantity);
      return total + (Number.isInteger(itemQuantity) && itemQuantity > 0 ? itemQuantity : 0);
    }, 0);
  const remaining = Math.max(0, stock - alreadyInCart);

  if (stock <= 0) return { valid: false, reason: 'stock', cart: currentCart, remaining: 0 };
  if (requestedQuantity > remaining) return { valid: false, reason: 'limit', cart: currentCart, remaining };

  const existing = currentCart.find(sameLine);
  const nextCart = existing
    ? currentCart.map(item => sameLine(item)
      ? { ...item, quantity: Number(item.quantity) + requestedQuantity }
      : item)
    : [...currentCart, {
      ...product,
      basePriceGEL: Number(product.basePriceGEL ?? product.priceGEL ?? product.price),
      giftWrap: product.giftWrap === true,
      vipWarranty: product.vipWarranty === true,
      giftMessage: product.giftWrap === true ? String(product.giftMessage ?? '').trim().slice(0, 240) : '',
      selectedSize: size,
      selectedColor: color,
      customVariantId,
      customVariantName: customVariantId ? String(product.customVariantName || '').trim().slice(0, 80) : '',
      quantity: requestedQuantity
    }];

  return { valid: true, reason: null, cart: nextCart, remaining: remaining - requestedQuantity };
};

export const removeProductFromCart = (cart, product) => {
  const currentCart = Array.isArray(cart) ? cart : [];
  if (!product?.id) return currentCart;
  const price = Number(product?.priceGEL ?? product?.price);
  return currentCart.filter(item => !(
    String(item?.id) === String(product.id) &&
    String(item?.name ?? '') === String(product?.name ?? '') &&
    (String(item?.selectedSize || '').trim() || null) === (String(product?.selectedSize || '').trim() || null) &&
    (String(item?.selectedColor || '').trim() || null) === (String(product?.selectedColor || '').trim() || null) &&
    (String(item?.customVariantId || '').trim() || null) === (String(product?.customVariantId || '').trim() || null) &&
    (item?.giftWrap === true) === (product?.giftWrap === true) &&
    (item?.vipWarranty === true) === (product?.vipWarranty === true) &&
    String(item?.giftMessage ?? '') === String(product?.giftWrap === true ? product?.giftMessage ?? '' : '') &&
    Object.is(Number(item?.priceGEL ?? item?.price), price)
  ));
};

export const updateProductCartQuantity = (cart, product, requestedQuantity) => {
  const currentCart = Array.isArray(cart) ? cart : [];
  const quantity = Number(requestedQuantity);
  if (!product?.id || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return { valid: false, reason: 'quantity', cart: currentCart };
  }
  const matchesLine = item =>
    String(item?.id) === String(product.id) &&
    String(item?.name ?? '') === String(product?.name ?? '') &&
    (String(item?.selectedSize || '').trim() || null) === (String(product?.selectedSize || '').trim() || null) &&
    (String(item?.selectedColor || '').trim() || null) === (String(product?.selectedColor || '').trim() || null) &&
    (String(item?.customVariantId || '').trim() || null) === (String(product?.customVariantId || '').trim() || null) &&
    (item?.giftWrap === true) === (product?.giftWrap === true) &&
    (item?.vipWarranty === true) === (product?.vipWarranty === true) &&
    String(item?.giftMessage ?? '') === String(product?.giftWrap === true ? product?.giftMessage ?? '' : '') &&
    Object.is(Number(item?.priceGEL ?? item?.price), Number(product?.priceGEL ?? product?.price));
  const lineIndex = currentCart.findIndex(matchesLine);
  if (lineIndex < 0) return { valid: false, reason: 'missing', cart: currentCart };
  const stockValue = Number(product.stock ?? 0);
  const stock = Number.isFinite(stockValue) ? Math.max(0, Math.floor(stockValue)) : 0;
  const otherQuantity = currentCart.reduce((total, item, index) => {
    if (index === lineIndex || String(item?.id) !== String(product.id) ||
        (String(item?.customVariantId || '').trim() || null) !== (String(product?.customVariantId || '').trim() || null)) return total;
    const current = Number(item?.quantity);
    return total + (Number.isInteger(current) && current > 0 ? current : 0);
  }, 0);
  if (otherQuantity + quantity > stock) {
    return { valid: false, reason: 'limit', cart: currentCart, remaining: Math.max(0, stock - otherQuantity) };
  }
  const nextCart = currentCart.map((item, index) => index === lineIndex ? { ...item, quantity } : item);
  return { valid: true, reason: null, cart: nextCart, remaining: Math.max(0, stock - otherQuantity - quantity) };
};


/**
 * Validates the browser-persisted cart before it enters React state.
 * Prices and stock are display snapshots only; checkout refreshes them
 * from the server before creating an order.
 */
export const sanitizeCartSnapshot = (value) => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const id = String(item.id ?? '').trim();
    const name = String(item.name ?? '').trim();
    const quantity = Number(item.quantity);
    const price = Number(item.priceGEL ?? item.price);
    if (!id || id.length > 160 || !name || name.length > 300) return [];
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) return [];
    if (!Number.isFinite(price) || price < 0) return [];
    const hasLegacyAddonMetadata = !Object.prototype.hasOwnProperty.call(item, 'giftWrap') &&
      !Object.prototype.hasOwnProperty.call(item, 'vipWarranty') &&
      !Object.prototype.hasOwnProperty.call(item, 'giftMessage') && item.basePriceGEL === undefined;
    const legacyAddons = hasLegacyAddonMetadata ? extractLegacyCartAddons(name) : null;
    const giftWrap = hasLegacyAddonMetadata ? legacyAddons.giftWrap : item.giftWrap === true;
    const vipWarranty = hasLegacyAddonMetadata ? legacyAddons.vipWarranty : item.vipWarranty === true;
    const giftMessage = giftWrap
      ? String(hasLegacyAddonMetadata ? legacyAddons.giftMessage : item.giftMessage ?? '').trim().slice(0, 240)
      : '';
    const addonFee = (giftWrap ? 5 : 0) + (vipWarranty ? 15 : 0);
    const parsedBasePrice = Number(item.basePriceGEL ?? (hasLegacyAddonMetadata ? Math.max(0, price - addonFee) : price));
    const basePriceGEL = Number.isFinite(parsedBasePrice) && parsedBasePrice >= 0 ? parsedBasePrice : price;
    const safeItem = {
      ...item, id, name: hasLegacyAddonMetadata ? legacyAddons.name : name,
      quantity, priceGEL: price, basePriceGEL, giftWrap, vipWarranty, giftMessage
    };
    if (item.stock !== undefined) {
      const stock = Number(item.stock);
      safeItem.stock = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
    }
    for (const key of ['selectedSize', 'selectedColor']) {
      safeItem[key] = item[key] == null ? null : (String(item[key]).trim().slice(0, 100) || null);
    }
    safeItem.customVariantId = item.customVariantId == null ? null : (String(item.customVariantId).trim().slice(0, 120) || null);
    safeItem.customVariantName = safeItem.customVariantId ? String(item.customVariantName ?? '').trim().slice(0, 80) : '';
    return [safeItem];
  });
};


export const getCartStorageKey = (userId) => (
  userId
    ? `geostore_cart:user:${encodeURIComponent(String(userId))}`
    : 'geostore_cart:guest'
);

/**
 * Persists the outgoing owner's cart and loads the next owner's isolated cart.
 * On first activation, the legacy unscoped cart is migrated to the guest slot.
 */
export const switchCartStorageOwner = ({
  storage,
  previousOwnerId = null,
  nextOwnerId = null,
  currentCart = [],
  isInitial = false
}) => {
  if (!storage) throw new Error('Cart storage is unavailable.');
  const nextKey = getCartStorageKey(nextOwnerId);
  if (isInitial) {
    const legacyCart = storage.getItem('geostore_cart');
    if (legacyCart && !storage.getItem(getCartStorageKey(null))) {
      storage.setItem(getCartStorageKey(null), legacyCart);
    }
  } else if (String(previousOwnerId ?? '') !== String(nextOwnerId ?? '')) {
    storage.setItem(getCartStorageKey(previousOwnerId), JSON.stringify(sanitizeCartSnapshot(currentCart)));
  }
  let nextCart = [];
  const saved = storage.getItem(nextKey);
  if (saved) {
    try {
      nextCart = sanitizeCartSnapshot(JSON.parse(saved));
    } catch {
      nextCart = [];
    }
  }
  storage.setItem(nextKey, JSON.stringify(nextCart));
  return { cart: nextCart, storageKey: nextKey };
};

/**
 * Prevents a cart snapshot from being written while auth is unresolved,
 * before an owner is activated, or under a different account's storage key.
 */
export const canPersistCartForOwner = ({ authLoading, activeOwner, currentUserId }) => (
  !authLoading &&
  activeOwner?.initialized === true &&
  String(activeOwner.userId ?? '') === String(currentUserId ?? '')
);
