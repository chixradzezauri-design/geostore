const FOOTWEAR_TERMS = ['ფეხსაცმელ', 'ბოტას', 'კედ', 'ბათინკ', 'shoe', 'sneaker', 'boot'];

const CLOTHING_SIZE_RANK = {
  XXS: 0,
  XS: 1,
  S: 2,
  M: 3,
  L: 4,
  XL: 5,
  XXL: 6,
  XXXL: 7
};

export const isFootwearProduct = (product) => {
  const text = `${product?.category || ''} ${product?.name || ''}`.toLocaleLowerCase();
  return FOOTWEAR_TERMS.some(term => text.includes(term));
};

const closestAvailableSize = (availableSizes, target, rankOf) => {
  const candidates = availableSizes
    .map(size => ({ size, rank: rankOf(size) }))
    .filter(item => Number.isFinite(item.rank));
  if (!candidates.length) return null;
  const closest = candidates.sort((a, b) =>
    Math.abs(a.rank - target) - Math.abs(b.rank - target) || a.rank - b.rank
  )[0];
  return Math.abs(closest.rank - target) <= 2 ? closest.size : null;
};

// This is a transparent heuristic, not an AI model or a brand-specific size chart.
export const estimateProductSize = ({
  product,
  heightCm,
  weightKg,
  footLengthCm,
  availableSizes = []
}) => {
  const sizes = Array.isArray(availableSizes)
    ? [...new Set(availableSizes.map(size => String(size ?? '').trim()).filter(Boolean))]
    : [];
  if (!sizes.length) return null;

  if (isFootwearProduct(product)) {
    const footLength = Number(footLengthCm);
    if (!Number.isFinite(footLength) || footLength < 18 || footLength > 35) return null;
    const targetEuSize = Math.round(1.5 * (footLength + 1.5));
    return closestAvailableSize(sizes, targetEuSize, size => {
      const match = size.match(/\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : NaN;
    });
  }

  const height = Number(heightCm);
  const weight = Number(weightKg);
  if (!Number.isFinite(height) || height < 130 || height > 220 ||
      !Number.isFinite(weight) || weight < 30 || weight > 200) return null;

  const bmi = weight / ((height / 100) ** 2);
  const targetSize = bmi < 18.5 ? 'S' : bmi < 23 ? 'M' : bmi < 27.5 ? 'L' : bmi < 32 ? 'XL' : 'XXL';
  const targetRank = CLOTHING_SIZE_RANK[targetSize];
  return closestAvailableSize(sizes, targetRank, size => {
    const normalized = size.toUpperCase().replace(/\s+/g, '');
    return Object.prototype.hasOwnProperty.call(CLOTHING_SIZE_RANK, normalized)
      ? CLOTHING_SIZE_RANK[normalized]
      : NaN;
  });
};
