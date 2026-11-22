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

-- Draft writes use a narrow RPC because direct table INSERT/UPDATE is revoked.
-- It changes only the draft columns and can never publish or overwrite the live snapshot.
CREATE OR REPLACE FUNCTION private.save_storefront_draft(p_snapshot jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_staff_permission('settings') THEN
    RAISE EXCEPTION 'მაღაზიის მონახაზის შეცვლის უფლება არ გაქვთ.'
      USING ERRCODE = '42501';
  END IF;

  IF p_snapshot IS NULL
     OR jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_snapshot->'categories') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_snapshot->'banners') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_snapshot->'siteSettings') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'მაღაზიის მონახაზის მონაცემები არასწორია.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.storefront_config (
    config_key, draft_config, updated_by, draft_updated_at
  )
  VALUES (
    'storefront', p_snapshot, auth.uid(), now()
  )
  ON CONFLICT (config_key) DO UPDATE
    SET draft_config = EXCLUDED.draft_config,
        updated_by = EXCLUDED.updated_by,
        draft_updated_at = EXCLUDED.draft_updated_at
  RETURNING jsonb_build_object(
    'config_key', config_key,
    'draft_updated_at', draft_updated_at
  )
  INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_storefront_draft(p_snapshot jsonb)
RETURNS jsonb
LANGUAGE sql
SET search_path = ''
AS $function$
  SELECT private.save_storefront_draft(p_snapshot);
$function$;

REVOKE ALL ON FUNCTION private.save_storefront_draft(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.save_storefront_draft(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.save_storefront_draft(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_storefront_draft(jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_storefront_draft(jsonb) IS
  'Permission-checked draft-only storefront save; published config and version history remain unchanged.';


-- The shared media bucket contains three separate path namespaces.
-- Settings staff may manage only storefront banners/categories; product staff
-- may manage only product images. The owner bypass in has_staff_permission()
-- preserves the primary administrator's existing full access.
DROP POLICY IF EXISTS "Storefront media admin upload" ON storage.objects;
CREATE POLICY "Storefront media scoped upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'storefront-media'
    AND (
      (
        (name LIKE 'storefront/categories/%' OR name LIKE 'storefront/banners/%')
        AND public.has_staff_permission('settings')
      )
      OR (
        name LIKE 'products/%'
        AND public.has_staff_permission('products')
      )
    )
  );

DROP POLICY IF EXISTS "Storefront media admin update" ON storage.objects;
CREATE POLICY "Storefront media scoped update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'storefront-media'
    AND (
      (
        (name LIKE 'storefront/categories/%' OR name LIKE 'storefront/banners/%')
        AND public.has_staff_permission('settings')
      )
      OR (
        name LIKE 'products/%'
        AND public.has_staff_permission('products')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'storefront-media'
    AND (
      (
        (name LIKE 'storefront/categories/%' OR name LIKE 'storefront/banners/%')
        AND public.has_staff_permission('settings')
      )
      OR (
        name LIKE 'products/%'
        AND public.has_staff_permission('products')
      )
    )
  );

DROP POLICY IF EXISTS "Storefront media admin delete" ON storage.objects;
CREATE POLICY "Storefront media scoped delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'storefront-media'
    AND (
      (
        (name LIKE 'storefront/categories/%' OR name LIKE 'storefront/banners/%')
        AND public.has_staff_permission('settings')
      )
      OR (
        name LIKE 'products/%'
        AND public.has_staff_permission('products')
      )
    )
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
