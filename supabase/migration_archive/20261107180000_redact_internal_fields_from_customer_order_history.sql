-- Customer order history must not expose internal product cost or vendor metadata.
-- Keep the private, authenticated email-scoped query and its existing return shape.
CREATE OR REPLACE FUNCTION private.get_my_orders()
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
    CASE
      WHEN jsonb_typeof(o.items) = 'array' THEN
        coalesce((
          SELECT jsonb_agg(
            CASE WHEN jsonb_typeof(entry.item) = 'object'
              THEN entry.item - 'purchase_cost' - 'vendor'
              ELSE entry.item
            END
            ORDER BY entry.ordinality
          )
          FROM jsonb_array_elements(o.items) WITH ORDINALITY AS entry(item, ordinality)
        ), '[]'::jsonb)
      ELSE '[]'::jsonb
    END,
    o.status_changed_at
  FROM public.orders AS o
  WHERE lower(btrim(coalesce(o.user_email, ''))) = v_email
    AND o.user_email <> 'guest'
  ORDER BY o.created_at DESC, o.id DESC;
END;
$function$;
