BEGIN;

-- Remove both the table privilege and the RLS policy so direct DELETE cannot
-- bypass the guarded SECURITY DEFINER RPC. The table owner/service role keeps
-- its own capability; authenticated admins use public.admin_delete_product.
DROP POLICY IF EXISTS "Admin can delete products" ON public.products;
REVOKE DELETE ON TABLE public.products FROM PUBLIC, anon, authenticated;

-- Keep the private implementation inaccessible to API roles. The public
-- SECURITY INVOKER wrapper is separately granted to authenticated users.
REVOKE ALL ON FUNCTION private.admin_delete_product(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(text) TO authenticated;

COMMIT;
