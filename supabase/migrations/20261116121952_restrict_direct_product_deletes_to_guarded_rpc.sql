-- Product deletion must pass through the guarded RPC so order snapshots are preserved.
-- The RPC runs as its owner and remains callable by the authenticated admin.
DROP POLICY IF EXISTS "Admin can delete products" ON public.products;
REVOKE DELETE ON TABLE public.products FROM authenticated;
