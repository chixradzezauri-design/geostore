-- Stage 100: safely reactivate delivered/completed orders without deducting stock twice.
-- Cancelled orders continue to restore stock atomically after validation.
-- This migration is staged in Git only; it is not applied to Production here.

CREATE OR REPLACE FUNCTION private.guard_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_password_auth_time bigint;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Delivered orders may return to the active queue only through the
  -- password-reauthenticated reactivation RPC. Stock markers must remain
  -- unchanged because completed orders already consumed their stock.
  IF OLD.status IN ('დასრულებული', 'ჩაბარებულია')
     AND NEW.status NOT IN ('დასრულებული', 'ჩაბარებულია') THEN
    IF NEW.status <> 'ახალი'
       OR OLD.stock_deducted_at IS NULL
       OR OLD.stock_restored_at IS NOT NULL
       OR NEW.stock_deducted_at IS DISTINCT FROM OLD.stock_deducted_at
       OR NEW.stock_restored_at IS DISTINCT FROM OLD.stock_restored_at
       OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
       OR coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
       OR coalesce(current_setting('geostore.order_reactivation', true), '') <> 'on' THEN
      RAISE EXCEPTION 'დასრულებული შეკვეთის ხელახლა გააქტიურება მხოლოდ დაცული პროცედურით არის შესაძლებელი.';
    END IF;

    SELECT max((entry->>'timestamp')::bigint)
      INTO v_password_auth_time
      FROM jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) AS entry
     WHERE entry->>'method' = 'password'
       AND coalesce(entry->>'timestamp', '') ~ '^[0-9]+$';

    IF v_password_auth_time IS NULL
       OR extract(epoch FROM now())::bigint - v_password_auth_time > 300
       OR v_password_auth_time > extract(epoch FROM now())::bigint + 30 THEN
      RAISE EXCEPTION 'ხელახლა გააქტიურებისთვის საჭიროა პაროლის ახლიდან დადასტურება.';
    END IF;

  ELSIF OLD.status IN ('გაგზავნილი', 'გზაშია')
     AND NEW.status NOT IN ('გაგზავნილი', 'გზაშია', 'დასრულებული', 'ჩაბარებულია') THEN
    RAISE EXCEPTION 'გაგზავნილი შეკვეთის წინა სტატუსზე დაბრუნება ან გაუქმება დაუშვებელია.';

  ELSIF OLD.status = 'გაუქმებული' AND NEW.status <> 'გაუქმებული' THEN
    IF NEW.status <> 'ახალი'
       OR OLD.stock_restored_at IS NULL
       OR OLD.stock_deducted_at IS NULL
       OR NEW.stock_restored_at IS NOT NULL
       OR NEW.stock_deducted_at IS NULL
       OR NEW.stock_deducted_at <= OLD.stock_deducted_at
       OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
       OR coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
       OR coalesce(current_setting('geostore.order_reactivation', true), '') <> 'on' THEN
      RAISE EXCEPTION 'გაუქმებული შეკვეთის ხელახლა გააქტიურება მხოლოდ დაცული პროცედურით არის შესაძლებელი.';
    END IF;

    SELECT max((entry->>'timestamp')::bigint)
      INTO v_password_auth_time
      FROM jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) AS entry
     WHERE entry->>'method' = 'password'
       AND coalesce(entry->>'timestamp', '') ~ '^[0-9]+$';

    IF v_password_auth_time IS NULL
       OR extract(epoch FROM now())::bigint - v_password_auth_time > 300
       OR v_password_auth_time > extract(epoch FROM now())::bigint + 30 THEN
      RAISE EXCEPTION 'ხელახლა გააქტიურებისთვის საჭიროა პაროლის ახლიდან დადასტურება.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


-- Keep the established public RPC wrapper and function signature for
-- backwards compatibility. The implementation now supports both terminal
-- delivered orders and cancelled orders with distinct stock semantics.
CREATE OR REPLACE FUNCTION private.admin_reactivate_cancelled_order(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order public.orders%rowtype;
  v_item record;
  v_updated integer;
  v_password_auth_time bigint;
BEGIN
  IF auth.uid() IS NULL
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  END IF;

  SELECT max((entry->>'timestamp')::bigint)
    INTO v_password_auth_time
    FROM jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) AS entry
   WHERE entry->>'method' = 'password'
     AND coalesce(entry->>'timestamp', '') ~ '^[0-9]+$';

  IF v_password_auth_time IS NULL
     OR extract(epoch FROM now())::bigint - v_password_auth_time > 300
     OR v_password_auth_time > extract(epoch FROM now())::bigint + 30 THEN
    RAISE EXCEPTION 'ხელახლა გააქტიურებისთვის საჭიროა ადმინისტრატორის პაროლის ახლიდან დადასტურება.';
  END IF;

  SELECT * INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'შეკვეთა ვერ მოიძებნა.';
  END IF;

  -- A completed/delivered order has already deducted stock. Reactivation
  -- changes only its workflow status and must never deduct the same items again.
  IF v_order.status IN ('დასრულებული', 'ჩაბარებულია') THEN
    IF v_order.stock_deducted_at IS NULL OR v_order.stock_restored_at IS NOT NULL THEN
      RAISE EXCEPTION 'დასრულებული შეკვეთის მარაგის აღრიცხვის მონაცემები ვერ დადასტურდა.';
    END IF;

    PERFORM set_config('geostore.order_reactivation', 'on', true);

    UPDATE public.orders
       SET status = 'ახალი',
           status_changed_at = now()
     WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'order_id', p_order_id,
      'status', 'ახალი',
      'stock_deducted', false,
      'stock_unchanged', true,
      'reauthorized', true
    );
  END IF;

  IF v_order.status <> 'გაუქმებული' THEN
    RAISE EXCEPTION 'ხელახლა გააქტიურება შესაძლებელია მხოლოდ დასრულებული ან გაუქმებული შეკვეთისთვის.';
  END IF;
  IF v_order.stock_restored_at IS NULL THEN
    RAISE EXCEPTION 'შეკვეთის მარაგის აღდგენის ჩანაწერი ვერ დადასტურდა.';
  END IF;
  IF v_order.stock_deducted_at IS NULL THEN
    RAISE EXCEPTION 'შეკვეთას მარაგის ჩამოჭრის ჩანაწერი არ აქვს.';
  END IF;
  IF jsonb_typeof(coalesce(v_order.items, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(coalesce(v_order.items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'შეკვეთის პროდუქტების სია ცარიელია ან არასწორია.';
  END IF;

  -- Validate every raw line before aggregation to prevent malformed,
  -- negative, or excessive quantities from being hidden by duplicate lines.
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(v_order.items) AS e(item)
     WHERE jsonb_typeof(e.item) IS DISTINCT FROM 'object'
        OR coalesce(trim(e.item->>'id'), '') = ''
        OR coalesce(e.item->>'quantity', '') !~ '^[0-9]{1,3}$'
        OR CASE
             WHEN coalesce(e.item->>'quantity', '') ~ '^[0-9]{1,3}$'
               THEN (e.item->>'quantity')::numeric NOT BETWEEN 1 AND 100
             ELSE true
           END
  ) THEN
    RAISE EXCEPTION 'შეკვეთის პროდუქტის ID ან რაოდენობა არასწორია.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(v_order.items) AS e(item)
     GROUP BY e.item->>'id', nullif(trim(e.item->>'customVariantId'), '')
    HAVING sum((e.item->>'quantity')::numeric) > 100
  ) THEN
    RAISE EXCEPTION 'ერთი პროდუქტის ან ვარიანტის ჯამური რაოდენობა 100-ს არ უნდა აღემატებოდეს.';
  END IF;

  PERFORM set_config('geostore.inventory_reason', 'order_reactivation', true);
  PERFORM set_config('geostore.inventory_order_id', p_order_id, true);
  PERFORM set_config('geostore.variant_stock_adjustment', 'on', true);

  FOR v_item IN
    SELECT item->>'id' AS product_id,
           nullif(trim(item->>'customVariantId'), '') AS custom_variant_id,
           sum((item->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(v_order.items) AS e(item)
     GROUP BY item->>'id', nullif(trim(item->>'customVariantId'), '')
     ORDER BY item->>'id', nullif(trim(item->>'customVariantId'), '')
  LOOP
    IF v_item.custom_variant_id IS NULL THEN
      UPDATE public.products
         SET stock = coalesce(stock, 0) - v_item.quantity
       WHERE id = v_item.product_id
         AND coalesce(stock, 0) >= v_item.quantity;
    ELSE
      UPDATE public.products p
         SET variants = (
           SELECT jsonb_agg(
             CASE WHEN element->>'id' = v_item.custom_variant_id
               THEN jsonb_set(element, '{stock}', to_jsonb((element->>'stock')::integer - v_item.quantity), true)
               ELSE element
             END
             ORDER BY ordinality
           )
           FROM jsonb_array_elements(
             CASE WHEN jsonb_typeof(p.variants) = 'array' THEN p.variants ELSE '[]'::jsonb END
           ) WITH ORDINALITY AS variant_rows(element, ordinality)
         )
       WHERE p.id = v_item.product_id
         AND EXISTS (
           SELECT 1
             FROM jsonb_array_elements(
               CASE WHEN jsonb_typeof(p.variants) = 'array' THEN p.variants ELSE '[]'::jsonb END
             ) AS element
            WHERE element->>'id' = v_item.custom_variant_id
              AND coalesce((element->>'stock')::integer, 0) >= v_item.quantity
         );
    END IF;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated <> 1 THEN
      RAISE EXCEPTION 'მარაგში აღარ არის საკმარისი რაოდენობა პროდუქტისთვის ან ვარიანტისთვის: %', v_item.product_id;
    END IF;
  END LOOP;

  PERFORM set_config('geostore.order_reactivation', 'on', true);

  UPDATE public.orders
     SET status = 'ახალი',
         stock_deducted_at = now(),
         stock_restored_at = NULL,
         status_changed_at = now()
   WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', 'ახალი',
    'stock_deducted', true,
    'stock_unchanged', false,
    'reauthorized', true
  );
END;
$function$;

-- Preserve the existing authenticated-only public wrapper and its grants.
CREATE OR REPLACE FUNCTION public.admin_reactivate_cancelled_order(p_order_id text)
RETURNS jsonb
LANGUAGE sql
SET search_path = ''
AS $function$
  SELECT private.admin_reactivate_cancelled_order(p_order_id);
$function$;
