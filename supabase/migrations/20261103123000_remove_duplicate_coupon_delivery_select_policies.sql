-- GEOSTORE: keep one SELECT policy per table while preserving public reads and admin management.
DROP POLICY IF EXISTS "Admin can manage store coupons" ON public.store_coupons;
ALTER POLICY "public read active coupons"
  ON public.store_coupons
  USING (
    active = true
    OR (
      COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
      AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzezauri@gmail.com'
    )
  );

CREATE POLICY "Admin can insert store coupons"
  ON public.store_coupons FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzezauri@gmail.com'
  );
CREATE POLICY "Admin can update store coupons"
  ON public.store_coupons FOR UPDATE TO authenticated
  USING (
    COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzezauri@gmail.com'
  )
  WITH CHECK (
    COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzezauri@gmail.com'
  );
CREATE POLICY "Admin can delete store coupons"
  ON public.store_coupons FOR DELETE TO authenticated
  USING (
    COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzezauri@gmail.com'
  );

DROP POLICY IF EXISTS "Admin can manage delivery fees" ON public.store_delivery_fees;
CREATE POLICY "Admin can insert delivery fees"
  ON public.store_delivery_fees FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzezauri@gmail.com'
  );
CREATE POLICY "Admin can update delivery fees"
  ON public.store_delivery_fees FOR UPDATE TO authenticated
  USING (
    COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzezauri@gmail.com'
  )
  WITH CHECK (
    COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzezauri@gmail.com'
  );
