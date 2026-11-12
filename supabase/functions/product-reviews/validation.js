const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateReviewSubmission(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid review payload.");
  }

  const productId = typeof input.product_id === "string" ? input.product_id.trim() : "";
  const authorName = typeof input.author_name === "string" ? input.author_name.trim() : "";
  const reviewText = typeof input.review_text === "string" ? input.review_text.trim() : "";
  const rating = input.rating;
  const requestId = typeof input.request_id === "string" ? input.request_id.trim() : "";
  const imageDataUrl = input.image_data_url == null || input.image_data_url === ""
    ? null
    : input.image_data_url;

  if (!productId || productId.length > 128 || /[\u0000-\u001f\u007f]/.test(productId)) {
    throw new Error("Invalid product identifier.");
  }
  if (!authorName || authorName.length > 80) {
    throw new Error("Author name must contain 1 to 80 characters.");
  }
  if (!reviewText || reviewText.length > 1200) {
    throw new Error("Review text must contain 1 to 1200 characters.");
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be an integer from 1 to 5.");
  }
  if (!UUID_PATTERN.test(requestId)) {
    throw new Error("A valid request identifier is required.");
  }
  if (imageDataUrl !== null && typeof imageDataUrl !== "string") {
    throw new Error("Invalid review image.");
  }

  return { productId, authorName, reviewText, rating, requestId, imageDataUrl };
}

export function decodeReviewImageDataUrl(dataUrl, maxBytes = 1024 * 1024) {
  if (dataUrl == null || dataUrl === "") return null;
  if (typeof dataUrl !== "string" || dataUrl.length > Math.ceil(maxBytes * 4 / 3) + 128) {
    throw new Error("Review image exceeds the allowed size.");
  }

  const match = dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length % 4 !== 0) {
    throw new Error("Only valid JPEG, PNG, or WebP images are allowed.");
  }

  let binary;
  try {
    binary = atob(match[2]);
  } catch {
    throw new Error("Invalid base64 image data.");
  }

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytes.length < 3 || bytes.length > maxBytes) {
    throw new Error("Review image exceeds the allowed size.");
  }

  const mimeType = "image/" + match[1];
  const isJpeg = mimeType === "image/jpeg"
    && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = mimeType === "image/png"
    && bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50
    && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d
    && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isWebp = mimeType === "image/webp" && bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

  if (!isJpeg && !isPng && !isWebp) {
    throw new Error("The uploaded file signature does not match its image type.");
  }

  return {
    bytes,
    contentType: mimeType,
    extension: match[1] === "jpeg" ? "jpg" : match[1],
  };
}

export function isReviewImagePath(value) {
  if (typeof value !== "string" || value.length > 100) return false;
  const parts = value.split("/");
  if (parts.length !== 2) return false;
  const filenameParts = parts[1].split(".");
  if (filenameParts.length !== 2) return false;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(parts[0]) && uuidPattern.test(filenameParts[0])
    && ["jpg", "png", "webp"].includes(filenameParts[1].toLowerCase());
}

export function extractReviewClientIp(headers) {
  if (!headers || typeof headers.get !== "function") return null;
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const candidate of candidates) {
    const value = String(candidate || "").trim().toLowerCase();
    if (value && value.length <= 64 && !/[\s,]/.test(value)) return value;
  }
  return null;
}

export function canRemoveReviewImageAfterFailedInsert({
  verificationError = null,
  persistedReview = null,
  uploadedImagePath,
} = {}) {
  if (verificationError) return false;
  if (persistedReview == null) return true;
  if (typeof persistedReview !== "object"
    || !Object.prototype.hasOwnProperty.call(persistedReview, "image_path")) {
    return false;
  }
  return persistedReview.image_path !== uploadedImagePath;
}
