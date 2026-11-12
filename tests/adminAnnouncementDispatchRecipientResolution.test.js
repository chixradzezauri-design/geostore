import test from "node:test";
import assert from "node:assert/strict";
import { resolveAnnouncementDispatchRecipients } from "../supabase/functions/admin-announcements/resolve-dispatch-recipients.js";

const adminId = "1060de3d-d28a-45f8-9a64-5e0368cffc4b";
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const userC = "33333333-3333-4333-8333-333333333333";

const authUser = (id, extras = {}) => ({
  id,
  email: `${id.slice(0, 8)}@example.test`,
  created_at: "2026-01-01T00:00:00.000Z",
  ...extras,
});

test("selected audience is resolved only through Auth Admin and preserves requested order", async () => {
  const calls = [];
  const result = await resolveAnnouncementDispatchRecipients(
    { mode: "selected", recipientIds: [userB, userA] },
    {
      getUserById: async (id) => {
        calls.push(id);
        return { data: { user: authUser(id) }, error: null };
      },
    },
  );
  assert.deepEqual(result, [userB, userA]);
  assert.deepEqual(calls.sort(), [userA, userB].sort());
});

test("selected audience rejects missing, admin, anonymous, and mismatched Auth accounts", async () => {
  await assert.rejects(resolveAnnouncementDispatchRecipients(
    { mode: "selected", recipientIds: [userA] },
    { getUserById: async () => ({ data: { user: null }, error: { message: "not found" } }) },
  ), /could not be verified/);

  await assert.rejects(resolveAnnouncementDispatchRecipients(
    { mode: "selected", recipientIds: [adminId] },
    { getUserById: async (id) => ({ data: { user: authUser(id, { app_metadata: { role: "admin" } }) } }) },
  ), /ineligible account/);

  await assert.rejects(resolveAnnouncementDispatchRecipients(
    { mode: "selected", recipientIds: [userA] },
    { getUserById: async (id) => ({ data: { user: authUser(id, { is_anonymous: true }) } }) },
  ), /ineligible account/);

  await assert.rejects(resolveAnnouncementDispatchRecipients(
    { mode: "selected", recipientIds: [userA] },
    { getUserById: async () => ({ data: { user: authUser(userB) } }) },
  ), /ineligible account/);
});

test("selected audience uses bounded parallel Auth lookups", async () => {
  let active = 0;
  let peak = 0;
  const ids = Array.from({ length: 31 }, (_, i) =>
    `${String(i + 10).padStart(8, "0")}-1111-4111-8111-111111111111`
  );
  const result = await resolveAnnouncementDispatchRecipients(
    { mode: "selected", recipientIds: ids },
    {
      getUserById: async (id) => {
        active += 1;
        peak = Math.max(peak, active);
        await Promise.resolve();
        active -= 1;
        return { data: { user: authUser(id) } };
      },
    },
  );
  assert.equal(result.length, ids.length);
  assert.ok(peak <= 10);
});

test("all-users audience snapshots only eligible Auth users across pages", async () => {
  const pages = [];
  const result = await resolveAnnouncementDispatchRecipients(
    { mode: "all" },
    {
      listUsers: async ({ page, perPage }) => {
        pages.push({ page, perPage });
        if (page === 1) {
          const fillers = Array.from({ length: 997 }, (_, index) =>
            authUser(`${String(index + 100).padStart(8, "0")}-1111-4111-8111-111111111111`)
          );
          return { data: { users: [
            authUser(userA),
            authUser(adminId, { app_metadata: { role: "admin" } }),
            authUser(userB, { is_anonymous: true }),
            ...fillers,
          ] } };
        }
        return { data: { users: [authUser(userC)] } };
      },
    },
  );
  assert.equal(result.length, 999);
  assert.equal(result[0], userA);
  assert.equal(result.at(-1), userC);
  assert.ok(!result.includes(adminId));
  assert.ok(!result.includes(userB));
  assert.deepEqual(pages, [{ page: 1, perPage: 1000 }, { page: 2, perPage: 1000 }]);
});

test("all-users audience fails closed on directory errors and empty audience", async () => {
  await assert.rejects(resolveAnnouncementDispatchRecipients(
    { mode: "all" },
    { listUsers: async () => ({ error: new Error("network") }) },
  ), /directory could not be loaded/);

  await assert.rejects(resolveAnnouncementDispatchRecipients(
    { mode: "all" },
    { listUsers: async () => ({ data: { users: [] } }) },
  ), /no eligible customer accounts/);
});

test("rejects unsupported modes and oversized selected audience before lookup", async () => {
  let calls = 0;
  await assert.rejects(resolveAnnouncementDispatchRecipients(
    { mode: "unknown" }, { getUserById: async () => { calls += 1; } },
  ), /valid audience mode/);
  await assert.rejects(resolveAnnouncementDispatchRecipients(
    { mode: "selected", recipientIds: Array(501).fill(userA) },
    { getUserById: async () => { calls += 1; } },
  ), /supported limit/);
  assert.equal(calls, 0);
});
