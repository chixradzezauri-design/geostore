import test from "node:test";
import assert from "node:assert/strict";
import {
  canRemoveReviewImageAfterFailedInsert,
  decodeReviewImageDataUrl,
  extractReviewClientIp,
  isReviewImagePath,
  validateReviewSubmission,
} from "../supabase/functions/product-reviews/validation.js";

const validPayload = () => ({
  product_id: "prod-123",
  author_name: "  Nino  ",
  review_text: "  კარგი ხარისხია  ",
  rating: 5,
  request_id: "8c61b5e6-3b91-4f44-8b2f-14f0f31b9e2a",
});

test("normalizes valid review fields without accepting client moderation fields", () => {
  const payload = validateReviewSubmission({
    ...validPayload(),
    status: "approved",
    author_user_id: "attacker-controlled",
    verified_purchase: true,
  });
  assert.deepEqual(payload, {
    productId: "prod-123",
    authorName: "Nino",
    reviewText: "კარგი ხარისხია",
    rating: 5,
    requestId: "8c61b5e6-3b91-4f44-8b2f-14f0f31b9e2a",
    imageDataUrl: null,
  });
});

test("rejects blank and oversized author names", () => {
  assert.throws(() => validateReviewSubmission({ ...validPayload(), author_name: " " }));
  assert.throws(() => validateReviewSubmission({ ...validPayload(), author_name: "a".repeat(81) }));
});

test("rejects blank and oversized review text", () => {
  assert.throws(() => validateReviewSubmission({ ...validPayload(), review_text: " " }));
  assert.throws(() => validateReviewSubmission({ ...validPayload(), review_text: "a".repeat(1201) }));
});

test("accepts only integer ratings from one through five", () => {
  for (const rating of [0, 6, 2.5, "5", null]) {
    assert.throws(() => validateReviewSubmission({ ...validPayload(), rating }));
  }
});

test("requires a bounded product id and UUID idempotency key", () => {
  assert.throws(() => validateReviewSubmission({ ...validPayload(), product_id: "x".repeat(129) }));
  assert.throws(() => validateReviewSubmission({ ...validPayload(), product_id: "" }));
  assert.throws(() => validateReviewSubmission({ ...validPayload(), request_id: "not-a-uuid" }));
});

test("accepts valid PNG, JPEG, and WebP signatures", () => {
  const samples = [
    ["png", "iVBORw0KGgo="],
    ["jpeg", "/9j/AA=="],
    ["webp", "UklGRgAAAABXRUJQ"],
  ];
  for (const [type, base64] of samples) {
    const image = decodeReviewImageDataUrl("data:image/" + type + ";base64," + base64);
    assert.equal(image.contentType, "image/" + type);
  }
});

test("rejects MIME/signature mismatch and malformed base64", () => {
  assert.throws(() => decodeReviewImageDataUrl("data:image/png;base64,/9j/AA=="));
  assert.throws(() => decodeReviewImageDataUrl("data:image/jpeg;base64,not-base64!"));
  assert.throws(() => decodeReviewImageDataUrl("data:image/svg+xml;base64,PHN2Zz4="));
});

test("rejects review images larger than one megabyte", () => {
  const bytes = Buffer.alloc(1024 * 1024 + 1);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const dataUrl = "data:image/png;base64," + bytes.toString("base64");
  assert.throws(() => decodeReviewImageDataUrl(dataUrl));
});

test("accepts only opaque UUID review image paths", () => {
  const valid = "8c61b5e6-3b91-4f44-8b2f-14f0f31b9e2a/aa61b5e6-3b91-4f44-8b2f-14f0f31b9e2a.webp";
  assert.equal(isReviewImagePath(valid), true);
  assert.equal(isReviewImagePath("../private.png"), false);
  assert.equal(isReviewImagePath("review-id/image.png"), false);
});

test("extracts proxy client IP without returning a full forwarded chain", () => {
  const headers = new Headers({
    "x-forwarded-for": "203.0.113.8, 10.0.0.1",
    "cf-connecting-ip": "203.0.113.9",
  });
  assert.equal(extractReviewClientIp(headers), "203.0.113.9");
  assert.equal(extractReviewClientIp(new Headers()), null);
});


test("keeps an uploaded review image when the verified persisted row references it", () => {
  const uploadedImagePath = "8c61b5e6-3b91-4f44-8b2f-14f0f31b9e2a/aa61b5e6-3b91-4f44-8b2f-14f0f31b9e2a.webp";
  assert.equal(canRemoveReviewImageAfterFailedInsert({
    persistedReview: { image_path: uploadedImagePath },
    uploadedImagePath,
  }), false);
});

test("removes an uploaded review image only after verification proves it is unreferenced", () => {
  const uploadedImagePath = "8c61b5e6-3b91-4f44-8b2f-14f0f31b9e2a/aa61b5e6-3b91-4f44-8b2f-14f0f31b9e2a.webp";
  assert.equal(canRemoveReviewImageAfterFailedInsert({
    persistedReview: null,
    uploadedImagePath,
  }), true);
  assert.equal(canRemoveReviewImageAfterFailedInsert({
    persistedReview: { image_path: null },
    uploadedImagePath,
  }), true);
  assert.equal(canRemoveReviewImageAfterFailedInsert({
    persistedReview: { image_path: "another-review/another-image.jpg" },
    uploadedImagePath,
  }), true);
});

test("fails closed when persistence verification is uncertain or incomplete", () => {
  const uploadedImagePath = "8c61b5e6-3b91-4f44-8b2f-14f0f31b9e2a/aa61b5e6-3b91-4f44-8b2f-14f0f31b9e2a.webp";
  assert.equal(canRemoveReviewImageAfterFailedInsert({
    verificationError: new Error("network unavailable"),
    persistedReview: null,
    uploadedImagePath,
  }), false);
  assert.equal(canRemoveReviewImageAfterFailedInsert({
    persistedReview: {},
    uploadedImagePath,
  }), false);
});
