-- Rewrite storefront RLS auth checks into the exact init-plan form recommended by Supabase.
-- Access conditions and roles remain unchanged.
DROP POLICY IF EXISTS "GEOSTORE admin deletes storefront config" ON public.storefront_config;
DROP POLICY IF EXISTS "GEOSTORE admin inserts storefront config" ON public.storefront_config;
DROP POLICY IF EXISTS "GEOSTORE admin updates storefront config" ON public.storefront_config;
DROP POLICY IF EXISTS "Read published config or admin config" ON public.storefront_config;

CREATE POLICY "GEOSTORE admin deletes storefront config"
ON public.storefront_config AS PERMISSIVE FOR DELETE TO authenticated
USING (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);
CREATE POLICY "GEOSTORE admin inserts storefront config"
ON public.storefront_config AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);
CREATE POLICY "GEOSTORE admin updates storefront config"
ON public.storefront_config AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
)
WITH CHECK (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);
CREATE POLICY "Read published config or admin config"
ON public.storefront_config AS PERMISSIVE FOR SELECT TO anon, authenticated
USING (
  (is_published = true AND published_config IS NOT NULL)
  OR (
    (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
    AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
  )
);

DROP POLICY IF EXISTS "GEOSTORE admin deletes storefront versions" ON public.storefront_versions;
DROP POLICY IF EXISTS "GEOSTORE admin inserts storefront versions" ON public.storefront_versions;
DROP POLICY IF EXISTS "GEOSTORE admin reads storefront versions" ON public.storefront_versions;
DROP POLICY IF EXISTS "GEOSTORE admin updates storefront versions" ON public.storefront_versions;
CREATE POLICY "GEOSTORE admin deletes storefront versions"
ON public.storefront_versions AS PERMISSIVE FOR DELETE TO authenticated
USING (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);
CREATE POLICY "GEOSTORE admin inserts storefront versions"
ON public.storefront_versions AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);
CREATE POLICY "GEOSTORE admin reads storefront versions"
ON public.storefront_versions AS PERMISSIVE FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);
CREATE POLICY "GEOSTORE admin updates storefront versions"
ON public.storefront_versions AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
)
WITH CHECK (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);

DROP POLICY IF EXISTS "GEOSTORE admin deletes storefront media" ON public.storefront_media;
DROP POLICY IF EXISTS "GEOSTORE admin inserts storefront media" ON public.storefront_media;
DROP POLICY IF EXISTS "GEOSTORE admin updates storefront media" ON public.storefront_media;
DROP POLICY IF EXISTS "Read public media or admin media" ON public.storefront_media;
CREATE POLICY "GEOSTORE admin deletes storefront media"
ON public.storefront_media AS PERMISSIVE FOR DELETE TO authenticated
USING (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);
CREATE POLICY "GEOSTORE admin inserts storefront media"
ON public.storefront_media AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);
CREATE POLICY "GEOSTORE admin updates storefront media"
ON public.storefront_media AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
)
WITH CHECK (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);
CREATE POLICY "Read public media or admin media"
ON public.storefront_media AS PERMISSIVE FOR SELECT TO anon, authenticated
USING (
  is_public = true
  OR (
    (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
    AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
  )
);
