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

export const collectReferencedOrderImageUrls = (orders) => {
  const referenced = new Set();
  if (!Array.isArray(orders)) return referenced;

  for (const order of orders) {
    const items = Array.isArray(order?.items) ? order.items : [];
    for (const item of items) {
      const urls = [
        item?.image,
        item?.image_url,
        item?.imageUrl,
        ...(Array.isArray(item?.gallery) ? item.gallery : [])
      ];
      for (const url of urls) {
        if (typeof url === 'string' && url.trim()) referenced.add(url.trim());
      }
    }
  }

  return referenced;
};
