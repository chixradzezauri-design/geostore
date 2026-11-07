export const collectReferencedProductImageUrls = (products, excludedProductId) => {
  const referenced = new Set();
  if (!Array.isArray(products)) return referenced;

  for (const product of products) {
    if (!product || String(product.id) === String(excludedProductId)) continue;
    const urls = [
      product.image,
      ...(Array.isArray(product.gallery) ? product.gallery : [])
    ];
    for (const url of urls) {
      if (typeof url === 'string' && url.trim()) referenced.add(url.trim());
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
