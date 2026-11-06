-- Keep product administration authorization consistent with App.jsx and the
-- other privileged product RPCs: trusted admin role plus the immutable primary-admin UID.
-- This removes the fragile email comparison without changing product data or pricing.

CREATE OR REPLACE FUNCTION private.admin_list_products()
RETURNS SETOF public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to read admin product data'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.products
    ORDER BY created_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION private.admin_list_products() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_list_products() TO authenticated, service_role;

DROP POLICY IF EXISTS "Admin can insert products" ON public.products;
CREATE POLICY "Admin can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);

DROP POLICY IF EXISTS "Admin can update products" ON public.products;
CREATE POLICY "Admin can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
)
WITH CHECK (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);

DROP POLICY IF EXISTS "Admin can delete products" ON public.products;
CREATE POLICY "Admin can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);
