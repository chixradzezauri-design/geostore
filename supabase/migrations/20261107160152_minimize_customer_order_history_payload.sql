-- Remove delivery contact details from the authenticated customer's order-history RPC.
-- The customer profile already has its own account contact fields; order history
-- needs only the order summary and item snapshot.

DROP FUNCTION public.get_my_orders();
DROP FUNCTION private.get_my_orders();

CREATE FUNCTION private.get_my_orders()
RETURNS TABLE (
  id text,
  created_at timestamptz,
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

CREATE FUNCTION public.get_my_orders()
RETURNS TABLE (
  id text,
  created_at timestamptz,
  total_gel numeric,
  status text,
  items jsonb,
  status_changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT * FROM private.get_my_orders();
$function$;

REVOKE ALL ON FUNCTION public.get_my_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_orders() TO authenticated;
