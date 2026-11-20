import { getInventoryPositionKey } from './inventoryReplenishment.js';

const INVALID_LIST_MESSAGE = 'მარაგის პარამეტრების სია არასრულია ან არასწორია. მონაცემები არ განახლებულა; დაუკავშირდით ადმინისტრატორს.';
const INVALID_SAVE_MESSAGE = 'სერვერმა შენახვა ვერ დაადასტურა. განაახლეთ პარამეტრები ხელახლა შენახვამდე.';

const isValidRevision = value =>
  typeof value === 'string' &&
  /([zZ]|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value));

const isValidSetting = setting =>
  setting && typeof setting === 'object' &&
  typeof setting.product_id === 'string' && setting.product_id.trim() !== '' &&
  (setting.variant_id === null || (typeof setting.variant_id === 'string' && setting.variant_id.trim() !== '')) &&
  isValidRevision(setting.updated_at) &&
  typeof setting.low_stock_threshold === 'number' &&
  Number.isSafeInteger(setting.low_stock_threshold) &&
  setting.low_stock_threshold >= 0 && setting.low_stock_threshold <= 100000 &&
  typeof setting.target_stock === 'number' &&
  Number.isSafeInteger(setting.target_stock) &&
  setting.target_stock > setting.low_stock_threshold && setting.target_stock <= 1000000;

/** Reject incomplete, duplicate or malformed settings without changing the visible list. */
export const validateReplenishmentSettingsResponse = result => {
  if (!Array.isArray(result?.items) || result.has_more !== false || result.items.length > 1000) {
    throw new Error(INVALID_LIST_MESSAGE);
  }
  const seen = new Set();
  for (const setting of result.items) {
    if (!isValidSetting(setting)) throw new Error(INVALID_LIST_MESSAGE);
    const key = getInventoryPositionKey(setting.product_id, setting.variant_id);
    if (seen.has(key)) throw new Error(INVALID_LIST_MESSAGE);
    seen.add(key);
  }
  return result.items;
};

/** Require the server to acknowledge exactly the product, variant and values requested. */
export const validateReplenishmentSaveResponse = (result, position, threshold, target, expectedUpdatedAt = null) => {
  const setting = result?.setting;
  if (result?.success !== true || !isValidSetting(setting) ||
      setting.product_id !== String(position.productId) ||
      setting.variant_id !== (position.variantId ?? null) ||
      setting.low_stock_threshold !== threshold || setting.target_stock !== target ||
      (expectedUpdatedAt != null && setting.updated_at === expectedUpdatedAt)) {
    throw new Error(INVALID_SAVE_MESSAGE);
  }
  return setting;
};
