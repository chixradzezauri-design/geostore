const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIMARY_ADMIN_ID = "1060de3d-d28a-45f8-9a64-5e0368cffc4b";

export function toAnnouncementRecipient(user) {
  if (!user || typeof user !== "object" || Array.isArray(user)) return null;

  const id = typeof user.id === "string" ? user.id.trim().toLowerCase() : "";
  if (!UUID_PATTERN.test(id) || id === PRIMARY_ADMIN_ID) return null;
  if (user.app_metadata?.role === "admin" || user.is_anonymous === true) return null;

  const email = typeof user.email === "string" && user.email.trim()
    ? user.email.trim()
    : null;
  const createdAt = typeof user.created_at === "string" && user.created_at.trim()
    ? user.created_at
    : null;

  return {
    id,
    email,
    created_at: createdAt,
    label: email || `მომხმარებელი · ${id.slice(0, 8)}`,
  };
}

export async function listAnnouncementRecipients(
  listUsers,
  { perPage = 1000, maxPages = 100 } = {},
) {
  if (typeof listUsers !== "function") {
    throw new TypeError("Auth user-list function is required.");
  }
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 1000) {
    throw new RangeError("Auth page size must be between 1 and 1000.");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new RangeError("Auth page limit must be a positive integer.");
  }

  const recipients = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await listUsers({ page, perPage });
    if (result?.error) {
      throw new Error("Auth user directory could not be loaded.");
    }

    const users = result?.data?.users;
    if (!Array.isArray(users)) {
      throw new Error("Auth user directory returned an invalid page.");
    }

    for (const user of users) {
      const recipient = toAnnouncementRecipient(user);
      if (recipient) recipients.push(recipient);
    }

    if (users.length < perPage) return recipients;
  }

  throw new Error("Auth user directory exceeds the supported pagination limit.");
}
