-- Explicitly remove the stale anonymous EXECUTE grant on the completed-order reactivation wrapper.
-- The private implementation already requires the primary admin and fresh password authentication.
BEGIN;
REVOKE ALL ON FUNCTION public.admin_reopen_completed_order(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reopen_completed_order(text) TO authenticated, service_role;
COMMIT;
