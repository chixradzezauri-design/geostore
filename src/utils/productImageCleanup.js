export const normalizeProductImageList = (image, gallery) => {
  let galleryItems = gallery;
  if (typeof galleryItems === 'string') {
    try {
      const parsed = JSON.parse(galleryItems);
      galleryItems = Array.isArray(parsed) ? parsed : [galleryItems];
    } catch {
      galleryItems = galleryItems.trim() ? [galleryItems] : [];
    }
  }
  const candidates = [
    ...(Array.isArray(galleryItems) ? galleryItems : []),
    image
  ];
  return [...new Set(candidates
    .filter(value => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean))];
};

export const collectReferencedProductImageUrls = (products, excludedProductId) => {
  const referenced = new Set();
  if (!Array.isArray(products)) return referenced;

  for (const product of products) {
    if (!product || String(product.id) === String(excludedProductId)) continue;
    for (const url of normalizeProductImageList(product.image, product.gallery)) {
      referenced.add(url);
    }
  }

  return referenced;
};

/**
 * Only delete newly uploaded images when the product write is known not to
 * have committed. A lost network response is ambiguous, so retain files to
 * avoid persisting product rows that point at deleted images.
 */
export const shouldCleanupUploadedProductImages = (writeState) =>
  writeState === 'not-started' || writeState === 'rejected';

/**
 * Conservatively retain media when order history exists. Product image URLs
 * are copied into immutable order snapshots, so product deletion must not
 * break historical order details.
 */
export const shouldRetainProductImagesForOrderHistory = (orders) =>
  Array.isArray(orders) && orders.length > 0;
