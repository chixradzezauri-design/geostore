/** Prevent an older getUser() response from overwriting a newer auth event. */
export const isAuthRestoreCurrent = ({ mounted, restoreVersion, currentVersion }) => (
  mounted === true &&
  Number.isInteger(restoreVersion) &&
  Number.isInteger(currentVersion) &&
  restoreVersion === currentVersion
);

/** Prevents private checkout results from crossing authenticated identities. */
export const isSameAuthOwner = (activeOwnerId, submittedOwnerId) => (
  String(activeOwnerId ?? '') === String(submittedOwnerId ?? '')
);

/** Checkout may proceed only if identity stayed stable while restoring the session. */
export const isCheckoutOwnerConsistent = ({ initialOwnerId, sessionOwnerId, activeOwnerId }) => (
  isSameAuthOwner(initialOwnerId, sessionOwnerId) &&
  isSameAuthOwner(initialOwnerId, activeOwnerId)
);
