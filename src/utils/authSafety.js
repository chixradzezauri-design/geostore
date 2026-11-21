/** Prevent an older getUser() response from overwriting a newer auth event. */
export const isAuthRestoreCurrent = ({ mounted, restoreVersion, currentVersion }) => (
  mounted === true &&
  Number.isInteger(restoreVersion) &&
  Number.isInteger(currentVersion) &&
  restoreVersion === currentVersion
);


/** A checkout response belongs only to its original verified cart owner. */
export const isCheckoutOwnerContextCurrent = ({
  startEpoch, currentEpoch, startOwnerId, currentOwnerId
}) => Number.isSafeInteger(startEpoch) && Number.isSafeInteger(currentEpoch) &&
  startEpoch === currentEpoch &&
  String(startOwnerId ?? '') === String(currentOwnerId ?? '');


/**
 * Never submit an authenticated checkout as a guest, or a guest checkout
 * using a session whose auth event has not yet reached the UI.
 */
export const validateCheckoutSessionIdentity = ({ uiUserId, activeOwnerId, session }) => {
  const uiId = String(uiUserId ?? '');
  const ownerId = String(activeOwnerId ?? '');
  const sessionId = String(session?.user?.id ?? '');
  if (uiId !== ownerId) return { valid: false, reason: 'owner' };
  if (!uiId) return sessionId ? { valid: false, reason: 'pending_auth' } : { valid: true };
  if (!sessionId || !session?.access_token || !session?.user?.email) {
    return { valid: false, reason: 'missing' };
  }
  return sessionId === uiId
    ? { valid: true }
    : { valid: false, reason: 'mismatch' };
};
