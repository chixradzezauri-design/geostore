-- Persist order lifecycle notifications for authenticated customers only.
-- Staged until the live migration history has been reconciled.

CREATE TABLE IF NOT EXISTS public.order_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  event_key text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz NULL,
  CONSTRAINT order_notifications_recipient_email_valid
    CHECK (length(trim(recipient_email)) BETWEEN 3 AND 254),
  CONSTRAINT order_notifications_event_key_valid
    CHECK (length(trim(event_key)) BETWEEN 1 AND 80),
  CONSTRAINT order_notifications_status_valid
    CHECK (length(trim(status)) BETWEEN 1 AND 40),
  CONSTRAINT order_notifications_order_event_unique
    UNIQUE (order_id, event_key)
);

CREATE INDEX IF NOT EXISTS order_notifications_recipient_created_idx
  ON public.order_notifications (recipient_email, created_at DESC);

ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_notifications FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.order_notifications FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.record_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_email text;
  v_status text;
BEGIN
  v_email := lower(trim(coalesce(NEW.user_email, '')));
  v_status := trim(coalesce(NEW.status, ''));

  -- Guest orders have no authenticated account inbox.
  IF v_email = '' OR v_email = 'guest' OR v_status = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_notifications
      (order_id, recipient_email, event_key, status)
    VALUES
      (NEW.id, v_email, 'created:' || v_status, v_status)
    ON CONFLICT (order_id, event_key) DO NOTHING;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_notifications
      (order_id, recipient_email, event_key, status)
    VALUES
      (NEW.id, v_email, 'status:' || v_status, v_status)
    ON CONFLICT (order_id, event_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.record_order_notification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_record_notification_after_insert ON public.orders;
CREATE TRIGGER orders_record_notification_after_insert
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.record_order_notification();

DROP TRIGGER IF EXISTS orders_record_notification_after_status_update ON public.orders;
CREATE TRIGGER orders_record_notification_after_status_update
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION private.record_order_notification();

CREATE OR REPLACE FUNCTION private.get_my_order_notifications()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_email text;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ავტორიზაცია საჭიროა შეტყობინებების სანახავად.';
  END IF;

  v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'ანგარიშის ელფოსტა ვერ დადასტურდა.';
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'order_id', n.order_id,
        'status', n.status,
        'created_at', n.created_at,
        'read_at', n.read_at
      )
      ORDER BY n.created_at DESC, n.id DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT id, order_id, status, created_at, read_at
    FROM public.order_notifications
    WHERE recipient_email = v_email
    ORDER BY created_at DESC, id DESC
    LIMIT 100
  ) n;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION private.mark_my_order_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_email text;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ავტორიზაცია საჭიროა შეტყობინებების შესაცვლელად.';
  END IF;

  v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'ანგარიშის ელფოსტა ვერ დადასტურდა.';
  END IF;

  UPDATE public.order_notifications
  SET read_at = now()
  WHERE recipient_email = v_email
    AND read_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION private.get_my_order_notifications() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.mark_my_order_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_my_order_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION private.mark_my_order_notifications_read() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_order_notifications()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  SELECT private.get_my_order_notifications();
$function$;

CREATE OR REPLACE FUNCTION public.mark_my_order_notifications_read()
RETURNS integer
LANGUAGE sql
SET search_path TO ''
AS $function$
  SELECT private.mark_my_order_notifications_read();
$function$;

REVOKE ALL ON FUNCTION public.get_my_order_notifications() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_my_order_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_order_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_order_notifications_read() TO authenticated;
