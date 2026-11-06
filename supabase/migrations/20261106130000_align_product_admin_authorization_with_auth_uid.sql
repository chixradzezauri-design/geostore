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

-- Reduce client-role table privileges that bypass row-level policies or are
-- not needed by the browser. TRUNCATE is not protected by RLS.
DO $$
DECLARE
  v_table record;
BEGIN
  FOR v_table IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE %I.%I FROM anon, authenticated',
      v_table.schemaname,
      v_table.tablename
    );
  END LOOP;
END;
$$;

-- Anonymous users may submit support tickets, but must not read, edit, or
-- delete ticket records. Keep published storefront reads, not anonymous writes.
REVOKE ALL PRIVILEGES ON TABLE public.expenses FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.messages FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.storefront_versions FROM anon;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.support_tickets FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.storefront_config FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.storefront_media FROM anon;
REVOKE DELETE ON TABLE public.orders FROM anon;

-- The legacy messages table has no active browser write path. Preserve existing
-- records and admin read/update/delete access, but remove anonymous/client inserts.
DROP POLICY IF EXISTS "Visitors can send chat messages" ON public.messages;
REVOKE INSERT ON TABLE public.messages FROM anon, authenticated;

-- Public support submission must not let a visitor forge an admin reply or
-- choose an arbitrary ticket status. The active form relies on the DB default
-- status ("ღია") and sends only the customer-provided fields.
DROP POLICY IF EXISTS "Visitors can submit support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Visitors can submit validated support tickets" ON public.support_tickets;
CREATE POLICY "Visitors can submit validated support tickets"
ON public.support_tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(btrim(id)) BETWEEN 1 AND 100
  AND char_length(btrim(customer_name)) BETWEEN 1 AND 100
  AND char_length(btrim(message)) BETWEEN 1 AND 5000
  AND char_length(coalesce(subject, '')) <= 160
  AND char_length(coalesce(email, '')) <= 254
  AND status = 'ღია'
  AND reply IS NULL
);
