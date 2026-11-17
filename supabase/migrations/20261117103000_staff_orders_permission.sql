-- Stage 103A: grant the orders module to active staff with the orders permission.
-- The dedicated reactivation RPC and completed-order guard remain primary-owner-only.

DROP POLICY IF EXISTS "Primary admin can read orders" ON public.orders;
CREATE POLICY "Staff with orders permission can read orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.has_staff_permission('orders'));

DROP POLICY IF EXISTS "Admin can update orders" ON public.orders;
CREATE POLICY "Staff with orders permission can update orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.has_staff_permission('orders'))
  WITH CHECK (public.has_staff_permission('orders'));


CREATE OR REPLACE FUNCTION private.admin_update_order_status(p_order_id text, p_new_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order public.orders%rowtype;
  v_item record;
  v_updated integer;
  v_status_changed_at timestamptz;
BEGIN
  IF NOT public.has_staff_permission('orders') THEN
    RAISE EXCEPTION 'შეკვეთების მართვის უფლება არ გაქვთ.'
      USING ERRCODE = '42501';
  END IF;

  IF p_new_status IS NULL
     OR p_new_status NOT IN ('ახალი', 'მუშავდება', 'გაგზავნილი', 'დასრულებული', 'გაუქმებული') THEN
    RAISE EXCEPTION 'შეკვეთის სტატუსი არასწორია.';
  END IF;

  SELECT * INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'შეკვეთა ვერ მოიძებნა.';
  END IF;

  IF v_order.status IN ('დასრულებული', 'ჩაბარებულია')
     AND p_new_status NOT IN ('დასრულებული', 'ჩაბარებულია') THEN
    RAISE EXCEPTION 'ჩაბარებული შეკვეთის სტატუსის უკუსვლა მხოლოდ მთავარ ადმინისტრატორს შეუძლია ხელახლა გააქტიურების დაცული პროცესით.';
  END IF;

  IF v_order.status IN ('გაგზავნილი', 'გზაშია')
     AND p_new_status NOT IN ('გაგზავნილი', 'გზაშია', 'დასრულებული', 'ჩაბარებულია') THEN
    RAISE EXCEPTION 'გაგზავნილი შეკვეთის წინა სტატუსზე დაბრუნება ან გაუქმება დაუშვებელია.';
  END IF;

  IF v_order.status = 'გაუქმებული' AND p_new_status <> 'გაუქმებული' THEN
    RAISE EXCEPTION 'გაუქმებული შეკვეთის ხელახლა გააქტიურება მხოლოდ მთავარ ადმინისტრატორს შეუძლია.';
  END IF;

  IF p_new_status = 'გაუქმებული'
     AND v_order.status <> 'გაუქმებული'
     AND v_order.stock_deducted_at IS NOT NULL
     AND v_order.stock_restored_at IS NULL THEN
    PERFORM set_config('geostore.inventory_reason', 'order_cancellation', true);
    PERFORM set_config('geostore.inventory_order_id', p_order_id, true);

    IF jsonb_typeof(coalesce(v_order.items, '[]'::jsonb)) <> 'array'
       OR jsonb_array_length(coalesce(v_order.items, '[]'::jsonb)) = 0 THEN
      RAISE EXCEPTION 'შეკვეთის პროდუქტების სია ცარიელია ან არასწორია.';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM jsonb_array_elements(v_order.items) AS e(item)
       WHERE jsonb_typeof(e.item) IS DISTINCT FROM 'object'
          OR coalesce(trim(e.item->>'id'), '') = ''
          OR coalesce(e.item->>'quantity', '') !~ ('^[0-9]+' || chr(36))
          OR CASE
               WHEN coalesce(e.item->>'quantity', '') ~ ('^[0-9]+' || chr(36))
                 THEN (e.item->>'quantity')::numeric NOT BETWEEN 1 AND 100
               ELSE true
             END
    ) THEN
      RAISE EXCEPTION 'შეკვეთის პროდუქტის ID ან რაოდენობა არასწორია.';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM jsonb_array_elements(v_order.items) AS e(item)
       GROUP BY e.item->>'id'
      HAVING sum((e.item->>'quantity')::numeric) > 100
    ) THEN
      RAISE EXCEPTION 'ერთი პროდუქტის ჯამური რაოდენობა 100-ს არ უნდა აღემატებოდეს.';
    END IF;

    PERFORM set_config('geostore.variant_stock_adjustment', 'on', true);

    FOR v_item IN
      SELECT item->>'id' AS product_id,
             nullif(trim(item->>'customVariantId'), '') AS custom_variant_id,
             sum((item->>'quantity')::integer)::integer AS quantity
        FROM jsonb_array_elements(v_order.items) AS e(item)
       GROUP BY item->>'id', nullif(trim(item->>'customVariantId'), '')
       ORDER BY item->>'id', nullif(trim(item->>'customVariantId'), '')
    LOOP
      IF coalesce(trim(v_item.product_id), '') = ''
         OR v_item.quantity IS NULL
         OR v_item.quantity <= 0 THEN
        RAISE EXCEPTION 'შეკვეთის პროდუქტის ID ან რაოდენობა არასწორია.';
      END IF;

      IF v_item.custom_variant_id IS NULL THEN
        UPDATE public.products
           SET stock = coalesce(stock, 0) + v_item.quantity
         WHERE id = v_item.product_id;
      ELSE
        UPDATE public.products p
           SET variants = (
             SELECT jsonb_agg(
               CASE WHEN element->>'id' = v_item.custom_variant_id
                 THEN jsonb_set(element, '{stock}', to_jsonb((element->>'stock')::integer + v_item.quantity), true)
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
           );
      END IF;

      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated <> 1 THEN
        RAISE EXCEPTION 'მარაგის აღდგენა ვერ მოხერხდა პროდუქტისთვის ან ვარიანტისთვის: %', v_item.product_id;
      END IF;
    END LOOP;

    UPDATE public.orders
       SET status = p_new_status,
           stock_restored_at = now()
     WHERE id = p_order_id;
  ELSE
    UPDATE public.orders
       SET status = p_new_status
     WHERE id = p_order_id;
  END IF;

  SELECT status_changed_at
    INTO v_status_changed_at
    FROM public.orders
   WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', p_new_status,
    'status_changed_at', v_status_changed_at
  );
END;
$function$;


CREATE OR REPLACE FUNCTION private.admin_save_order_note(p_order_id text, p_admin_note text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT public.has_staff_permission('orders') THEN
    RAISE EXCEPTION 'შეკვეთების მართვის უფლება არ გაქვთ.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.orders
     SET admin_note = left(COALESCE(p_admin_note, ''), 5000)
   WHERE id::text = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN true;
END;
$function$;

-- Keep order reactivation owner-only. Its separate function and trigger guard
-- are intentionally not modified by this module permission migration.
