-- Stage57: finance-scoped admin order reads without exposing order-cost snapshots.
-- Staged only in Draft PR #149. Requires existing staff permission foundation.
BEGIN;

CREATE OR REPLACE FUNCTION private.admin_order_ledger_page(
  p_offset integer DEFAULT 0, p_limit integer DEFAULT 1000
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
  v_finance boolean;
  v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_staff_permission('orders') THEN
    RAISE EXCEPTION 'შეკვეთების ნახვის უფლება არ გაქვთ.' USING ERRCODE = '42501';
  END IF;
  IF p_offset IS NULL OR p_offset < 0 OR p_offset > 100000
     OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'შეკვეთების გვერდის პარამეტრები არასწორია.' USING ERRCODE = '22023';
  END IF;
  v_finance := public.has_staff_permission('expenses');
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
      'created_at', o.created_at,
      'customer_name', o.customer_name,
      'phone', o.phone,
      'address', o.address,
      'user_email', o.user_email,
      'customer_email', o.customer_email,
      'user_id', o.user_id,
      'total_gel', o.total_gel,
      'status', o.status,
      'admin_note', o.admin_note,
      'status_changed_at', o.status_changed_at,
      'stock_deducted_at', o.stock_deducted_at,
      'stock_restored_at', o.stock_restored_at,
        'items', CASE
          WHEN v_finance THEN
            CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END
          ELSE coalesce((
            SELECT jsonb_agg(line.value - ARRAY['purchase_cost', 'purchaseCost', 'cost_price', 'costPrice', 'vendor', 'unit_cost', 'unitCost', 'cost', 'margin', 'profit', 'supplier', 'supplier_name', 'supplierName']::text[]
                             ORDER BY line.ordinality)
            FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END
            ) WITH ORDINALITY AS line(value, ordinality)
          ), '[]'::jsonb)
        END,
        -- Only these breakdown fields are used by the existing admin UI.
        -- Never return unfiltered checkout_result.items or checkout_request.
        'checkout_result', jsonb_build_object(
          'subtotal_gel', o.checkout_result->'subtotal_gel',
          'discount_gel', o.checkout_result->'discount_gel',
          'delivery_gel', o.checkout_result->'delivery_gel'
        ),
        'checkout_request', jsonb_build_object(
          'coupon_code', o.checkout_request->'coupon_code'
        )
      )
      ORDER BY o.created_at DESC, o.id ASC
    ), '[]'::jsonb
  ) INTO v_rows
  FROM (
    SELECT * FROM public.orders
    ORDER BY created_at DESC, id ASC
    LIMIT p_limit OFFSET p_offset
  ) o;
  RETURN v_rows;
END;
$fn$;

REVOKE ALL ON FUNCTION private.admin_order_ledger_page(integer,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.admin_order_ledger_page(integer,integer)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_order_ledger_page(
  p_offset integer DEFAULT 0, p_limit integer DEFAULT 1000
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO ''
AS $fn$ SELECT private.admin_order_ledger_page(p_offset,p_limit); $fn$;
REVOKE ALL ON FUNCTION public.admin_order_ledger_page(integer,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_order_ledger_page(integer,integer)
  TO authenticated;

-- Product-image Storage cleanup only needs original order item image paths.
-- No customer identities, revenue or finance fields are returned.
CREATE OR REPLACE FUNCTION private.admin_order_image_refs_page(
  p_offset integer DEFAULT 0, p_limit integer DEFAULT 1000
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_staff_permission('products') THEN
    RAISE EXCEPTION 'პროდუქტის ფოტოების გამოყენების შემოწმების უფლება არ გაქვთ.'
      USING ERRCODE = '42501';
  END IF;
  IF p_offset IS NULL OR p_offset < 0 OR p_offset > 100000
     OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'შეკვეთების ფოტოების გვერდის პარამეტრები არასწორია.'
      USING ERRCODE = '22023';
  END IF;
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'items', coalesce((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', line.value->'id',
              'product_id', line.value->'product_id',
              'image', line.value->'image',
              'image_url', line.value->'image_url',
              'imageUrl', line.value->'imageUrl',
              'gallery', line.value->'gallery'
            ) ORDER BY line.ordinality
          )
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END
          ) WITH ORDINALITY AS line(value, ordinality)
        ), '[]'::jsonb)
      )
      ORDER BY o.created_at ASC, o.id ASC
    ), '[]'::jsonb
  ) INTO v_rows
  FROM (
    SELECT items, created_at, id FROM public.orders
    ORDER BY created_at ASC, id ASC
    LIMIT p_limit OFFSET p_offset
  ) o;
  RETURN v_rows;
END;
$fn$;
REVOKE ALL ON FUNCTION private.admin_order_image_refs_page(integer,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.admin_order_image_refs_page(integer,integer)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_order_image_refs_page(
  p_offset integer DEFAULT 0, p_limit integer DEFAULT 1000
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO ''
AS $fn$ SELECT private.admin_order_image_refs_page(p_offset,p_limit); $fn$;
REVOKE ALL ON FUNCTION public.admin_order_image_refs_page(integer,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_order_image_refs_page(integer,integer)
  TO authenticated;

-- Compatibility-first rollout. Leave legacy direct table reads intact until
-- the new frontend is READY on Production, so old loaded admin clients do not
-- lose their orders during the Vercel/database cutover.
-- The required revocation is in 20261121213000_revoke_legacy_order_snapshot_reads.sql.
-- DO NOT treat this phase alone as finance privacy remediation.

COMMIT;
