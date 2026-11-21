-- Stage 51: prevent checkout RPC responses from exposing private product cost data.
-- The existing server transaction stores purchase_cost for authorized finance
-- reports and continues to enforce stock, coupon, idempotency and auth rules.
-- This only replaces the public, SECURITY INVOKER response boundary.
-- IMPORTANT: staged GitHub migration; DO NOT apply to the production database
-- until reviewed and explicitly approved as part of the release.
BEGIN;

-- Bound the public guest-checkout payload before it reaches the stock/price transaction.
-- The private checkout implementation remains the only writer of orders and stock.
CREATE OR REPLACE FUNCTION public.create_order_with_stock(p_order jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_phone text;
  v_internal_result jsonb;
  v_public_items jsonb;
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
     OR coalesce(length(trim(p_order->>'address')), 0) NOT BETWEEN 3 AND 400
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

  -- Keep the authoritative private transaction and its stored checkout_result
  -- unchanged for stock/accounting. Only the Data API response is filtered.
  -- This also sanitizes idempotent replays of orders created before Stage51.
  v_internal_result := private.create_order_with_stock(p_order);
  IF jsonb_typeof(v_internal_result) IS DISTINCT FROM 'object'
     OR jsonb_typeof(v_internal_result->'items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'შეკვეთის დადასტურების მონაცემები არასწორია.';
  END IF;

  SELECT coalesce(
    jsonb_agg(
      entry.item - ARRAY['purchase_cost', 'purchaseCost', 'cost_price', 'costPrice']::text[]
      ORDER BY entry.line_no
    ),
    '[]'::jsonb
  )
  INTO v_public_items
  FROM jsonb_array_elements(v_internal_result->'items')
       WITH ORDINALITY AS entry(item, line_no);

  RETURN jsonb_set(v_internal_result, '{items}', v_public_items, false);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_order_with_stock(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock(jsonb) TO anon, authenticated;

COMMIT;
