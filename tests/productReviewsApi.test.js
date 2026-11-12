import test from "node:test";
import assert from "node:assert/strict";
import {
  createProductReviewRequestId,
  fetchApprovedProductReviews,
  submitProductReview,
} from "../src/utils/productReviewsApi.js";

const makeQueryClient = ({ rows = [], queryError = null, signedUrls = {}, signError = null } = {}) => {
  const calls = [];
  const query = {
    select(columns) { calls.push(["select", columns]); return this; },
    eq(column, value) { calls.push(["eq", column, value]); return this; },
    order(column, options) { calls.push(["order", column, options]); return Promise.resolve({ data: rows, error: queryError }); },
  };
  const client = {
    from(table) { calls.push(["from", table]); return query; },
    functions: {
      async invoke(name, options) {
        calls.push(["invoke", name, options]);
        return signError
          ? { data: null, error: signError }
          : { data: { signed_urls: signedUrls }, error: null };
      },
    },
  };
  return { client, calls };
};

test("loads only approved reviews for the requested product and signs private images", async () => {
  const { client, calls } = makeQueryClient({
    rows: [{
      id: "review-1",
      product_id: "product-1",
      author_name: "Nino",
      rating: 5,
      review_text: "კარგია",
      image_path: "opaque/private/path.webp",
      created_at: "2026-11-10T10:00:00.000Z",
    }],
    signedUrls: { "opaque/private/path.webp": "https://signed.example/image?token=temporary" },
  });

  const reviews = await fetchApprovedProductReviews(client, "product-1", "en-GB");
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].author, "Nino");
  assert.equal(reviews[0].comment, "კარგია");
  assert.equal(reviews[0].image, "https://signed.example/image?token=temporary");
  assert.equal(reviews[0].source, "server");
  assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "status" && call[2] === "approved"));
  assert.ok(calls.some((call) => call[0] === "invoke" && call[2].body.action === "sign-images"));
});

test("does not expose a private Storage path when signing fails", async () => {
  const { client } = makeQueryClient({
    rows: [{
      id: "review-2", author_name: "Ana", rating: 4, review_text: "OK",
      image_path: "private/path.webp", created_at: "2026-11-10T10:00:00Z",
    }],
    signError: new Error("temporary signing failure"),
  });
  const [review] = await fetchApprovedProductReviews(client, "product-1");
  assert.equal(review.image, null);
  assert.equal(Object.values(review).includes("private/path.webp"), false);
});

test("rejects invalid product identifiers and surfaces database read failures", async () => {
  const { client } = makeQueryClient({ queryError: new Error("database unavailable") });
  await assert.rejects(fetchApprovedProductReviews(client, ""), /იდენტიფიკატორი/);
  await assert.rejects(fetchApprovedProductReviews(client, "product-1"), /database unavailable/);
});

test("submits a new review through the Edge Function and reports moderation status", async () => {
  let invocation;
  const client = {
    from() { throw new Error("not used"); },
    functions: {
      async invoke(name, options) {
        invocation = { name, options };
        return { data: { success: true, review_id: "review-3", status: "pending", pending_moderation: true }, error: null };
      },
    },
  };
  const result = await submitProductReview(client, {
    productId: "product-1", author: " Nino ", comment: " Great ", rating: 5, image: null,
  }, { requestId: "request-uuid" });
  assert.deepEqual(result, { reviewId: "review-3", status: "pending", pendingModeration: true });
  assert.equal(invocation.name, "product-reviews");
  assert.equal(invocation.options.body.request_id, "request-uuid");
  assert.equal(invocation.options.body.author_name, "Nino");
  assert.equal(invocation.options.body.review_text, "Great");
});

test("rejects invalid review input and unconfirmed server responses", async () => {
  const client = {
    // submitProductReview checks the client interface before validating input.
    from() { return {}; },
    functions: { async invoke() { return { data: { success: false }, error: null }; } },
  };
  await assert.rejects(submitProductReview(client, {
    productId: "product-1", author: "Nino", comment: "text", rating: 6,
  }, { requestId: "request-uuid" }), /1-დან 5/);
  await assert.rejects(submitProductReview(client, {
    productId: "product-1", author: "Nino", comment: "text", rating: 5, image: "data:image/svg+xml;base64,PHN2Zz4=",
  }, { requestId: "request-uuid" }), /ფოტო არასწორია/);
  await assert.rejects(submitProductReview(client, {
    productId: "product-1", author: "Nino", comment: "text", rating: 5,
  }, { requestId: "request-uuid" }), /ვერ დაადასტურა/);
});

test("creates only cryptographically random request identifiers", () => {
  assert.equal(createProductReviewRequestId({ randomUUID: () => "secure-uuid" }), "secure-uuid");
  assert.throws(() => createProductReviewRequestId({}), /უსაფრთხო მოთხოვნის/);
});
