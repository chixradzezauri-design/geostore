-- GEOSTORE: avoid per-row JWT function evaluation in the admin product INSERT policy.
ALTER POLICY "Admin can insert products"
ON public.products
WITH CHECK (
  COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
  AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzezauri@gmail.com'
);
