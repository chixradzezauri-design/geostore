-- Allow the primary administrator to correct an accidentally completed order.
-- Reopening changes only the order status: the original checkout stock deduction
-- remains in place, and no product or variant inventory is modified.

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

  -- A completed order can be reopened only to the active queue, through the
  -- dedicated RPC, after fresh password authentication. Its stock ledger must
  -- remain exactly as it was: deducted and not restored.
  IF OLD.status IN ('დასრულებული', 'ჩაბარებულია')
     AND NEW.status NOT IN ('დასრულებული', 'ჩაბარებულია') THEN
    IF NEW.status <> 'ახალი'
       OR OLD.stock_deducted_at IS NULL
       OR OLD.stock_restored_at IS NOT NULL
       OR NEW.stock_deducted_at IS DISTINCT FROM OLD.stock_deducted_at
       OR NEW.stock_restored_at IS DISTINCT FROM OLD.stock_restored_at
       OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
       OR coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
       OR coalesce(current_setting('geostore.completed_order_reopen', true), '') <> 'on' THEN
      RAISE EXCEPTION 'დასრულებული შეკვეთის ხელახლა გახსნა მხოლოდ დაცული პროცედურით არის შესაძლებელი.';
    END IF;

    SELECT max((entry->>'timestamp')::bigint)
      INTO v_password_auth_time
      FROM jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) AS entry
     WHERE entry->>'method' = 'password'
       AND coalesce(entry->>'timestamp', '') ~ '^[0-9]+$';

    IF v_password_auth_time IS NULL
       OR extract(epoch FROM now())::bigint - v_password_auth_time > 300
       OR v_password_auth_time > extract(epoch FROM now())::bigint + 30 THEN
      RAISE EXCEPTION 'დასრულებული შეკვეთის გასახსნელად საჭიროა პაროლის ახლიდან დადასტურება.';
    END IF;
  END IF;

  IF OLD.status IN ('გაგზავნილი', 'გზაშია')
     AND NEW.status NOT IN ('გაგზავნილი', 'გზაშია', 'დასრულებული', 'ჩაბარებულია') THEN
    RAISE EXCEPTION 'გაგზავნილი შეკვეთის წინა სტატუსზე დაბრუნება ან გაუქმება დაუშვებელია.';
  END IF;

  IF OLD.status = 'გაუქმებული' AND NEW.status <> 'გაუქმებული' THEN
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


CREATE OR REPLACE FUNCTION private.admin_reopen_completed_order(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order public.orders%rowtype;
  v_status_changed_at timestamptz;
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
    RAISE EXCEPTION 'დასრულებული შეკვეთის გასახსნელად საჭიროა ადმინისტრატორის პაროლის ახლიდან დადასტურება.';
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'შეკვეთა ვერ მოიძებნა.';
  END IF;

  IF v_order.status NOT IN ('დასრულებული', 'ჩაბარებულია') THEN
    RAISE EXCEPTION 'ხელახლა გახსნა შესაძლებელია მხოლოდ დასრულებული შეკვეთისთვის.';
  END IF;

  IF v_order.stock_deducted_at IS NULL OR v_order.stock_restored_at IS NOT NULL THEN
    RAISE EXCEPTION 'შეკვეთის მარაგის ისტორია არასრულია. უსაფრთხო ხელახლა გახსნა შეჩერდა.';
  END IF;

  -- This marker is transaction-local. The trigger accepts the status correction
  -- only while this exact protected function is updating the locked order.
  PERFORM set_config('geostore.completed_order_reopen', 'on', true);

  -- Deliberately do not update products or variants: checkout already deducted
  -- this order's stock, and a status correction must not deduct it a second time.
  UPDATE public.orders
     SET status = 'ახალი'
   WHERE id = p_order_id
   RETURNING status_changed_at INTO v_status_changed_at;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', 'ახალი',
    'status_changed_at', v_status_changed_at,
    'stock_deducted', true,
    'stock_changed', false,
    'reopened', true
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.admin_reopen_completed_order(p_order_id text)
RETURNS jsonb
LANGUAGE sql
SET search_path = ''
AS $function$
  SELECT private.admin_reopen_completed_order(p_order_id);
$function$;

REVOKE ALL ON FUNCTION private.admin_reopen_completed_order(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_reopen_completed_order(text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_reopen_completed_order(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reopen_completed_order(text) TO authenticated;

COMMENT ON FUNCTION public.admin_reopen_completed_order(text) IS
  'Safely reopens a completed GEOSTORE order to the new queue after fresh primary-admin password authentication; does not change inventory.';
