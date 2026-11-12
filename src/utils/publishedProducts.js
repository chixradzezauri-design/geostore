export const filterPublishedProducts = (products) => {
  if (!Array.isArray(products)) return [];
  return products.filter(product =>
    product?.is_published !== undefined
      ? product.is_published === true
      : product?.isPublished === true
  );
};

export const sanitizePublicProductCache = (products) =>
  filterPublishedProducts(products).map(product => {
    const publicProduct = { ...product };
    delete publicProduct.purchaseCost;
    delete publicProduct.purchase_cost;
    delete publicProduct.is_published;
    return { ...publicProduct, isPublished: true };
  });
