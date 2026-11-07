-- Restore the authenticated customer's order history through a narrow RPC.
-- Never expose the full orders row (checkout idempotency payloads/results or admin data).

CREATE OR REPLACE FUNCTION private.get_my_orders()
RETURNS TABLE (
  id text,
  created_at timestamptz,
  customer_name text,
  phone text,
  address text,
  total_gel numeric,
  status text,
  items jsonb,
  status_changed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'მომხმარებლის ავტორიზაცია აუცილებელია.';
  END IF;

  v_email := lower(btrim(coalesce(auth.jwt()->>'email', '')));
  IF v_email = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.created_at,
    o.customer_name,
    o.phone,
    o.address,
    o.total_gel,
    o.status,
    coalesce(o.items, '[]'::jsonb),
    o.status_changed_at
  FROM public.orders AS o
  WHERE lower(btrim(coalesce(o.user_email, ''))) = v_email
    AND o.user_email <> 'guest'
  ORDER BY o.created_at DESC, o.id DESC;
END;
$function$;

REVOKE ALL ON FUNCTION private.get_my_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_my_orders() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_orders()
RETURNS TABLE (
  id text,
  created_at timestamptz,
  customer_name text,
  phone text,
  address text,
  total_gel numeric,
  status text,
  items jsonb,
  status_changed_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
  SELECT * FROM private.get_my_orders();
$function$;

REVOKE ALL ON FUNCTION public.get_my_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_orders() TO authenticated;
