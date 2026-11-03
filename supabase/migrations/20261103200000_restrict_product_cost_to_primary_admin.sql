-- GEOSTORE: restrict privileged product data and product writes to the primary admin.
-- Existing products, purchase costs, prices, and stock quantities are unchanged.

CREATE OR REPLACE FUNCTION private.admin_list_products()
RETURNS SETOF public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR lower(COALESCE(v_jwt ->> 'email', '')) <> 'chixradzeuri@gmail.com' THEN
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
ON public.products FOR INSERT TO authenticated
WITH CHECK (
  COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
  AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzeuri@gmail.com'
);

DROP POLICY IF EXISTS "Admin can update products" ON public.products;
CREATE POLICY "Admin can update products"
ON public.products FOR UPDATE TO authenticated
USING (
  COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
  AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzeuri@gmail.com'
)
WITH CHECK (
  COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
  AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzeuri@gmail.com'
);

DROP POLICY IF EXISTS "Admin can delete products" ON public.products;
CREATE POLICY "Admin can delete products"
ON public.products FOR DELETE TO authenticated
USING (
  COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
  AND lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) = 'chixradzeuri@gmail.com'
);
