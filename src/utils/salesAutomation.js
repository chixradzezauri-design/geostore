// Pure decision contract for future server-backed sales automation.
// This module never reads localStorage, contacts a provider, or sends a message.
// Only a trusted backend may construct verified catalogue observations.
export const SALES_ALERT_KINDS = Object.freeze(['price_drop', 'restock']);
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 160 && value.trim() === value;
const amount = value => Number.isSafeInteger(value) && value >= 0;
const time = value => Number.isSafeInteger(value) && value > 0;
const variant = value => value === null || id(value);
const sameTarget = (a, b) => a.productId === b.productId && a.variantId === b.variantId;

export function isVerifiedSalesObservation(value) {
  return Boolean(value && value.verified === true && typeof value.published === 'boolean' &&
    id(value.productId) && variant(value.variantId) && time(value.observedAt) &&
    amount(value.priceTetri) && amount(value.stock));
}

export function evaluateSalesAlert(subscription, previous, current, nowMs) {
  // Consent is explicit and channel-specific. A consumed one-shot alert must
  // be re-subscribed; delivery deduplication is enforced by the future DB.
  if (!subscription || !id(subscription.id) || !id(subscription.userId) ||
      !SALES_ALERT_KINDS.includes(subscription.kind) || subscription.channel !== 'in_app' ||
      subscription.enabled !== true || subscription.consent !== true ||
      subscription.consumedAt !== null || !time(subscription.createdAt) ||
      !time(subscription.expiresAt) || !time(nowMs) ||
      subscription.createdAt > nowMs || subscription.expiresAt <= nowMs ||
      subscription.expiresAt <= subscription.createdAt ||
      !id(subscription.productId) || !variant(subscription.variantId)) return null;
  if (!isVerifiedSalesObservation(previous) || !isVerifiedSalesObservation(current) ||
      !sameTarget(subscription, previous) || !sameTarget(subscription, current) ||
      !previous.published || !current.published ||
      previous.observedAt < subscription.createdAt ||
      current.observedAt <= previous.observedAt || current.observedAt > nowMs ||
      current.stock === 0) return null;
  const qualifies = subscription.kind === 'restock'
    ? previous.stock === 0 && current.stock > 0
    : previous.priceTetri > current.priceTetri &&
      (subscription.targetPriceTetri === null ||
        (amount(subscription.targetPriceTetri) && current.priceTetri <= subscription.targetPriceTetri));
  if (!qualifies) return null;
  return {
    // Stable per subscription, independent of retry time or snapshot version.
    eventKey: JSON.stringify(['sales-alert-v1', subscription.id]),
    subscriptionId: subscription.id, userId: subscription.userId,
    kind: subscription.kind, channel: 'in_app',
    productId: current.productId, variantId: current.variantId,
    priceTetri: current.priceTetri, stock: current.stock, observedAt: current.observedAt
  };
}
