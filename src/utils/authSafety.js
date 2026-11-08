/** Prevent an older getUser() response from overwriting a newer auth event. */
export const isAuthRestoreCurrent = ({ mounted, restoreVersion, currentVersion }) => (
  mounted === true &&
  Number.isInteger(restoreVersion) &&
  Number.isInteger(currentVersion) &&
  restoreVersion === currentVersion
);
