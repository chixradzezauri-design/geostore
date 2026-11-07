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
  const sameProduct = item => String(item?.id) === productId;
  const sameLine = item =>
    sameProduct(item) &&
    (String(item?.selectedSize || '').trim() || null) === size &&
    (String(item?.selectedColor || '').trim() || null) === color &&
    String(item?.name ?? '') === String(product?.name ?? '') &&
    Number(item?.priceGEL ?? item?.price) === Number(product?.priceGEL ?? product?.price);
  const alreadyInCart = currentCart
    .filter(sameProduct)
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
      selectedSize: size,
      selectedColor: color,
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
    Number(item?.priceGEL ?? item?.price) === price
  ));
};
