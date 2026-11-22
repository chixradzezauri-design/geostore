-- Stage54: complete existing customer-history financial field redaction.
-- Checkout (Stage51) already removes cost_price/costPrice from its public
-- receipt, but the separately served authenticated order-history RPC's
-- existing blacklist omitted these aliases. Keep all historical fields,
-- immutable user_id ownership, privileges and finance snapshots unchanged.
-- DRAFT ONLY: do not apply on Production before coordinated release approval.
BEGIN;

-- Stage71: prevent replacing customer history on a different live schema.
-- The disposable test fixture intentionally has no preexisting private RPC,
-- so this guard checks its required tables and auth.uid(), not data rows.
DO $stage71_history_preflight$
BEGIN
  IF to_regclass('public.orders') IS NULL OR to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'Stage71: order ownership or Supabase Auth prerequisite missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('id','text'), ('user_id','uuid'), ('created_at','timestamp with time zone'),
      ('total_gel','numeric'), ('status','text'), ('items','jsonb'),
      ('status_changed_at','timestamp with time zone')
    ) AS expected(column_name,data_type)
    LEFT JOIN information_schema.columns actual
      ON actual.table_schema='public' AND actual.table_name='orders'
     AND actual.column_name=expected.column_name
    WHERE actual.column_name IS NULL OR actual.data_type<>expected.data_type
  ) THEN
    RAISE EXCEPTION 'Stage71: order-history schema drift; no customer RPC replacement';
  END IF;
END $stage71_history_preflight$;


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
          'cost_price',
          'costPrice',
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

COMMIT;
