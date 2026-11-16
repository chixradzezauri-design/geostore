import { hasCustomProductVariants } from './productVariants.js';

const readTimestamp = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const timestamp = typeof value === 'number' ? value : Date.parse(String(value));
  return Number.isFinite(timestamp) ? timestamp : null;
};

const getProductSaleEnd = (product) => readTimestamp(
  product?.flashSaleEndsAt ?? product?.flash_sale_ends_at
);

export const getActiveFlashSaleProducts = (products, nowMs = Date.now()) => {
  if (!Array.isArray(products)) return [];

  return products
    .filter((product) => {
      if (!product || hasCustomProductVariants(product)) return false;

      const endsAt = getProductSaleEnd(product);
      if (endsAt === null || endsAt <= nowMs) return false;

      const startedAtValue = product.flashSaleStartedAt ?? product.flash_sale_started_at;
      const startedAt = readTimestamp(startedAtValue);
      if (startedAtValue && (startedAt === null || startedAt > nowMs)) return false;

      const originalPrice = Number(product.oldPriceGEL ?? product.old_price_gel);
      const salePrice = Number(product.priceGEL ?? product.price_gel);
      return Number.isFinite(originalPrice)
        && Number.isFinite(salePrice)
        && originalPrice > salePrice
        && salePrice >= 0;
    })
    .sort((left, right) => getProductSaleEnd(left) - getProductSaleEnd(right))
    .slice(0, 4);
};

export const getEarliestFlashSaleEnd = (products) => {
  if (!Array.isArray(products) || products.length === 0) return null;
  const ends = products
    .map(getProductSaleEnd)
    .filter((timestamp) => timestamp !== null);
  return ends.length > 0 ? Math.min(...ends) : null;
};

export const getFlashSaleCountdown = (endsAtMs, nowMs = Date.now()) => {
  const remainingSeconds = endsAtMs === null || endsAtMs === undefined
    ? 0
    : Math.max(0, Math.floor((endsAtMs - nowMs) / 1000));

  return {
    hours: Math.floor(remainingSeconds / 3600),
    minutes: Math.floor((remainingSeconds % 3600) / 60),
    seconds: remainingSeconds % 60
  };
};
