BEGIN;

-- The public admin_delete_product wrapper is SECURITY INVOKER. It therefore
-- needs EXECUTE on the private implementation when called by authenticated
-- users. The private function still enforces the primary-admin UID and role.
-- Do not grant this function to PUBLIC or anon.
GRANT EXECUTE ON FUNCTION private.admin_delete_product(text) TO authenticated;

COMMIT;
