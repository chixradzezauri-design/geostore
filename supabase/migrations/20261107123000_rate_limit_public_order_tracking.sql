-- Rate-limit public order tracking without storing raw phone numbers or order codes.
-- The lookup remains available to guests, but repeated guesses for the same phone
-- number or order code are throttled atomically inside Postgres.
CREATE TABLE IF NOT EXISTS private.order_tracking_rate_limits (
  bucket_type text NOT NULL CHECK (bucket_type IN ('phone', 'order')),
  bucket_hash text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  PRIMARY KEY (bucket_type, bucket_hash)
);

CREATE INDEX IF NOT EXISTS order_tracking_rate_limits_window_idx
  ON private.order_tracking_rate_limits (window_started_at);

REVOKE ALL ON TABLE private.order_tracking_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.lookup_order_for_tracking(
  p_order_id text,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_order public.orders%rowtype;
  v_input_phone text;
  v_input_order text;
  v_phone_hash text;
  v_order_hash text;
  v_phone_attempts integer;
  v_order_attempts integer;
  v_phone_window timestamptz;
  v_order_window timestamptz;
  v_retry_after integer;
BEGIN
  -- Bound input size before normalization or database work.
  IF coalesce(length(p_order_id), 0) > 64
     OR coalesce(length(p_phone), 0) > 32 THEN
    RETURN NULL;
  END IF;

  v_input_order := upper(trim(coalesce(p_order_id, '')));
  v_input_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  IF length(v_input_order) < 6
     OR length(v_input_order) > 64
     OR v_input_order !~ '^[A-Z0-9_-]+$'
     OR length(v_input_phone) < 9
     OR length(v_input_phone) > 15 THEN
    RETURN NULL;
  END IF;

  -- SHA-256 hashes prevent raw phone numbers/order codes being stored in this table.
  v_phone_hash := encode(
    extensions.digest(convert_to('phone:' || v_input_phone, 'UTF8'), 'sha256'),
    'hex'
  );
  v_order_hash := encode(
    extensions.digest(convert_to('order:' || v_input_order, 'UTF8'), 'sha256'),
    'hex'
  );

  -- Independent 15-minute buckets: 10 attempts per phone and 10 per order code.
  INSERT INTO private.order_tracking_rate_limits AS limits
    (bucket_type, bucket_hash, window_started_at, attempts)
  VALUES ('phone', v_phone_hash, now(), 1)
  ON CONFLICT (bucket_type, bucket_hash) DO UPDATE
    SET attempts = CASE
          WHEN limits.window_started_at <= now() - interval '15 minutes' THEN 1
          ELSE limits.attempts + 1
        END,
        window_started_at = CASE
          WHEN limits.window_started_at <= now() - interval '15 minutes' THEN now()
          ELSE limits.window_started_at
        END
  RETURNING attempts, window_started_at
    INTO v_phone_attempts, v_phone_window;

  INSERT INTO private.order_tracking_rate_limits AS limits
    (bucket_type, bucket_hash, window_started_at, attempts)
  VALUES ('order', v_order_hash, now(), 1)
  ON CONFLICT (bucket_type, bucket_hash) DO UPDATE
    SET attempts = CASE
          WHEN limits.window_started_at <= now() - interval '15 minutes' THEN 1
          ELSE limits.attempts + 1
        END,
        window_started_at = CASE
          WHEN limits.window_started_at <= now() - interval '15 minutes' THEN now()
          ELSE limits.window_started_at
        END
  RETURNING attempts, window_started_at
    INTO v_order_attempts, v_order_window;

  IF v_phone_attempts > 10 OR v_order_attempts > 10 THEN
    v_retry_after := greatest(
      1,
      ceil(extract(epoch FROM (
        greatest(v_phone_window, v_order_window) + interval '15 minutes' - now()
      )))::integer
    );
    RETURN jsonb_build_object(
      'rateLimited', true,
      'retryAfterSeconds', v_retry_after
    );
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE upper(id) = v_input_order
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

REVOKE ALL ON FUNCTION private.lookup_order_for_tracking(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.lookup_order_for_tracking(text, text) TO anon, authenticated;

-- Keep the existing public PostgREST entry point and its guest-access behavior.
CREATE OR REPLACE FUNCTION public.lookup_order_for_tracking(p_order_id text, p_phone text)
RETURNS jsonb
LANGUAGE sql
SET search_path TO ''
AS $function$
  SELECT private.lookup_order_for_tracking(p_order_id, p_phone);
$function$;

REVOKE ALL ON FUNCTION public.lookup_order_for_tracking(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_order_for_tracking(text, text) TO anon, authenticated;
