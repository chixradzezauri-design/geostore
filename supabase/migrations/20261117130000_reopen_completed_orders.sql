-- Stage 100: allow the primary administrator to reopen a completed order
-- without touching stock. Cancelled-order reactivation remains a separate RPC.

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

  IF OLD.status IN ('დასრულებული', 'ჩაბარებულია')
     AND NEW.status NOT IN ('დასრულებული', 'ჩაბარებულია') THEN
    IF NEW.status <> 'ახალი'
       OR OLD.stock_deducted_at IS NULL
       OR OLD.stock_restored_at IS NOT NULL
       OR NEW.stock_deducted_at IS DISTINCT FROM OLD.stock_deducted_at
       OR NEW.stock_restored_at IS DISTINCT FROM OLD.stock_restored_at
       OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
       OR coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
       OR coalesce(current_setting('geostore.completed_order_reactivation', true), '') <> 'on' THEN
      RAISE EXCEPTION 'ჩაბარებული შეკვეთის ხელახლა გააქტიურება მხოლოდ დაცული პროცედურით არის შესაძლებელი.';
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
      RAISE EXCEPTION 'ხელახლა გააქტიურებისთვის საჭიროა ადმინისტრატორის პაროლის ახლიდან დადასტურება.';
    END IF;
  END IF;

  IF OLD.status IN ('გაგზავნილი', 'გზაშია')
     AND NEW.status NOT IN ('გაგზავნილი', 'გზაშია', 'დასრულებული', 'ჩაბარებულია') THEN
    RAISE EXCEPTION 'გაგზავნილი შეკვეთის წინა სტატუსზე დაბრუნება ან გაუქმება დაუშვებელია.';
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

  IF v_order.status NOT IN ('დასრულებული', 'ჩაბარებულია') THEN
    RAISE EXCEPTION 'ეს პროცედურა მხოლოდ დასრულებული შეკვეთის ხელახლა გასააქტიურებლად გამოიყენება.';
  END IF;

  -- Completed orders have already consumed stock. Reopening must not deduct it again.
  IF v_order.stock_deducted_at IS NULL OR v_order.stock_restored_at IS NOT NULL THEN
    RAISE EXCEPTION 'შეკვეთის მარაგის ისტორია არასრულია; უსაფრთხო რეაქტივაცია ვერ შესრულდება.';
  END IF;

  PERFORM set_config('geostore.completed_order_reactivation', 'on', true);

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
END;
$function$;


CREATE OR REPLACE FUNCTION public.admin_reopen_completed_order(p_order_id text)
RETURNS jsonb
LANGUAGE sql
SET search_path = ''
AS $function$
  SELECT private.admin_reopen_completed_order(p_order_id);
$function$;

REVOKE ALL ON FUNCTION private.admin_reopen_completed_order(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.admin_reopen_completed_order(text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_reopen_completed_order(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reopen_completed_order(text) TO authenticated;
