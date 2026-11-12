const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_RESOLVED_RECIPIENTS = 100_000;

/**
 * Hashes the canonical, server-resolved dispatch payload.
 *
 * Call only after selected IDs have been resolved against Auth Admin, or after
 * the all-users directory has been snapshotted. The returned digest is stable
 * regardless of recipient ordering and is never accepted from the client.
 */
export async function digestAnnouncementDispatchPayload(input, resolvedRecipientIds) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("A normalized announcement payload is required.");
  }
  if (!["all", "selected"].includes(input.mode)) {
    throw new TypeError("A valid audience mode is required.");
  }
  if (typeof input.title !== "string" || !input.title.trim()
    || typeof input.body !== "string" || !input.body.trim()) {
    throw new TypeError("Normalized title and body are required.");
  }
  if (!Array.isArray(resolvedRecipientIds) || resolvedRecipientIds.length === 0) {
    throw new TypeError("The resolved audience cannot be empty.");
  }
  if (resolvedRecipientIds.length > MAX_RESOLVED_RECIPIENTS) {
    throw new TypeError("The resolved audience exceeds the safety limit.");
  }

  const recipients = resolvedRecipientIds.map((value) => {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
  });

  if (recipients.some((id) => !UUID_PATTERN.test(id))) {
    throw new TypeError("The resolved audience contains an invalid account ID.");
  }
  if (new Set(recipients).size !== recipients.length) {
    throw new TypeError("The resolved audience contains duplicate account IDs.");
  }

  if (input.mode === "selected") {
    if (!Array.isArray(input.recipientIds)) {
      throw new TypeError("The selected audience has not been normalized.");
    }
    const selected = input.recipientIds.map((id) =>
      typeof id === "string" ? id.trim().toLowerCase() : ""
    ).sort();
    const resolved = [...recipients].sort();
    if (selected.length !== resolved.length
      || selected.some((id, index) => id !== resolved[index])) {
      throw new TypeError("The resolved audience does not match the selected accounts.");
    }
  }

  const canonicalPayload = JSON.stringify({
    version: 1,
    title: input.title.trim(),
    body: input.body.trim(),
    mode: input.mode,
    recipientIds: recipients.sort(),
  });

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto SHA-256 is unavailable.");

  const bytes = new TextEncoder().encode(canonicalPayload);
  const digest = await subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export const ANNOUNCEMENT_DIGEST_LIMITS = Object.freeze({
  resolvedRecipients: MAX_RESOLVED_RECIPIENTS,
});
