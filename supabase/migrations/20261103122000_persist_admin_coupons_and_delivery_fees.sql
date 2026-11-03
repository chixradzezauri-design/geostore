-- GEOSTORE: persist admin-managed coupons and delivery fees in the database.
-- Public read policies remain unchanged; all write access is restricted to the verified primary admin.

GRANT INSERT, UPDATE, DELETE ON TABLE public.store_coupons TO authenticated;
CREATE POLICY "Admin can manage store coupons"
  ON public.store_coupons
  FOR ALL
  TO authenticated
  USING (
    COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzezauri@gmail.com'
  )
  WITH CHECK (
    COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzezauri@gmail.com'
  );

GRANT INSERT, UPDATE ON TABLE public.store_delivery_fees TO authenticated;
CREATE POLICY "Admin can manage delivery fees"
  ON public.store_delivery_fees
  FOR ALL
  TO authenticated
  USING (
    COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzezauri@gmail.com'
  )
  WITH CHECK (
    COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzezauri@gmail.com'
  );
