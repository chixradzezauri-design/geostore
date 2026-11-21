// Async finance and other private admin work must not outlive the mounted
// admin-panel instance. The parent remounts by principal and permissions;
// a component unmount may occur without adminLoggedIn ever becoming false.
//
// This only invalidates client-side callbacks, not requests already delivered
// to the server. Supabase RLS remains authoritative for those requests.
export function invalidateAdminSessionOperations({
  adminSessionActiveRef,
  adminSessionVersion,
  expenseMutationVersionRef,
  expenseMutationInFlightRef,
  expenseFetchRequestRef,
  expenseFetchInFlightRef,
  expenseExportInFlightRef,
  aiResponseVersionRef,
  aiResponseInFlightRef
}) {
  adminSessionActiveRef.current = false;
  adminSessionVersion.current += 1;
  expenseMutationVersionRef.current += 1;
  expenseMutationInFlightRef.current = false;
  expenseFetchRequestRef.current += 1;
  expenseFetchInFlightRef.current = false;
  expenseExportInFlightRef.current = false;
  aiResponseVersionRef.current += 1;
  aiResponseInFlightRef.current = false;
}
