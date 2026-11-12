import { isValidImageDataUrl } from './imageSafety.js';
export const PRODUCT_REVIEW_STORAGE_KEY = 'geostore_product_reviews';
export const MAX_PRODUCT_REVIEW_IMAGE_BYTES = 1024 * 1024;
export const MAX_PRODUCT_REVIEWS_PER_PRODUCT = 100;
export const getProductReviewList = (reviews, productId) => {
  const key = String(productId ?? '').trim();
  return key && reviews && typeof reviews === 'object' && Array.isArray(reviews[key]) ? reviews[key] : [];
};
export const readProductReviews = (storage) => {
  try {
    const target = storage ?? globalThis.localStorage;
    const raw = target?.getItem(PRODUCT_REVIEW_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
};
export const persistProductReviews = (reviews, storage) => {
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target || typeof target.setItem !== 'function') return false;
    target.setItem(PRODUCT_REVIEW_STORAGE_KEY, JSON.stringify(reviews));
    return true;
  } catch { return false; }
};
export const createProductReview = (input, options = {}) => {
  const author = String(input?.author ?? '').trim();
  const comment = String(input?.comment ?? '').trim();
  const rating = Number(input?.rating);
  const image = input?.image || null;
  if (!author || author.length > 80) throw new Error('სახელი აუცილებელია და არ უნდა აღემატებოდეს 80 სიმბოლოს.');
  if (!comment || comment.length > 1200) throw new Error('შეფასების ტექსტი აუცილებელია და არ უნდა აღემატებოდეს 1200 სიმბოლოს.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('შეფასება უნდა იყოს 1-დან 5 ვარსკვლავამდე.');
  if (image !== null && (typeof image !== 'string' || !isValidImageDataUrl(image, MAX_PRODUCT_REVIEW_IMAGE_BYTES))) throw new Error('შეფასების ფოტო არასწორია ან 1 MB-ს აღემატება.');
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const id = typeof globalThis.crypto?.randomUUID === 'function' ? `rev-${globalThis.crypto.randomUUID()}` : `rev-${now}-${Math.random().toString(36).slice(2, 10)}`;
  return { id, author, comment, rating, image, date: options.date || new Date(now).toLocaleDateString('ka-GE') };
};
export const appendProductReview = (reviews, productId, review) => {
  const key = String(productId ?? '').trim();
  if (!key || key.length > 128) throw new Error('პროდუქტის იდენტიფიკატორი არასწორია.');
  if (!reviews || typeof reviews !== 'object' || Array.isArray(reviews)) throw new Error('არსებული შეფასებების მონაცემები არასწორია; მონაცემები უცვლელად შენარჩუნებულია.');
  const current = reviews[key] ?? [];
  if (!Array.isArray(current)) throw new Error('ამ პროდუქტის ძველი შეფასებების ფორმატი არასწორია; მონაცემები უცვლელად შენარჩუნებულია.');
  if (current.length >= MAX_PRODUCT_REVIEWS_PER_PRODUCT) throw new Error('ამ პროდუქტზე შეფასებების ლიმიტი მიღწეულია.');
  return { ...reviews, [key]: [review, ...current] };
};
