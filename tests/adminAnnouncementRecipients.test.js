import test from "node:test";
import assert from "node:assert/strict";
import {
  listAnnouncementRecipients,
  toAnnouncementRecipient,
} from "../supabase/functions/admin-announcements/recipients.js";

const primaryAdminId = "1060de3d-d28a-45f8-9a64-5e0368cffc4b";
const customerId = "11111111-1111-4111-8111-111111111111";

test("recipient projection excludes primary admin, other admins, anonymous users and malformed IDs", () => {
  assert.equal(toAnnouncementRecipient({ id: primaryAdminId, email: "admin@example.test" }), null);
  assert.equal(toAnnouncementRecipient({
    id: "22222222-2222-4222-8222-222222222222",
    app_metadata: { role: "admin" },
  }), null);
  assert.equal(toAnnouncementRecipient({
    id: "33333333-3333-4333-8333-333333333333",
    is_anonymous: true,
  }), null);
  assert.equal(toAnnouncementRecipient({ id: "not-a-uuid", email: "bad@example.test" }), null);
});

test("recipient projection exposes only immutable identity and minimal display fields", () => {
  const recipient = toAnnouncementRecipient({
    id: customerId.toUpperCase(),
    email: " customer@example.test ",
    created_at: "2026-01-02T03:04:05.000Z",
    phone: "+995555000000",
    user_metadata: { full_name: "Private profile data" },
    app_metadata: { provider: "email" },
  });

  assert.deepEqual(recipient, {
    id: customerId,
    email: "customer@example.test",
    created_at: "2026-01-02T03:04:05.000Z",
    label: "customer@example.test",
  });
  assert.deepEqual(Object.keys(recipient).sort(), ["created_at", "email", "id", "label"]);
});

test("recipient projection gives accounts without email a non-sensitive fallback label", () => {
  const recipient = toAnnouncementRecipient({ id: customerId, created_at: "2026-01-02T00:00:00Z" });
  assert.equal(recipient.label, "მომხმარებელი · 11111111");
  assert.equal(recipient.email, null);
});

test("directory fetch paginates every Auth page and preserves page order", async () => {
  const calls = [];
  const users = [
    { id: customerId, email: "first@example.test" },
    { id: "22222222-2222-4222-8222-222222222222", email: "second@example.test" },
    { id: "33333333-3333-4333-8333-333333333333", email: "third@example.test" },
  ];

  const recipients = await listAnnouncementRecipients(async ({ page, perPage }) => {
    calls.push({ page, perPage });
    const start = (page - 1) * perPage;
    return { data: { users: users.slice(start, start + perPage) }, error: null };
  }, { perPage: 2, maxPages: 3 });

  assert.deepEqual(calls, [{ page: 1, perPage: 2 }, { page: 2, perPage: 2 }]);
  assert.deepEqual(recipients.map((recipient) => recipient.email), [
    "first@example.test",
    "second@example.test",
    "third@example.test",
  ]);
});

test("directory fails closed when an Auth page errors or is malformed", async () => {
  await assert.rejects(
    listAnnouncementRecipients(async () => ({ data: null, error: new Error("Auth unavailable") })),
    /directory could not be loaded/,
  );
  await assert.rejects(
    listAnnouncementRecipients(async () => ({ data: { users: null }, error: null })),
    /invalid page/,
  );
});

test("directory fails instead of silently returning a truncated audience at the page cap", async () => {
  await assert.rejects(
    listAnnouncementRecipients(async () => ({
      data: { users: [{ id: customerId, email: "customer@example.test" }] },
      error: null,
    }), { perPage: 1, maxPages: 1 }),
    /pagination limit/,
  );
});
