import { isValidImageDataUrl } from './imageSafety.js';
const REVIEW_COLUMNS = "id, product_id, author_name, rating, review_text, image_path, created_at";

const getLocale = (locale) => (["ka-GE", "en-GB", "ru-RU"].includes(locale) ? locale : "ka-GE");

const formatReviewDate = (value, locale) => {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleDateString(getLocale(locale))
    : "";
};

const assertClient = (client) => {
  if (!client?.from || !client?.functions?.invoke) {
    throw new Error("შეფასებების სერვისი მიუწვდომელია.");
  }
};

export async function fetchApprovedProductReviews(client, productId, locale = "ka-GE") {
  assertClient(client);
  const normalizedProductId = String(productId ?? "").trim();
  if (!normalizedProductId || normalizedProductId.length > 128) {
    throw new Error("პროდუქტის იდენტიფიკატორი არასწორია.");
  }

  const { data, error } = await client
    .from("product_reviews")
    .select(REVIEW_COLUMNS)
    .eq("product_id", normalizedProductId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "შეფასებების ჩატვირთვა ვერ მოხერხდა.");
  const rows = Array.isArray(data) ? data : [];
  const imagePaths = [...new Set(rows
    .map((row) => row?.image_path)
    .filter((path) => typeof path === "string" && path.length > 0))];

  let signedUrls = {};
  if (imagePaths.length) {
    const { data: signedData, error: signError } = await client.functions.invoke("product-reviews", {
      body: { action: "sign-images", paths: imagePaths },
    });
    // Reviews remain readable if a private image link temporarily cannot be signed.
    // The opaque Storage path is never returned to the storefront as an image URL.
    if (!signError && signedData?.signed_urls && typeof signedData.signed_urls === "object") {
      signedUrls = signedData.signed_urls;
    }
  }

  return rows.map((row) => ({
    id: row.id,
    author: String(row.author_name || ""),
    comment: String(row.review_text || ""),
    rating: Number(row.rating),
    date: formatReviewDate(row.created_at, locale),
    image: typeof row.image_path === "string" ? signedUrls[row.image_path] || null : null,
    source: "server",
  }));
}

export function createProductReviewRequestId(cryptoProvider = globalThis.crypto) {
  if (typeof cryptoProvider?.randomUUID !== "function") {
    throw new Error("უსაფრთხო მოთხოვნის იდენტიფიკატორის შექმნა ვერ მოხერხდა.");
  }
  return cryptoProvider.randomUUID();
}

export async function submitProductReview(client, input, options = {}) {
  assertClient(client);
  const productId = String(input?.productId ?? "").trim();
  const author = String(input?.author ?? "").trim();
  const comment = String(input?.comment ?? "").trim();
  const rating = Number(input?.rating);
  const image = input?.image || null;

  if (!productId || productId.length > 128) throw new Error("პროდუქტის იდენტიფიკატორი არასწორია.");
  if (!author || author.length > 80) throw new Error("სახელი აუცილებელია და არ უნდა აღემატებოდეს 80 სიმბოლოს.");
  if (!comment || comment.length > 1200) throw new Error("შეფასების ტექსტი აუცილებელია და არ უნდა აღემატებოდეს 1200 სიმბოლოს.");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("შეფასება უნდა იყოს 1-დან 5 ვარსკვლავამდე.");
  if (image !== null && (typeof image !== "string" || !isValidImageDataUrl(image, 1024 * 1024))) throw new Error("შეფასების ფოტო არასწორია ან 1 MB-ს აღემატება.");

  const requestId = options.requestId || createProductReviewRequestId(options.cryptoProvider);
  const { data, error } = await client.functions.invoke("product-reviews", {
    body: {
      action: "submit",
      product_id: productId,
      author_name: author,
      review_text: comment,
      rating,
      image_data_url: image,
      request_id: requestId,
    },
  });

  if (error) {
    const status = error.context?.status;
    const detail = error.message || "შეფასების გაგზავნა ვერ მოხერხდა.";
    throw new Error(status ? `${detail} (HTTP ${status})` : detail);
  }
  if (!data?.success || !data?.review_id || !["pending", "approved"].includes(data.status)) {
    throw new Error("სერვერმა შეფასების მიღება ვერ დაადასტურა. სცადეთ მოგვიანებით.");
  }

  return {
    reviewId: data.review_id,
    status: data.status,
    pendingModeration: data.status === "pending" || data.pending_moderation === true,
  };
}
