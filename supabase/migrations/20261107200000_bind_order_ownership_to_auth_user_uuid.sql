-- Bind customer order history and status notifications to the immutable Supabase Auth user UUID.
-- Email remains contact/display data only; it is no longer an ownership key.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.order_notifications
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill only when an email resolves to exactly one current Auth account.
WITH unique_auth_emails AS (
  SELECT lower(btrim(email)) AS email_key, min(id::text)::uuid AS user_id
  FROM auth.users
  WHERE nullif(btrim(email), '') IS NOT NULL
  GROUP BY lower(btrim(email))
  HAVING count(*) = 1
)
UPDATE public.orders AS o
SET user_id = u.user_id
FROM unique_auth_emails AS u
WHERE o.user_id IS NULL
  AND o.user_email IS NOT NULL
  AND lower(btrim(o.user_email)) = u.email_key
  AND lower(btrim(o.user_email)) <> 'guest';

UPDATE public.order_notifications AS n
SET recipient_user_id = o.user_id
FROM public.orders AS o
WHERE n.order_id = o.id
  AND n.recipient_user_id IS NULL
  AND o.user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx
  ON public.orders (user_id, created_at DESC, id DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS order_notifications_recipient_user_id_created_at_idx
  ON public.order_notifications (recipient_user_id, created_at DESC, id DESC)
  WHERE recipient_user_id IS NOT NULL;

-- The checkout RPC is SECURITY DEFINER, but auth.uid() still reflects the caller JWT.
-- Never accept an owner UUID from browser-supplied JSON.
CREATE OR REPLACE FUNCTION private.bind_order_to_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF lower(btrim(coalesce(NEW.user_email, 'guest'))) = 'guest' THEN
    NEW.user_id := NULL;
  ELSE
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'ავტორიზებული მომხმარებლის შეკვეთის მფლობელი ვერ დადასტურდა.';
    END IF;
    IF lower(btrim(coalesce(NEW.user_email, ''))) <> lower(btrim(coalesce(auth.jwt() ->> 'email', ''))) THEN
      RAISE EXCEPTION 'მომხმარებლის სესია შეკვეთის მონაცემებს არ ემთხვევა.';
    END IF;
    NEW.user_id := v_uid;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.bind_order_to_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_bind_auth_user_before_insert ON public.orders;
CREATE TRIGGER orders_bind_auth_user_before_insert
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.bind_order_to_auth_user();

-- Bind idempotent checkout replay to the immutable Auth UUID too.
-- The original implementation remains the source of validation/pricing/stock logic;
-- this wrapper checks ownership before returning either a new or replayed result.
ALTER FUNCTION private.create_order_with_stock(jsonb)
  RENAME TO create_order_with_stock_unchecked;

CREATE FUNCTION private.create_order_with_stock(p_order jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
  v_order_id text;
  v_owner_id uuid;
BEGIN
  v_result := private.create_order_with_stock_unchecked(p_order);
  v_order_id := nullif(v_result ->> 'order_id', '');
  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'შეკვეთის მფლობელის დადასტურება ვერ მოხერხდა.';
  END IF;

  SELECT user_id INTO v_owner_id
    FROM public.orders
   WHERE id = v_order_id;

  IF NOT FOUND OR v_owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'შეკვეთის იდენტიფიკატორი სხვა მომხმარებლის შეკვეთას ეკუთვნის.';
  END IF;

  RETURN v_result;
END;
$function$;

-- Recreate the public PL/pgSQL wrapper after the private function rename.
-- This forces its cached call plan to resolve the new UUID-ownership wrapper,
-- rather than continuing to call the renamed unchecked implementation.
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
     OR coalesce(trim(p_order->>'id'), '') !~ '^[A-Za-z0-9_-]{6,64}
REVOKE ALL ON FUNCTION private.create_order_with_stock(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.create_order_with_stock(jsonb) TO anon, authenticated;

-- Customer order history is now keyed exclusively by auth.uid(), not mutable email.
-- Drop wrappers first because PostgreSQL cannot change a RETURNS TABLE signature in place.
DROP FUNCTION IF EXISTS public.get_my_orders();
DROP FUNCTION IF EXISTS private.get_my_orders();

CREATE FUNCTION private.get_my_orders()
RETURNS TABLE (
  id text,
  created_at timestamptz,
  total_gel numeric,
  status text,
  items jsonb,
  status_changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    o.id,
    o.created_at,
    o.total_gel,
    o.status,
    coalesce((
      SELECT jsonb_agg(
        jsonb_strip_nulls(jsonb_build_object(
          'id', item.value -> 'id',
          'name', item.value -> 'name',
          'price', item.value -> 'price',
          'quantity', item.value -> 'quantity',
          'selectedSize', item.value -> 'selectedSize',
          'selectedColor', item.value -> 'selectedColor',
          'customVariantId', item.value -> 'customVariantId',
          'customVariantName', item.value -> 'customVariantName',
          'addon_total', item.value -> 'addon_total',
          'gift_wrap', item.value -> 'gift_wrap',
          'vip_warranty', item.value -> 'vip_warranty',
          'gift_message', item.value -> 'gift_message'
        ))
        ORDER BY item.ordinality
      )
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(o.items) = 'array'
          THEN o.items ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS item(value, ordinality)
    ), '[]'::jsonb) AS items,
    o.status_changed_at
  FROM public.orders AS o
  WHERE o.user_id = auth.uid()
  ORDER BY o.created_at DESC, o.id DESC;
$function$;

REVOKE ALL ON FUNCTION private.get_my_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_my_orders() TO authenticated;

CREATE FUNCTION public.get_my_orders()
RETURNS TABLE (
  id text,
  created_at timestamptz,
  total_gel numeric,
  status text,
  items jsonb,
  status_changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT * FROM private.get_my_orders();
$function$;

REVOKE ALL ON FUNCTION public.get_my_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_orders() TO authenticated;

-- Notification creation carries the same immutable owner UUID as its order.
CREATE OR REPLACE FUNCTION private.record_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_status text;
BEGIN
  v_status := trim(coalesce(NEW.status, ''));
  IF NEW.user_id IS NULL OR v_status = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_notifications
      (order_id, recipient_email, recipient_user_id, event_key, status)
    VALUES
      (NEW.id, lower(trim(coalesce(NEW.user_email, ''))), NEW.user_id, 'created:' || v_status, v_status)
    ON CONFLICT (order_id, event_key) DO NOTHING;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_notifications
      (order_id, recipient_email, recipient_user_id, event_key, status)
    VALUES
      (NEW.id, lower(trim(coalesce(NEW.user_email, ''))), NEW.user_id,
       'status:' || v_status || ':' || txid_current()::text, v_status)
    ON CONFLICT (order_id, event_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.get_my_order_notifications()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ავტორიზაცია საჭიროა შეტყობინებების სანახავად.';
  END IF;

  SELECT coalesce(
    jsonb_agg(jsonb_build_object(
      'id', n.id, 'order_id', n.order_id, 'status', n.status,
      'created_at', n.created_at, 'read_at', n.read_at
    ) ORDER BY n.created_at DESC, n.id DESC),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT id, order_id, status, created_at, read_at
    FROM public.order_notifications
    WHERE recipient_user_id = auth.uid()
    ORDER BY created_at DESC, id DESC
    LIMIT 100
  ) n;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION private.get_my_order_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_my_order_notifications() TO authenticated;

CREATE OR REPLACE FUNCTION private.mark_my_order_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ავტორიზაცია საჭიროა შეტყობინებების შესაცვლელად.';
  END IF;
  UPDATE public.order_notifications
  SET read_at = now()
  WHERE recipient_user_id = auth.uid() AND read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION private.mark_my_order_notifications_read() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.mark_my_order_notifications_read() TO authenticated;
 THEN
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
$function$
;
REVOKE ALL ON FUNCTION public.create_order_with_stock(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock(jsonb) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION private.create_order_with_stock_unchecked(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.create_order_with_stock(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.create_order_with_stock(jsonb) TO anon, authenticated;

-- Customer order history is now keyed exclusively by auth.uid(), not mutable email.
-- Drop wrappers first because PostgreSQL cannot change a RETURNS TABLE signature in place.
DROP FUNCTION IF EXISTS public.get_my_orders();
DROP FUNCTION IF EXISTS private.get_my_orders();

CREATE FUNCTION private.get_my_orders()
RETURNS TABLE (
  id text,
  created_at timestamptz,
  total_gel numeric,
  status text,
  items jsonb,
  status_changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    o.id,
    o.created_at,
    o.total_gel,
    o.status,
    coalesce((
      SELECT jsonb_agg(
        jsonb_strip_nulls(jsonb_build_object(
          'id', item.value -> 'id',
          'name', item.value -> 'name',
          'price', item.value -> 'price',
          'quantity', item.value -> 'quantity',
          'selectedSize', item.value -> 'selectedSize',
          'selectedColor', item.value -> 'selectedColor',
          'customVariantId', item.value -> 'customVariantId',
          'customVariantName', item.value -> 'customVariantName',
          'addon_total', item.value -> 'addon_total',
          'gift_wrap', item.value -> 'gift_wrap',
          'vip_warranty', item.value -> 'vip_warranty',
          'gift_message', item.value -> 'gift_message'
        ))
        ORDER BY item.ordinality
      )
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(o.items) = 'array'
          THEN o.items ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS item(value, ordinality)
    ), '[]'::jsonb) AS items,
    o.status_changed_at
  FROM public.orders AS o
  WHERE o.user_id = auth.uid()
  ORDER BY o.created_at DESC, o.id DESC;
$function$;

REVOKE ALL ON FUNCTION private.get_my_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_my_orders() TO authenticated;

CREATE FUNCTION public.get_my_orders()
RETURNS TABLE (
  id text,
  created_at timestamptz,
  total_gel numeric,
  status text,
  items jsonb,
  status_changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT * FROM private.get_my_orders();
$function$;

REVOKE ALL ON FUNCTION public.get_my_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_orders() TO authenticated;

-- Notification creation carries the same immutable owner UUID as its order.
CREATE OR REPLACE FUNCTION private.record_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_status text;
BEGIN
  v_status := trim(coalesce(NEW.status, ''));
  IF NEW.user_id IS NULL OR v_status = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_notifications
      (order_id, recipient_email, recipient_user_id, event_key, status)
    VALUES
      (NEW.id, lower(trim(coalesce(NEW.user_email, ''))), NEW.user_id, 'created:' || v_status, v_status)
    ON CONFLICT (order_id, event_key) DO NOTHING;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_notifications
      (order_id, recipient_email, recipient_user_id, event_key, status)
    VALUES
      (NEW.id, lower(trim(coalesce(NEW.user_email, ''))), NEW.user_id,
       'status:' || v_status || ':' || txid_current()::text, v_status)
    ON CONFLICT (order_id, event_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.get_my_order_notifications()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ავტორიზაცია საჭიროა შეტყობინებების სანახავად.';
  END IF;

  SELECT coalesce(
    jsonb_agg(jsonb_build_object(
      'id', n.id, 'order_id', n.order_id, 'status', n.status,
      'created_at', n.created_at, 'read_at', n.read_at
    ) ORDER BY n.created_at DESC, n.id DESC),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT id, order_id, status, created_at, read_at
    FROM public.order_notifications
    WHERE recipient_user_id = auth.uid()
    ORDER BY created_at DESC, id DESC
    LIMIT 100
  ) n;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION private.get_my_order_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_my_order_notifications() TO authenticated;

CREATE OR REPLACE FUNCTION private.mark_my_order_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ავტორიზაცია საჭიროა შეტყობინებების შესაცვლელად.';
  END IF;
  UPDATE public.order_notifications
  SET read_at = now()
  WHERE recipient_user_id = auth.uid() AND read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION private.mark_my_order_notifications_read() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.mark_my_order_notifications_read() TO authenticated;
