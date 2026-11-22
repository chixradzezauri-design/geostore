-- Remove any legacy direct anon grant retained on the wrapper.
-- The private implementation continues to enforce owner identity and fresh
-- password authentication; only authenticated sessions need EXECUTE access.
REVOKE ALL ON FUNCTION public.admin_reopen_completed_order(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reopen_completed_order(text) TO authenticated;
