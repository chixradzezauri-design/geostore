-- Stage 57: keep admin RPCs behind invoker wrappers while preserving
-- the established staff-permission helper used by existing RLS policies.
BEGIN;

CREATE OR REPLACE FUNCTION private.list_inventory_movements(p_product_id text DEFAULT NULL::text, p_before_id bigint DEFAULT NULL::bigint, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT private.list_inventory_movements(p_product_id, p_before_id, p_limit);
$function$

CREATE OR REPLACE FUNCTION private.list_inventory_replenishment_settings(p_limit integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT private.list_inventory_replenishment_settings(p_limit);
$function$

CREATE OR REPLACE FUNCTION private.save_inventory_replenishment_setting(p_product_id text, p_variant_id text, p_low_stock_threshold integer, p_target_stock integer)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT private.save_inventory_replenishment_setting(
    p_product_id, p_variant_id, p_low_stock_threshold, p_target_stock
  );
$function$

CREATE OR REPLACE FUNCTION private.get_my_admin_access()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_staff public.admin_staff_members%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'is_admin', false,
      'is_staff', false,
      'role', null,
      'permissions', '{}'::jsonb
    );
  END IF;

  IF v_user_id = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     AND coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin' THEN
    RETURN jsonb_build_object(
      'is_admin', true,
      'is_staff', false,
      'role', 'owner',
      'permissions', jsonb_build_object(
        'products', true, 'orders', true, 'analytics', true,
        'expenses', true, 'crm', true, 'support', true, 'settings', true
      )
    );
  END IF;

  -- Do not expose staff-panel access before the invited email is confirmed.
  IF NOT EXISTS (
    SELECT 1
      FROM auth.users AS auth_user
     WHERE auth_user.id = v_user_id
       AND auth_user.email_confirmed_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'is_admin', false,
      'is_staff', false,
      'role', null,
      'permissions', '{}'::jsonb
    );
  END IF;

  SELECT staff.*
    INTO v_staff
    FROM public.admin_staff_members AS staff
   WHERE staff.user_id = v_user_id
     AND staff.is_active IS TRUE
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_admin', false,
      'is_staff', false,
      'role', null,
      'permissions', '{}'::jsonb
    );
  END IF;

  RETURN jsonb_build_object(
    'is_admin', false,
    'is_staff', true,
    'role', v_staff.role,
    'display_name', v_staff.display_name,
    'permissions', v_staff.permissions
  );
END;
$function$

CREATE OR REPLACE FUNCTION private.get_staff_analytics_summary(p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_to timestamptz := coalesce(p_to, now());
  v_from timestamptz := coalesce(p_from, now() - interval '30 days');
  v_summary jsonb;
  v_daily jsonb;
  v_top_products jsonb;
  v_statuses jsonb;
  v_revenue numeric := 0;
  v_completed_revenue numeric := 0;
  v_expenses numeric := 0;
  v_cost_of_goods numeric := 0;
  v_uncosted_lines bigint := 0;
  v_order_count bigint := 0;
  v_cancelled_count bigint := 0;
  v_average_order numeric := 0;
  v_can_view_financials boolean := public.has_staff_permission('expenses');
BEGIN
  IF NOT public.has_staff_permission('analytics') THEN
    RAISE EXCEPTION 'ანალიტიკის ნახვის უფლება არ გაქვთ.'
      USING ERRCODE = '42501';
  END IF;

  IF v_to <= v_from OR v_to - v_from > interval '366 days' THEN
    RAISE EXCEPTION 'ანალიტიკის პერიოდი უნდა იყოს 1-366 დღის ფარგლებში.'
      USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*) FILTER (WHERE o.status <> 'გაუქმებული'),
    count(*) FILTER (WHERE o.status = 'გაუქმებული'),
    coalesce(sum(o.total_gel) FILTER (WHERE o.status <> 'გაუქმებული'), 0),
    coalesce(sum(o.total_gel) FILTER (WHERE o.status IN ('დასრულებული', 'ჩაბარებულია')), 0),
    coalesce(avg(o.total_gel) FILTER (WHERE o.status <> 'გაუქმებული'), 0)
  INTO v_order_count, v_cancelled_count, v_revenue, v_completed_revenue, v_average_order
  FROM public.orders AS o
  WHERE o.created_at >= v_from
    AND o.created_at < v_to;

  IF v_can_view_financials THEN
    SELECT coalesce(sum(e.amount), 0)
      INTO v_expenses
      FROM public.expenses AS e
     WHERE e.created_at >= v_from
       AND e.created_at < v_to;

    SELECT coalesce(sum(
      CASE
        WHEN
          length(coalesce(item.value->>'purchase_cost', '')) BETWEEN 1 AND 12
          AND coalesce(item.value->>'purchase_cost', '') ~ '^[0-9]'
          AND regexp_replace(coalesce(item.value->>'purchase_cost', ''), '[0-9.]', '', 'g') = ''
          AND length(coalesce(item.value->>'purchase_cost', '')) - length(replace(coalesce(item.value->>'purchase_cost', ''), '.', '')) <= 1
          AND length(split_part(coalesce(item.value->>'purchase_cost', ''), '.', 1)) BETWEEN 1 AND 9
          AND (
            position('.' in coalesce(item.value->>'purchase_cost', '')) = 0
            OR length(split_part(coalesce(item.value->>'purchase_cost', ''), '.', 2)) BETWEEN 1 AND 2
          )
          AND CASE
            WHEN length(coalesce(item.value->>'quantity', '')) BETWEEN 1 AND 3
             AND regexp_replace(coalesce(item.value->>'quantity', ''), '[0-9]', '', 'g') = ''
            THEN (item.value->>'quantity')::integer BETWEEN 1 AND 100
            ELSE false
          END
        THEN (item.value->>'purchase_cost')::numeric * (item.value->>'quantity')::integer
        ELSE 0
      END
    ), 0)
      INTO v_cost_of_goods
      FROM public.orders AS o
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END
      ) AS item(value)
     WHERE o.created_at >= v_from
       AND o.created_at < v_to
       AND o.status <> 'გაუქმებული';

    SELECT count(*)
      INTO v_uncosted_lines
      FROM public.orders AS o
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END
      ) AS item(value)
     WHERE o.created_at >= v_from
       AND o.created_at < v_to
       AND o.status <> 'გაუქმებული'
       AND NOT (
         length(coalesce(item.value->>'purchase_cost', '')) BETWEEN 1 AND 12
         AND coalesce(item.value->>'purchase_cost', '') ~ '^[0-9]'
         AND regexp_replace(coalesce(item.value->>'purchase_cost', ''), '[0-9.]', '', 'g') = ''
         AND length(coalesce(item.value->>'purchase_cost', '')) - length(replace(coalesce(item.value->>'purchase_cost', ''), '.', '')) <= 1
         AND length(split_part(coalesce(item.value->>'purchase_cost', ''), '.', 1)) BETWEEN 1 AND 9
         AND (
           position('.' in coalesce(item.value->>'purchase_cost', '')) = 0
           OR length(split_part(coalesce(item.value->>'purchase_cost', ''), '.', 2)) BETWEEN 1 AND 2
         )
         AND length(coalesce(item.value->>'quantity', '')) BETWEEN 1 AND 3
         AND regexp_replace(coalesce(item.value->>'quantity', ''), '[0-9]', '', 'g') = ''
         AND CASE
           WHEN regexp_replace(coalesce(item.value->>'quantity', ''), '[0-9]', '', 'g') = ''
             AND length(coalesce(item.value->>'quantity', '')) BETWEEN 1 AND 3
           THEN (item.value->>'quantity')::integer BETWEEN 1 AND 100
           ELSE false
         END
       );
  END IF;

  SELECT coalesce(jsonb_object_agg(status, amount), '{}'::jsonb)
    INTO v_statuses
    FROM (
      SELECT o.status, count(*)::bigint AS amount
        FROM public.orders AS o
       WHERE o.created_at >= v_from
         AND o.created_at < v_to
       GROUP BY o.status
    ) AS status_counts;

  SELECT coalesce(jsonb_agg(to_jsonb(daily) ORDER BY daily.day), '[]'::jsonb)
    INTO v_daily
    FROM (
      SELECT
        (o.created_at AT TIME ZONE 'Asia/Tbilisi')::date AS day,
        count(*) FILTER (WHERE o.status <> 'გაუქმებული')::bigint AS orders,
        coalesce(sum(o.total_gel) FILTER (WHERE o.status <> 'გაუქმებული'), 0)::numeric(14,2) AS revenue
      FROM public.orders AS o
      WHERE o.created_at >= v_from
        AND o.created_at < v_to
      GROUP BY (o.created_at AT TIME ZONE 'Asia/Tbilisi')::date
      ORDER BY day
    ) AS daily;

  SELECT coalesce(jsonb_agg(to_jsonb(top_item) ORDER BY top_item.revenue DESC), '[]'::jsonb)
    INTO v_top_products
    FROM (
      SELECT
        item.value->>'id' AS product_id,
        left(coalesce(nullif(item.value->>'name', ''), 'პროდუქტი'), 100) AS product_name,
        sum(
          CASE
            WHEN length(coalesce(item.value->>'quantity', '')) BETWEEN 1 AND 3
             AND regexp_replace(coalesce(item.value->>'quantity', ''), '[0-9]', '', 'g') = ''
             AND CASE
               WHEN regexp_replace(coalesce(item.value->>'quantity', ''), '[0-9]', '', 'g') = ''
                 AND length(coalesce(item.value->>'quantity', '')) BETWEEN 1 AND 3
               THEN (item.value->>'quantity')::integer BETWEEN 1 AND 100
               ELSE false
             END
            THEN (item.value->>'quantity')::integer
            ELSE 0
          END
        )::bigint AS units,
        sum(
          CASE
            WHEN length(coalesce(item.value->>'price', '')) BETWEEN 1 AND 12
             AND coalesce(item.value->>'price', '') ~ '^[0-9]'
             AND regexp_replace(coalesce(item.value->>'price', ''), '[0-9.]', '', 'g') = ''
             AND length(coalesce(item.value->>'price', '')) - length(replace(coalesce(item.value->>'price', ''), '.', '')) <= 1
             AND length(split_part(coalesce(item.value->>'price', ''), '.', 1)) BETWEEN 1 AND 9
             AND (
               position('.' in coalesce(item.value->>'price', '')) = 0
               OR length(split_part(coalesce(item.value->>'price', ''), '.', 2)) BETWEEN 1 AND 2
             )
             AND CASE
               WHEN length(coalesce(item.value->>'quantity', '')) BETWEEN 1 AND 3
                AND regexp_replace(coalesce(item.value->>'quantity', ''), '[0-9]', '', 'g') = ''
               THEN (item.value->>'quantity')::integer BETWEEN 1 AND 100
               ELSE false
             END
            THEN (item.value->>'price')::numeric * (item.value->>'quantity')::integer
            ELSE 0
          END
        )::numeric(14,2) AS revenue
      FROM public.orders AS o
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END
      ) AS item(value)
      WHERE o.created_at >= v_from
        AND o.created_at < v_to
        AND o.status <> 'გაუქმებული'
        AND coalesce(item.value->>'id', '') <> ''
        AND length(coalesce(item.value->>'price', '')) BETWEEN 1 AND 12
        AND regexp_replace(coalesce(item.value->>'price', ''), '[0-9.]', '', 'g') = ''
        AND length(coalesce(item.value->>'quantity', '')) BETWEEN 1 AND 3
        AND regexp_replace(coalesce(item.value->>'quantity', ''), '[0-9]', '', 'g') = ''
        AND CASE
          WHEN regexp_replace(coalesce(item.value->>'quantity', ''), '[0-9]', '', 'g') = ''
            AND length(coalesce(item.value->>'quantity', '')) BETWEEN 1 AND 3
          THEN (item.value->>'quantity')::integer BETWEEN 1 AND 100
          ELSE false
        END
      GROUP BY item.value->>'id', left(coalesce(nullif(item.value->>'name', ''), 'პროდუქტი'), 100)
      ORDER BY revenue DESC
      LIMIT 5
    ) AS top_item;

  v_summary := jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'order_count', v_order_count,
    'cancelled_count', v_cancelled_count,
    'revenue', round(v_revenue, 2),
    'completed_revenue', round(v_completed_revenue, 2),
    'average_order_value', round(v_average_order, 2),
    'financials_available', v_can_view_financials,
    'expenses', CASE WHEN v_can_view_financials THEN round(v_expenses, 2) ELSE NULL END,
    'cost_of_goods', CASE WHEN v_can_view_financials THEN round(v_cost_of_goods, 2) ELSE NULL END,
    'gross_profit_before_expenses', CASE WHEN v_can_view_financials THEN round(v_revenue - v_cost_of_goods, 2) ELSE NULL END,
    'net_profit_estimate', CASE WHEN v_can_view_financials THEN round(v_revenue - v_cost_of_goods - v_expenses, 2) ELSE NULL END,
    'uncosted_item_lines', CASE WHEN v_can_view_financials THEN v_uncosted_lines ELSE NULL END,
    'status_counts', coalesce(v_statuses, '{}'::jsonb),
    'daily', coalesce(v_daily, '[]'::jsonb),
    'top_products', coalesce(v_top_products, '[]'::jsonb)
  );

  RETURN v_summary;
END;
$function$

CREATE OR REPLACE FUNCTION private.has_staff_permission(p_permission text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL
     OR p_permission IS NULL
     OR p_permission NOT IN (
       'products', 'orders', 'analytics', 'expenses', 'crm', 'support', 'settings'
     ) THEN
    RETURN false;
  END IF;

  -- The existing owner identity retains full access independently of staff rows.
  IF v_user_id = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     AND coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin' THEN
    RETURN true;
  END IF;

  -- Defense in depth: an invited staff account receives no permissions
  -- until Supabase Auth confirms ownership of its email address.
  IF NOT EXISTS (
    SELECT 1
      FROM auth.users AS auth_user
     WHERE auth_user.id = v_user_id
       AND auth_user.email_confirmed_at IS NOT NULL
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
      FROM public.admin_staff_members AS staff
     WHERE staff.user_id = v_user_id
       AND staff.is_active IS TRUE
       AND staff.permissions->>p_permission = 'true'
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_list_inventory_movements(p_product_id text DEFAULT NULL::text, p_before_id bigint DEFAULT NULL::bigint, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
  SELECT private.list_inventory_movements(p_product_id, p_before_id, p_limit);
$function$

CREATE OR REPLACE FUNCTION public.admin_list_inventory_replenishment_settings(p_limit integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
  SELECT private.list_inventory_replenishment_settings(p_limit);
$function$

CREATE OR REPLACE FUNCTION public.admin_save_inventory_replenishment_setting(p_product_id text, p_variant_id text, p_low_stock_threshold integer, p_target_stock integer)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
  SELECT private.save_inventory_replenishment_setting(
    p_product_id, p_variant_id, p_low_stock_threshold, p_target_stock
  );
$function$

CREATE OR REPLACE FUNCTION public.get_my_admin_access()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO ''
AS $function$
  SELECT private.get_my_admin_access();
$function$

CREATE OR REPLACE FUNCTION public.get_staff_analytics_summary(
  p_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_to timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO ''
AS $function$
  SELECT private.get_staff_analytics_summary(p_from, p_to);
$function$

CREATE OR REPLACE FUNCTION public.has_staff_permission(p_permission text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO ''
AS $function$
  SELECT private.has_staff_permission(p_permission);
$function$

REVOKE ALL ON FUNCTION private.list_inventory_movements(text, bigint, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.list_inventory_replenishment_settings(integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.save_inventory_replenishment_setting(text, text, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.get_my_admin_access() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.get_staff_analytics_summary(timestamp with time zone, timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.has_staff_permission(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_list_inventory_movements(text, bigint, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_list_inventory_replenishment_settings(integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_save_inventory_replenishment_setting(text, text, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_admin_access() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_staff_analytics_summary(timestamp with time zone, timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_staff_permission(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.list_inventory_movements(text, bigint, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.list_inventory_replenishment_settings(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.save_inventory_replenishment_setting(text, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_my_admin_access() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_staff_analytics_summary(timestamp with time zone, timestamp with time zone) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_staff_permission(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_inventory_movements(text, bigint, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_inventory_replenishment_settings(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_inventory_replenishment_setting(text, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_admin_access() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_staff_analytics_summary(timestamp with time zone, timestamp with time zone) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_staff_permission(text) TO authenticated, service_role;

COMMIT;
