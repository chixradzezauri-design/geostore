// Order reporting uses the status transition date for both completed and
// cancelled orders. For older rows without audit timestamps, retain the
// historical creation-date fallback rather than inventing a transition.
export function getFinancialOrderEventDate(order, closed = false) {
  const created = order?.created_at || order?.createdAt || order?.date || null;
  return closed ? (order?.status_changed_at || order?.statusChangedAt || created) : created;
}

// Prefer the confirmed checkout ledger rather than parsing display text.
// Older orders without a checkout breakdown retain the address fallback.
export function getFinancialDeliveryCharge(order) {
  const checkoutDelivery = order?.checkoutBreakdown?.deliveryGEL;
  if (checkoutDelivery !== null && checkoutDelivery !== undefined && checkoutDelivery !== '') {
    const numeric = Number(checkoutDelivery);
    if (Number.isFinite(numeric) && numeric >= 0) return numeric;
  }
  const deliveryMatch = String(order?.address || '').match(/მიწოდება:\s*([\d.,]+)\s*₾/i);
  if (!deliveryMatch) return 0;
  const parsed = Number(deliveryMatch[1].replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

const toCents = value => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const cents = Math.round(value * 100);
  return Number.isSafeInteger(cents) ? cents : null;
};

// A valid order's delivered total must agree with its allocated product,
// paid-add-on and delivery revenue (and, when available, its server checkout
// subtotal less discount plus delivery). Legacy mismatches are disclosed;
// they must never create a seemingly confirmed profit amount.
export function isReconciledOrderRevenue(orderTotal, revenueSplit, breakdown = null) {
  const total = toCents(orderTotal);
  const products = toCents(revenueSplit?.productRevenue);
  const addons = toCents(revenueSplit?.addonRevenue);
  const delivery = toCents(revenueSplit?.deliveryRevenue);
  if ([total, products, addons, delivery].some(value => value === null)) return false;
  if (Math.abs(total - (products + addons + delivery)) > 1) return false;

  const lineTotals = revenueSplit?.itemProductRevenue;
  if (!Array.isArray(lineTotals)) return false;
  const lineSum = lineTotals.reduce((sum, line) => sum + line, 0);
  const lineCents = toCents(lineSum);
  if (lineCents === null || Math.abs(products - lineCents) > 1) return false;

  if (breakdown) {
    const subtotal = toCents(breakdown.subtotalGEL);
    const discount = toCents(breakdown.discountGEL);
    const confirmedDelivery = toCents(breakdown.deliveryGEL);
    if ([subtotal, discount, confirmedDelivery].some(value => value === null) ||
        discount > subtotal ||
        Math.abs(total - (subtotal - discount + confirmedDelivery)) > 1 ||
        Math.abs(delivery - confirmedDelivery) > 1) return false;
  }
  return true;
}
