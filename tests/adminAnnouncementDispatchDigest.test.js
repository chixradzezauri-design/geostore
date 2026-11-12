import test from "node:test";
import assert from "node:assert/strict";
import { digestAnnouncementDispatchPayload } from "../supabase/functions/admin-announcements/digest.js";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const base = {
  title: "სიახლე",
  body: "ახალი ინფორმაცია",
  mode: "selected",
  recipientIds: [userA, userB],
};

test("produces a stable SHA-256 digest independent of recipient order and UUID casing", async () => {
  const first = await digestAnnouncementDispatchPayload(base, [userA, userB]);
  const second = await digestAnnouncementDispatchPayload({
    ...base,
    recipientIds: [userB.toUpperCase(), userA.toUpperCase()],
  }, [userB.toUpperCase(), userA.toUpperCase()]);
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
});

test("digest changes when content or audience mode changes", async () => {
  const original = await digestAnnouncementDispatchPayload(base, [userA, userB]);
  const changedTitle = await digestAnnouncementDispatchPayload({
    ...base, title: "სხვა სათაური",
  }, [userA, userB]);
  const changedBody = await digestAnnouncementDispatchPayload({
    ...base, body: "სხვა ტექსტი",
  }, [userA, userB]);
  const changedAudience = await digestAnnouncementDispatchPayload({
    ...base, recipientIds: [userA],
  }, [userA]);
  const allMode = await digestAnnouncementDispatchPayload({
    title: base.title, body: base.body, mode: "all",
  }, [userA, userB]);

  assert.notEqual(original, changedTitle);
  assert.notEqual(original, changedBody);
  assert.notEqual(original, changedAudience);
  assert.notEqual(original, allMode);
});

test("all-users digest includes the exact resolved directory snapshot", async () => {
  const input = { title: "სიახლე", body: "ტექსტი", mode: "all" };
  const first = await digestAnnouncementDispatchPayload(input, [userA]);
  const expanded = await digestAnnouncementDispatchPayload(input, [userA, userB]);
  assert.notEqual(first, expanded);
});

test("rejects invalid, duplicate, empty, oversized, or mismatched resolved recipients", async () => {
  await assert.rejects(digestAnnouncementDispatchPayload(base, []), /cannot be empty/);
  await assert.rejects(digestAnnouncementDispatchPayload(base, ["invalid"]), /invalid account ID/);
  await assert.rejects(digestAnnouncementDispatchPayload(base, [userA, userA]), /duplicate/);
  await assert.rejects(digestAnnouncementDispatchPayload(base, [userA]), /does not match/);
  await assert.rejects(digestAnnouncementDispatchPayload(
    { title: "t", body: "b", mode: "all" },
    Array.from({ length: 100_001 }, (_, index) =>
      `${String(index + 1).padStart(8, "0")}-1111-4111-8111-111111111111`
    ),
  ), /safety limit/);
});
