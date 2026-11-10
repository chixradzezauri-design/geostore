-- Customer order history keeps its normal item snapshot but removes internal
-- procurement, vendor, cost, margin, and profit fields from each returned item.
CREATE OR REPLACE FUNCTION private.get_my_orders()
RETURNS TABLE(
  id text,
  created_at timestamptz,
  total_gel numeric,
  status text,
  items jsonb,
  status_changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    o.id,
    o.created_at,
    o.total_gel,
    o.status,
    coalesce((
      SELECT jsonb_agg(
        item.value - ARRAY[
          'purchase_cost',
          'purchaseCost',
          'vendor',
          'unit_cost',
          'unitCost',
          'cost',
          'margin',
          'profit',
          'supplier',
          'supplier_name',
          'supplierName'
        ]::text[]
        ORDER BY item.ordinality
      )
      FROM jsonb_array_elements(coalesce(o.items, '[]'::jsonb))
        WITH ORDINALITY AS item(value, ordinality)
    ), '[]'::jsonb),
    o.status_changed_at
  FROM public.orders AS o
  WHERE o.user_id = auth.uid()
  ORDER BY o.created_at DESC, o.id DESC;
$function$;

REVOKE ALL ON FUNCTION private.get_my_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_my_orders() TO authenticated, service_role;
