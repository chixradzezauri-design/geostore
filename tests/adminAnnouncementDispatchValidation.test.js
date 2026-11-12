import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAnnouncementDispatchInput,
  ANNOUNCEMENT_DISPATCH_LIMITS,
} from "../supabase/functions/admin-announcements/validation.js";

const requestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";

const base = {
  requestId,
  title: "  სიახლე  ",
  body: "  ახალი ინფორმაცია\nმეორე ხაზი  ",
  mode: "selected",
  recipientIds: [userA],
};

test("normalizes bounded plain-text fields and UUID casing", () => {
  assert.deepEqual(normalizeAnnouncementDispatchInput({
    ...base,
    requestId: requestId.toUpperCase(),
    recipientIds: [userA.toUpperCase()],
  }), {
    requestId,
    title: "სიახლე",
    body: "ახალი ინფორმაცია\nმეორე ხაზი",
    mode: "selected",
    recipientIds: [userA],
  });
});

test("accepts explicit all-users audience only without selected IDs", () => {
  assert.deepEqual(normalizeAnnouncementDispatchInput({
    requestId, title: "Title", body: "Body", mode: "all",
  }), {
    requestId, title: "Title", body: "Body", mode: "all", recipientIds: [],
  });
  assert.throws(() => normalizeAnnouncementDispatchInput({
    requestId, title: "Title", body: "Body", mode: "all", recipientIds: [userA],
  }), /cannot include selected/);
});

test("rejects missing idempotency key, invalid mode, and empty content", () => {
  assert.throws(() => normalizeAnnouncementDispatchInput({ ...base, requestId: "" }), /request ID/);
  assert.throws(() => normalizeAnnouncementDispatchInput({ ...base, mode: "unknown" }), /audience mode/);
  assert.throws(() => normalizeAnnouncementDispatchInput({ ...base, title: "  " }), /cannot be empty/);
  assert.throws(() => normalizeAnnouncementDispatchInput({ ...base, body: "" }), /cannot be empty/);
});

test("rejects oversized text and unsupported control characters", () => {
  assert.throws(() => normalizeAnnouncementDispatchInput({
    ...base, title: "x".repeat(ANNOUNCEMENT_DISPATCH_LIMITS.title + 1),
  }), /too long/);
  assert.throws(() => normalizeAnnouncementDispatchInput({
    ...base, body: "x".repeat(ANNOUNCEMENT_DISPATCH_LIMITS.body + 1),
  }), /too long/);
  assert.throws(() => normalizeAnnouncementDispatchInput({
    ...base, body: "unsafe\u0000text",
  }), /control characters/);
});

test("rejects empty, malformed, duplicate, and oversized selected audiences", () => {
  assert.throws(() => normalizeAnnouncementDispatchInput({ ...base, recipientIds: [] }), /at least one/);
  assert.throws(() => normalizeAnnouncementDispatchInput({ ...base, recipientIds: ["not-a-uuid"] }), /invalid account ID/);
  assert.throws(() => normalizeAnnouncementDispatchInput({ ...base, recipientIds: [userA, userA] }), /duplicate/);
  assert.throws(() => normalizeAnnouncementDispatchInput({
    ...base, recipientIds: Array.from({ length: ANNOUNCEMENT_DISPATCH_LIMITS.selectedRecipients + 1 }, (_, i) =>
      `${String(i + 1).padStart(8, "0")}-1111-4111-8111-111111111111`),
  }), /exceeds the limit/);
});

test("does not mutate the submitted payload", () => {
  const input = { ...base, recipientIds: [userA, userB] };
  const originalIds = [...input.recipientIds];
  normalizeAnnouncementDispatchInput(input);
  assert.deepEqual(input.recipientIds, originalIds);
});
