import { listAnnouncementRecipients, toAnnouncementRecipient } from "./recipients.js";

const MAX_SELECTED_RECIPIENTS = 500;
const MAX_ALL_RECIPIENTS = 100_000;
const SELECTED_LOOKUP_CONCURRENCY = 10;

/**
 * Resolve the final audience from the trusted Auth Admin API.
 * Never accept recipient profile data or eligibility from the browser.
 */
export async function resolveAnnouncementDispatchRecipients(
  input,
  { listUsers, getUserById },
) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("A normalized announcement request is required.");
  }

  if (input.mode === "selected") {
    if (!Array.isArray(input.recipientIds) || input.recipientIds.length === 0) {
      throw new TypeError("The selected audience cannot be empty.");
    }
    if (input.recipientIds.length > MAX_SELECTED_RECIPIENTS) {
      throw new RangeError("The selected audience exceeds the supported limit.");
    }
    if (typeof getUserById !== "function") {
      throw new TypeError("Auth Admin user lookup is required for selected recipients.");
    }

    const resolved = new Array(input.recipientIds.length);
    let cursor = 0;
    const workerCount = Math.min(SELECTED_LOOKUP_CONCURRENCY, input.recipientIds.length);

    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (true) {
        const index = cursor++;
        if (index >= input.recipientIds.length) return;

        const requestedId = input.recipientIds[index];
        let result;
        try {
          result = await getUserById(requestedId);
        } catch {
          throw new Error("A selected account could not be verified.");
        }

        if (result?.error || !result?.data?.user) {
          throw new Error("A selected account could not be verified.");
        }

        const recipient = toAnnouncementRecipient(result.data.user);
        if (!recipient || recipient.id !== requestedId) {
          throw new Error("The selected audience contains an ineligible account.");
        }
        resolved[index] = recipient.id;
      }
    }));

    return resolved;
  }

  if (input.mode === "all") {
    const recipients = await listAnnouncementRecipients(listUsers, {
      perPage: 1000,
      maxPages: 100,
    });
    if (recipients.length === 0) {
      throw new Error("There are no eligible customer accounts to notify.");
    }
    if (recipients.length > MAX_ALL_RECIPIENTS) {
      throw new RangeError("The customer audience exceeds the supported safety limit.");
    }
    return recipients.map((recipient) => recipient.id);
  }

  throw new TypeError("A valid audience mode is required.");
}

export const ANNOUNCEMENT_RECIPIENT_RESOLUTION_LIMITS = Object.freeze({
  selectedRecipients: MAX_SELECTED_RECIPIENTS,
  allRecipients: MAX_ALL_RECIPIENTS,
  selectedLookupConcurrency: SELECTED_LOOKUP_CONCURRENCY,
});
