-- Customers use the phone + order-code tracking RPC for their order status.
-- Direct table reads are reserved for the verified primary administrator because
-- order rows contain internal purchase-cost snapshots and admin-only notes.
DROP POLICY IF EXISTS "Customers and admins can read orders" ON public.orders;

CREATE POLICY "Primary admin can read orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
  AND (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
);
