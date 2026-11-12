const PRODUCT_REVIEW_ADMIN_COLUMNS = 'id, product_id, author_name, rating, review_text, image_path, status, is_legacy, created_at, moderated_at';

export async function fetchAllProductReviews(supabaseClient, { pageSize = 500 } = {}) {
  if (!supabaseClient || typeof supabaseClient.from !== 'function') {
    throw new TypeError('A Supabase client is required to load product reviews.');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new RangeError('Product review page size must be an integer from 1 to 1000.');
  }

  const reviews = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseClient
      .from('product_reviews')
      .select(PRODUCT_REVIEW_ADMIN_COLUMNS)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const page = Array.isArray(data) ? data : [];
    reviews.push(...page);
    if (page.length < pageSize) return reviews;
  }
}


export function isCurrentAdminReviewRequest(isAdminLoggedIn, requestEpoch, currentEpoch) {
  return isAdminLoggedIn === true
    && Number.isSafeInteger(requestEpoch)
    && Number.isSafeInteger(currentEpoch)
    && requestEpoch === currentEpoch;
}
