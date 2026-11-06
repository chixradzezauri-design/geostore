-- Public order tracking must not expose the raw order items JSON.
-- It contains purchase-cost and supplier metadata used only by admin analytics.
CREATE OR REPLACE FUNCTION private.lookup_order_for_tracking(p_order_id text, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_order public.orders%rowtype;
  v_input_phone text;
BEGIN
  v_input_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  IF coalesce(length(trim(p_order_id)), 0) < 6
     OR length(v_input_phone) < 9
     OR length(v_input_phone) > 15 THEN
    RETURN NULL;
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE upper(id) = upper(trim(p_order_id))
     AND regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = v_input_phone
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'totalGEL', v_order.total_gel,
    'status', coalesce(v_order.status, 'ახალი'),
    'date', to_char(v_order.created_at at time zone 'Asia/Tbilisi', 'DD.MM.YYYY'),
    'itemSummary', coalesce((
      SELECT string_agg(
        coalesce(item->>'name', 'პროდუქტი') || ' (x' || coalesce(item->>'quantity', '1') || ')',
        ', '
      )
      FROM jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) AS item
    ), 'პროდუქტები')
  );
END;
$function$;
