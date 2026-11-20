-- Allow settings-authorized staff to manage the dedicated hero image path.
-- Keep category/banner and product path permissions unchanged and scoped.
-- Public reads remain controlled by the bucket's existing public-read setting.

DROP POLICY IF EXISTS "Storefront media scoped upload" ON storage.objects;
CREATE POLICY "Storefront media scoped upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'storefront-media'
    AND (
      (
        (
          name LIKE 'storefront/categories/%'
          OR name LIKE 'storefront/banners/%'
          OR name LIKE 'storefront/hero/%'
        )
        AND public.has_staff_permission('settings')
      )
      OR (
        name LIKE 'products/%'
        AND public.has_staff_permission('products')
      )
    )
  );

DROP POLICY IF EXISTS "Storefront media scoped update" ON storage.objects;
CREATE POLICY "Storefront media scoped update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'storefront-media'
    AND (
      (
        (
          name LIKE 'storefront/categories/%'
          OR name LIKE 'storefront/banners/%'
          OR name LIKE 'storefront/hero/%'
        )
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
        (
          name LIKE 'storefront/categories/%'
          OR name LIKE 'storefront/banners/%'
          OR name LIKE 'storefront/hero/%'
        )
        AND public.has_staff_permission('settings')
      )
      OR (
        name LIKE 'products/%'
        AND public.has_staff_permission('products')
      )
    )
  );

DROP POLICY IF EXISTS "Storefront media scoped delete" ON storage.objects;
CREATE POLICY "Storefront media scoped delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'storefront-media'
    AND (
      (
        (
          name LIKE 'storefront/categories/%'
          OR name LIKE 'storefront/banners/%'
          OR name LIKE 'storefront/hero/%'
        )
        AND public.has_staff_permission('settings')
      )
      OR (
        name LIKE 'products/%'
        AND public.has_staff_permission('products')
      )
    )
  );
