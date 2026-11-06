const hasControlCharacters = (value) => /[\u0000-\u001f\u007f]/.test(value);

export const validateCheckoutContact = ({ name, phone, email, address, requireEmail = false }) => {
  const cleanName = String(name ?? '').trim();
  const phoneDigits = String(phone ?? '').replace(/[^0-9]/g, '');
  const cleanEmail = String(email ?? '').trim();
  const cleanAddress = String(address ?? '').trim();

  if (cleanName.length < 2 || cleanName.length > 100 || hasControlCharacters(cleanName)) {
    return { valid: false, field: 'name' };
  }
  if (!/^\d{9,15}$/.test(phoneDigits)) {
    return { valid: false, field: 'phone' };
  }
  if (cleanAddress.length < 3 || cleanAddress.length > 300 || hasControlCharacters(cleanAddress)) {
    return { valid: false, field: 'address' };
  }
  if (requireEmail || cleanEmail) {
    if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { valid: false, field: 'email' };
    }
  }
  return { valid: true };
};

export const validateCheckoutItems = (items) => {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
    return { valid: false, reason: 'count' };
  }

  const totalsByProduct = new Map();
  for (const item of items) {
    const id = String(item?.id ?? '').trim();
    const quantity = Number(item?.quantity);
    const size = item?.selected_size == null ? '' : String(item.selected_size);
    const color = item?.selected_color == null ? '' : String(item.selected_color);

    if (!id || id.length > 64 || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return { valid: false, reason: 'item' };
    }
    if (size.length > 40 || color.length > 60) {
      return { valid: false, reason: 'variant' };
    }

    const nextTotal = (totalsByProduct.get(id) || 0) + quantity;
    if (nextTotal > 100) return { valid: false, reason: 'quantity' };
    totalsByProduct.set(id, nextTotal);
  }

  return { valid: true };
};
