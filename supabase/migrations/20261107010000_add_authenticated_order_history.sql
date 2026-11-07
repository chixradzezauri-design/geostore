-- Return only the signed-in user's own orders.
-- This migration is intentionally staged; reconcile the live migration history before applying it.

CREATE OR REPLACE FUNCTION private.get_my_orders()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_email text;
  v_orders jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ავტორიზაცია საჭიროა შეკვეთების სანახავად.';
  END IF;

  v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'ანგარიშის ელფოსტა ვერ დადასტურდა.';
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'created_at', o.created_at,
        'customer_name', o.customer_name,
        'phone', o.phone,
        'address', o.address,
        'total_gel', o.total_gel,
        'status', o.status,
        -- Never expose internal purchase_cost values to customer accounts.
        'items', coalesce((
          SELECT jsonb_agg(item.value - 'purchase_cost' ORDER BY item.ordinality)
          FROM jsonb_array_elements(coalesce(o.items, '[]'::jsonb))
            WITH ORDINALITY AS item(value, ordinality)
        ), '[]'::jsonb),
        'status_changed_at', o.status_changed_at
      )
      ORDER BY o.created_at DESC, o.id ASC
    ),
    '[]'::jsonb
  )
  INTO v_orders
  FROM (
    SELECT id, created_at, customer_name, phone, address,
           total_gel, status, items, status_changed_at
    FROM public.orders
    WHERE lower(coalesce(user_email, '')) = v_email
    ORDER BY created_at DESC, id ASC
    LIMIT 100
  ) AS o;

  RETURN v_orders;
END;
$function$;

REVOKE ALL ON FUNCTION private.get_my_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_my_orders() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_orders()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT private.get_my_orders();
$function$;

REVOKE ALL ON FUNCTION public.get_my_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_orders() TO authenticated;
