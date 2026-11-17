-- Stage 103E: settings module access. Publishing and high-impact pricing
-- operations remain primary-owner-only.

DROP POLICY IF EXISTS "Admin can delete store coupons" ON public.store_coupons;
CREATE POLICY "Staff with settings permission can delete store coupons"
  ON public.store_coupons FOR DELETE TO authenticated
  USING (public.has_staff_permission('settings'));

DROP POLICY IF EXISTS "Admin can insert store coupons" ON public.store_coupons;
CREATE POLICY "Staff with settings permission can insert store coupons"
  ON public.store_coupons FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_permission('settings'));

DROP POLICY IF EXISTS "Admin can update store coupons" ON public.store_coupons;
CREATE POLICY "Staff with settings permission can update store coupons"
  ON public.store_coupons FOR UPDATE TO authenticated
  USING (public.has_staff_permission('settings'))
  WITH CHECK (public.has_staff_permission('settings'));

DROP POLICY IF EXISTS "Admin can insert delivery fees" ON public.store_delivery_fees;
CREATE POLICY "Staff with settings permission can insert delivery fees"
  ON public.store_delivery_fees FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_permission('settings'));

DROP POLICY IF EXISTS "Admin can update delivery fees" ON public.store_delivery_fees;
CREATE POLICY "Staff with settings permission can update delivery fees"
  ON public.store_delivery_fees FOR UPDATE TO authenticated
  USING (public.has_staff_permission('settings'))
  WITH CHECK (public.has_staff_permission('settings'));

DROP POLICY IF EXISTS "GEOSTORE admin inserts storefront config" ON public.storefront_config;
CREATE POLICY "Staff with settings permission can insert storefront drafts"
  ON public.storefront_config FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_permission('settings'));

DROP POLICY IF EXISTS "GEOSTORE admin updates storefront config" ON public.storefront_config;
CREATE POLICY "Staff with settings permission can update storefront drafts"
  ON public.storefront_config FOR UPDATE TO authenticated
  USING (public.has_staff_permission('settings'))
  WITH CHECK (public.has_staff_permission('settings'));

DROP POLICY IF EXISTS "Read published config or admin config" ON public.storefront_config;
CREATE POLICY "Public can read published storefront config"
  ON public.storefront_config FOR SELECT TO anon, authenticated
  USING (is_published = true AND published_config IS NOT NULL);
CREATE POLICY "Settings staff can read storefront drafts"
  ON public.storefront_config FOR SELECT TO authenticated
  USING (public.has_staff_permission('settings'));

DROP POLICY IF EXISTS "GEOSTORE admin inserts storefront media" ON public.storefront_media;
CREATE POLICY "Staff with settings permission can insert storefront media"
  ON public.storefront_media FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_permission('settings'));

DROP POLICY IF EXISTS "GEOSTORE admin updates storefront media" ON public.storefront_media;
CREATE POLICY "Staff with settings permission can update storefront media"
  ON public.storefront_media FOR UPDATE TO authenticated
  USING (public.has_staff_permission('settings'))
  WITH CHECK (public.has_staff_permission('settings'));

DROP POLICY IF EXISTS "GEOSTORE admin deletes storefront media" ON public.storefront_media;
CREATE POLICY "Staff with settings permission can delete storefront media"
  ON public.storefront_media FOR DELETE TO authenticated
  USING (public.has_staff_permission('settings'));

DROP POLICY IF EXISTS "Read public media or admin media" ON public.storefront_media;
CREATE POLICY "Public can read public storefront media"
  ON public.storefront_media FOR SELECT TO anon, authenticated
  USING (is_public = true);
CREATE POLICY "Settings staff can read all storefront media"
  ON public.storefront_media FOR SELECT TO authenticated
  USING (public.has_staff_permission('settings'));

DROP POLICY IF EXISTS "GEOSTORE admin reads storefront versions" ON public.storefront_versions;
CREATE POLICY "Staff with settings permission can read storefront versions"
  ON public.storefront_versions FOR SELECT TO authenticated
  USING (public.has_staff_permission('settings'));

-- Keep the public active-coupon policy independent from the authenticated
-- permission helper (which is intentionally not executable by anon).
DROP POLICY IF EXISTS "public read active coupons" ON public.store_coupons;
CREATE POLICY "public read active coupons"
  ON public.store_coupons FOR SELECT TO anon, authenticated
  USING (active = true);
CREATE POLICY "Settings staff can read all store coupons"
  ON public.store_coupons FOR SELECT TO authenticated
  USING (public.has_staff_permission('settings'));

-- Draft settings may be edited, but publishing fields remain owner-only through
-- private.publish_storefront_config. Staff cannot set is_published directly.
REVOKE INSERT, UPDATE ON TABLE public.storefront_config FROM authenticated;
REVOKE INSERT (is_published, published_at, published_config),
       UPDATE (is_published, published_at, published_config)
  ON TABLE public.storefront_config FROM authenticated;

-- The media bucket is governed separately from its metadata table.
DROP POLICY IF EXISTS "Storefront media admin upload" ON storage.objects;
CREATE POLICY "Storefront media settings upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'storefront-media'
    AND public.has_staff_permission('settings')
  );

DROP POLICY IF EXISTS "Storefront media admin update" ON storage.objects;
CREATE POLICY "Storefront media settings update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'storefront-media'
    AND public.has_staff_permission('settings')
  )
  WITH CHECK (
    bucket_id = 'storefront-media'
    AND public.has_staff_permission('settings')
  );

DROP POLICY IF EXISTS "Storefront media admin delete" ON storage.objects;
CREATE POLICY "Storefront media settings delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'storefront-media'
    AND public.has_staff_permission('settings')
  );


DO $staff_settings_activity$
DECLARE
  v_definition text;
  v_original text;
BEGIN
  SELECT pg_get_functiondef('private.write_admin_activity_log(text)'::regprocedure)
    INTO v_definition;
  v_original := v_definition;

  v_definition := replace(
    v_definition,
    E'IF auth.uid() IS DISTINCT FROM ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid\n     OR auth.jwt()->''app_metadata''->>''role'' IS DISTINCT FROM ''admin'' THEN',
    E'IF NOT (\n      public.has_staff_permission(''products'') OR\n      public.has_staff_permission(''orders'') OR\n      public.has_staff_permission(''analytics'') OR\n      public.has_staff_permission(''expenses'') OR\n      public.has_staff_permission(''crm'') OR\n      public.has_staff_permission(''support'') OR\n      public.has_staff_permission(''settings'')\n    ) THEN'
  );

  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate write_admin_activity_log authorization guard.';
  END IF;

  EXECUTE regexp_replace(v_definition, ';[[:space:]]*$', '');
END;
$staff_settings_activity$;

-- Owner-only by design: storefront publication, flash-sale pricing campaigns,
-- employee administration and admin activity-log viewing.
