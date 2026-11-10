-- Preserve the authenticated owner on every new customer order.
-- Patch only the final INSERT in the existing checkout function so all stock,
-- pricing, coupon, idempotency, validation and order-snapshot logic is retained.
DO $migration$
DECLARE
  v_definition text;
  v_old text := $old$
  insert into public.orders(id, customer_name, phone, address, user_email, customer_email, items,
    total_gel, status, stock_deducted_at, checkout_result, checkout_request)
  values (v_order_id, p_order->>'customer_name', p_order->>'phone', p_order->>'address',
    v_user_email, v_customer_email, v_items, v_total, 'ახალი', now(), v_result, v_request);
$old$;
  v_new text := $new$
  insert into public.orders(id, customer_name, phone, address, user_email, user_id, customer_email, items,
    total_gel, status, stock_deducted_at, checkout_result, checkout_request)
  values (v_order_id, p_order->>'customer_name', p_order->>'phone', p_order->>'address',
    v_user_email, auth.uid(), v_customer_email, v_items, v_total, 'ახალი', now(), v_result, v_request);
$new$;
BEGIN
  SELECT pg_get_functiondef('private.create_order_with_stock(jsonb)'::regprocedure)
    INTO v_definition;

  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Expected order insert statement was not found; migration stopped without changing the function.';
  END IF;

  IF length(v_definition) - length(replace(v_definition, v_old, '')) <> length(v_old) THEN
    RAISE EXCEPTION 'Expected exactly one order insert statement; migration stopped without changing the function.';
  END IF;

  EXECUTE replace(v_definition, v_old, v_new);
END;
$migration$;
