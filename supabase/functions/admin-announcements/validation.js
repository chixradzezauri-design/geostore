const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 5000;
const MAX_SELECTED_RECIPIENTS = 500;

const fail = (message) => {
  throw new TypeError(message);
};

const normalizeText = (value, field, maxLength) => {
  if (typeof value !== "string") fail(`${field} must be text.`);
  const normalized = value.trim();
  if (!normalized) fail(`${field} cannot be empty.`);
  if (normalized.length > maxLength) fail(`${field} is too long.`);
  // Permit normal whitespace, but reject NUL and non-whitespace control characters.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(normalized)) {
    fail(`${field} contains unsupported control characters.`);
  }
  return normalized;
};

export function normalizeAnnouncementDispatchInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("Invalid announcement payload.");
  }

  const requestId = typeof input.requestId === "string"
    ? input.requestId.trim().toLowerCase()
    : "";
  if (!UUID_PATTERN.test(requestId)) {
    fail("A valid idempotency request ID is required.");
  }

  const title = normalizeText(input.title, "Title", MAX_TITLE_LENGTH);
  const body = normalizeText(input.body, "Body", MAX_BODY_LENGTH);
  const mode = input.mode;

  if (mode === "all") {
    if (input.recipientIds !== undefined
      && (!Array.isArray(input.recipientIds) || input.recipientIds.length !== 0)) {
      fail("The all-users audience cannot include selected recipient IDs.");
    }
    return { requestId, title, body, mode, recipientIds: [] };
  }

  if (mode !== "selected") fail("A valid audience mode is required.");
  if (!Array.isArray(input.recipientIds) || input.recipientIds.length === 0) {
    fail("Select at least one recipient.");
  }
  if (input.recipientIds.length > MAX_SELECTED_RECIPIENTS) {
    fail(`The selected audience exceeds the limit of ${MAX_SELECTED_RECIPIENTS}.`);
  }

  const recipientIds = input.recipientIds.map((value) => {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
  });

  if (recipientIds.some((id) => !UUID_PATTERN.test(id))) {
    fail("The selected audience contains an invalid account ID.");
  }
  if (new Set(recipientIds).size !== recipientIds.length) {
    fail("The selected audience contains duplicate account IDs.");
  }

  return { requestId, title, body, mode, recipientIds };
}

export const ANNOUNCEMENT_DISPATCH_LIMITS = Object.freeze({
  title: MAX_TITLE_LENGTH,
  body: MAX_BODY_LENGTH,
  selectedRecipients: MAX_SELECTED_RECIPIENTS,
});
