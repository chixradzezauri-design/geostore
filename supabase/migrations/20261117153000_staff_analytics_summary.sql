-- Stage 103F: analytics-only staff receive aggregate metrics, never raw
-- orders, customer PII, expense rows or product purchase-cost records.

CREATE OR REPLACE FUNCTION public.get_staff_analytics_summary(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
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

  SELECT coalesce(sum(e.amount), 0)
    INTO v_expenses
    FROM public.expenses AS e
   WHERE e.created_at >= v_from
     AND e.created_at < v_to;

  SELECT coalesce(sum(
    (item.value->>'purchase_cost')::numeric * (item.value->>'quantity')::integer
  ), 0)
    INTO v_cost_of_goods
    FROM public.orders AS o
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END
    ) AS item(value)
   WHERE o.created_at >= v_from
     AND o.created_at < v_to
     AND o.status <> 'გაუქმებული'
     AND coalesce(item.value->>'purchase_cost', '') ~ '^[0-9]{1,9}([.][0-9]{1,2})?$'
     AND coalesce(item.value->>'quantity', '') ~ '^[0-9]{1,3}$'
     AND (item.value->>'quantity')::integer BETWEEN 1 AND 100;

  SELECT count(*)
    INTO v_uncosted_lines
    FROM public.orders AS o
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END
    ) AS item(value)
   WHERE o.created_at >= v_from
     AND o.created_at < v_to
     AND o.status <> 'გაუქმებული'
     AND (
       coalesce(item.value->>'purchase_cost', '') !~ '^[0-9]{1,9}([.][0-9]{1,2})?$'
       OR coalesce(item.value->>'quantity', '') !~ '^[0-9]{1,3}$'
       OR (item.value->>'quantity')::integer NOT BETWEEN 1 AND 100
     );

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
        sum((item.value->>'quantity')::integer)::bigint AS units,
        sum((item.value->>'price')::numeric * (item.value->>'quantity')::integer)::numeric(14,2) AS revenue
      FROM public.orders AS o
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END
      ) AS item(value)
      WHERE o.created_at >= v_from
        AND o.created_at < v_to
        AND o.status <> 'გაუქმებული'
        AND coalesce(item.value->>'id', '') <> ''
        AND coalesce(item.value->>'price', '') ~ '^[0-9]{1,9}([.][0-9]{1,2})?$'
        AND coalesce(item.value->>'quantity', '') ~ '^[0-9]{1,3}$'
        AND (item.value->>'quantity')::integer BETWEEN 1 AND 100
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
    'expenses', round(v_expenses, 2),
    'cost_of_goods', round(v_cost_of_goods, 2),
    'gross_profit_before_expenses', round(v_revenue - v_cost_of_goods, 2),
    'net_profit_estimate', round(v_revenue - v_cost_of_goods - v_expenses, 2),
    'uncosted_item_lines', v_uncosted_lines,
    'status_counts', coalesce(v_statuses, '{}'::jsonb),
    'daily', coalesce(v_daily, '[]'::jsonb),
    'top_products', coalesce(v_top_products, '[]'::jsonb)
  );

  RETURN v_summary;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_staff_analytics_summary(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_analytics_summary(timestamptz, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.get_staff_analytics_summary(timestamptz, timestamptz) IS
  'Read-only aggregate analytics for staff with analytics permission. Never returns order/customer/expense rows.';
