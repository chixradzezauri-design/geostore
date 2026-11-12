const normalizeSearchValue = (value) => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const collectSearchableValues = (product) => {
  if (!product || typeof product !== 'object') return [];

  const values = [
    product.name,
    product.title,
    product.name_ka,
    product.name_en,
    product.name_ru,
    product.category,
    product.brand,
    product.vendor,
    product.sku,
    product.barcode,
    product.description,
    product.description_ka,
    product.description_en,
    product.description_ru,
    product.material,
    product.durability,
    product.model,
    product.cpu,
    product.ram,
    product.storage,
    product.gpu,
    product.screen_size,
    product.screenSize,
    product.os,
    product.tags,
    product.availableSizes,
    product.availableColors
  ];

  if (Array.isArray(product.variants)) {
    for (const variant of product.variants) {
      if (variant && typeof variant === 'object') {
        values.push(variant.name, variant.sku, variant.color, variant.size);
      }
    }
  }

  return values.flatMap(value => Array.isArray(value) ? value : [value])
    .filter(value => typeof value === 'string' || typeof value === 'number')
    .map(normalizeSearchValue)
    .filter(Boolean);
};

export const matchesProductSearch = (product, query) => {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  const searchableText = collectSearchableValues(product).join(' ');
  return normalizedQuery.split(' ').every(token => searchableText.includes(token));
};
