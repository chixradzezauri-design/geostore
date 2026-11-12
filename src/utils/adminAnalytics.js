export const getOrderDeliveryCharge = (order) => {
  const checkoutValue =
    order?.checkoutBreakdown?.deliveryGEL ??
    order?.checkout_breakdown?.delivery_gel ??
    order?.checkout_result?.delivery_gel;

  if (checkoutValue !== null && checkoutValue !== undefined && String(checkoutValue).trim() !== '') {
    const parsed = Number(checkoutValue);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  // Older orders may not have a checkout financial snapshot; retain the
  // legacy address-label fallback without using it for modern orders.
  const legacyMatch = String(order?.address || '').match(/მიწოდება:\s*([\d.,]+)\s*₾/i);
  if (!legacyMatch) return 0;
  const legacyValue = Number(legacyMatch[1].replace(',', '.'));
  return Number.isFinite(legacyValue) && legacyValue >= 0 ? legacyValue : 0;
};
