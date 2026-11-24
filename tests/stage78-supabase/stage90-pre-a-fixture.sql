-- Stage90 TEST FIXTURE ONLY: restore exact current pre-Phase-A API boundary locally.
-- Do NOT run on Production. Never restore these finance-bearing grants as live rollback.
\set ON_ERROR_STOP on
DROP FUNCTION public.admin_order_ledger_page(integer,integer);
DROP FUNCTION public.admin_order_image_refs_page(integer,integer);
DROP FUNCTION private.admin_order_ledger_page(integer,integer);
DROP FUNCTION private.admin_order_image_refs_page(integer,integer);
GRANT SELECT ON public.orders TO authenticated;
CREATE OR REPLACE FUNCTION private.get_my_orders()
 RETURNS TABLE(id text, created_at timestamp with time zone, total_gel numeric, status text, items jsonb, status_changed_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.create_order_with_stock(p_order jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_phone text;
BEGIN
  IF p_order IS NULL OR jsonb_typeof(p_order) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'შეკვეთის მონაცემები არასწორია.';
  END IF;

  IF octet_length(p_order::text) > 65536 THEN
    RAISE EXCEPTION 'შეკვეთის მონაცემები ზედმეტად დიდია. შეამცირეთ პროდუქტების სია და სცადეთ ხელახლა.';
  END IF;

  IF coalesce(length(trim(p_order->>'id')), 0) NOT BETWEEN 6 AND 64
     OR coalesce(trim(p_order->>'id'), '') !~ '^[A-Za-z0-9_-]{6,64}$' THEN
    RAISE EXCEPTION 'შეკვეთის იდენტიფიკატორი არასწორია.';
  END IF;

  IF coalesce(length(trim(p_order->>'customer_name')), 0) NOT BETWEEN 2 AND 100
     OR coalesce(length(trim(p_order->>'address')), 0) NOT BETWEEN 3 AND 300
     OR coalesce(length(p_order->>'phone'), 0) > 32 THEN
    RAISE EXCEPTION 'სახელი, ტელეფონი ან მისამართი არასწორია.';
  END IF;

  v_phone := regexp_replace(coalesce(p_order->>'phone', ''), '[^0-9]', '', 'g');
  IF length(v_phone) NOT BETWEEN 9 AND 15 THEN
    RAISE EXCEPTION 'ტელეფონის ნომერი უნდა შეიცავდეს 9–15 ციფრს.';
  END IF;

  IF coalesce(length(p_order->>'customer_email'), 0) > 254
     OR coalesce(length(p_order->>'user_email'), 0) > 254
     OR coalesce(length(p_order->>'coupon_code'), 0) > 64
     OR coalesce(length(p_order->>'delivery_region'), 0) > 32 THEN
    RAISE EXCEPTION 'შეკვეთის დამატებითი ველები არასწორია.';
  END IF;

  IF jsonb_typeof(p_order->'items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'შეკვეთის პროდუქტების სია არასწორია.';
  END IF;

  IF jsonb_array_length(p_order->'items') NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'შეკვეთაში პროდუქტების რაოდენობა არასწორია.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_order->'items') AS entry(item)
     WHERE jsonb_typeof(item) IS DISTINCT FROM 'object'
        OR coalesce(length(trim(item->>'id')), 0) NOT BETWEEN 1 AND 64
        OR coalesce(length(item->>'selected_size'), 0) > 40
        OR coalesce(length(item->>'selected_color'), 0) > 60
        OR (item ? 'gift_wrap' AND jsonb_typeof(item->'gift_wrap') IS DISTINCT FROM 'boolean')
        OR (item ? 'vip_warranty' AND jsonb_typeof(item->'vip_warranty') IS DISTINCT FROM 'boolean')
        OR (item ? 'gift_message' AND jsonb_typeof(item->'gift_message') NOT IN ('string', 'null'))
        OR coalesce(length(item->>'gift_message'), 0) > 240
        OR (nullif(trim(item->>'gift_message'), '') IS NOT NULL AND item->'gift_wrap' IS DISTINCT FROM 'true'::jsonb)
  ) THEN
    RAISE EXCEPTION 'პროდუქტის მონაცემები არასწორია.';
  END IF;

  RETURN private.create_order_with_stock(p_order);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_orders()
 RETURNS TABLE(id text, created_at timestamp with time zone, total_gel numeric, status text, items jsonb, status_changed_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT * FROM private.get_my_orders();
$function$;
NOTIFY pgrst, 'reload schema';
