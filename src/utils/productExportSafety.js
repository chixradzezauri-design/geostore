const validMoney = value => {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  const raw = String(value).trim();
  const number = Number(raw);
  return /^\d+(?:\.\d{1,2})?$/.test(raw) && Number.isFinite(number) && number >= 0 && number <= 1000000000 ? number.toFixed(2) : '';
};

const validStock = value => {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  const raw = String(value).trim();
  const number = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(number) && number >= 0 && number <= 1000000 ? number : '';
};

export const buildProductExportRows = products => {
  if (!Array.isArray(products)) return [];
  return products.filter(product => product && typeof product === 'object' && !Array.isArray(product)).map(product => {
    const variants = Array.isArray(product.variants) ? product.variants.map(variant => {
      if (!variant || typeof variant !== 'object' || Array.isArray(variant)) return '';
      const name = String(variant.name || 'ვარიანტი').trim();
      const price = validMoney(variant.priceGEL ?? variant.price_gel);
      const stock = validStock(variant.stock);
      return name + ' | ფასი: ' + (price === '' ? 'უცნობია' : price) + ' GEL | მარაგი: ' + (stock === '' ? 'უცნობია' : stock);
    }).filter(Boolean).join(' ; ') : '';
    const sizeOptions = product.availableSizes ?? product.available_sizes;
    const colorOptions = product.availableColors ?? product.available_colors;
    const sizes = Array.isArray(sizeOptions) ? sizeOptions.filter(value => typeof value === 'string' || typeof value === 'number').join(', ') : '';
    const colors = Array.isArray(colorOptions) ? colorOptions.filter(value => typeof value === 'string' || typeof value === 'number').join(', ') : '';
    return [
      product.id ?? '', product.sku || 'N/A', product.name ?? '', product.category ?? '',
      validMoney(product.priceGEL ?? product.price_gel),
      validMoney(product.oldPriceGEL ?? product.old_price_gel),
      validMoney(product.purchaseCost ?? product.purchase_cost),
      validStock(product.stock), sizes, colors, variants, product.vendor || 'GEOSTORE'
    ];
  });
};
