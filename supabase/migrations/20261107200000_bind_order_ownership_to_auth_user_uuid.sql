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

-- Customer order history is now keyed exclusively by auth.uid(), not mutable email.
CREATE OR REPLACE FUNCTION private.get_my_orders()
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
  SELECT o.id, o.created_at, o.total_gel, o.status,
         coalesce(o.items, '[]'::jsonb), o.status_changed_at
  FROM public.orders AS o
  WHERE o.user_id = auth.uid()
  ORDER BY o.created_at DESC, o.id DESC;
$function$;

REVOKE ALL ON FUNCTION private.get_my_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_my_orders() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_orders()
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
