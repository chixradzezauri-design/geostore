-- Keep admin catalogue order deterministic when multiple products share a timestamp.
-- The frontend also applies the same created_at/id tie-breaker.
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
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to read admin product data'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.products
    ORDER BY created_at DESC NULLS LAST, id ASC;
END;
$function$;
