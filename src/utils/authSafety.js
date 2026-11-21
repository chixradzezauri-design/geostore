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
