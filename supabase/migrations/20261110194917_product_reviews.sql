-- Centralized product reviews with moderation.
-- Public clients can read approved reviews only; writes are performed by a trusted server endpoint.

CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_key uuid UNIQUE,
  product_id text NOT NULL,
  author_name text NOT NULL,
  rating smallint NOT NULL,
  review_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  author_user_id uuid,
  image_path text,
  is_legacy boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  moderated_at timestamptz,
  moderated_by uuid,

  CONSTRAINT product_reviews_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE RESTRICT,

  CONSTRAINT product_reviews_author_user_id_fkey
    FOREIGN KEY (author_user_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  CONSTRAINT product_reviews_moderated_by_fkey
    FOREIGN KEY (moderated_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  CONSTRAINT product_reviews_author_name_length
    CHECK (char_length(btrim(author_name)) BETWEEN 1 AND 80),

  CONSTRAINT product_reviews_rating_range
    CHECK (rating BETWEEN 1 AND 5),

  CONSTRAINT product_reviews_text_length
    CHECK (char_length(btrim(review_text)) BETWEEN 1 AND 1200),

  CONSTRAINT product_reviews_status_valid
    CHECK (status IN ('pending', 'approved', 'rejected')),

  CONSTRAINT product_reviews_image_path_length
    CHECK (image_path IS NULL OR char_length(image_path) BETWEEN 1 AND 300)
);

COMMENT ON TABLE public.product_reviews IS
  'Customer product reviews. New submissions are pending until primary-admin moderation.';
COMMENT ON COLUMN public.product_reviews.author_user_id IS
  'Set only by the trusted server from a verified Supabase session; never accepted from an untrusted client.';
COMMENT ON COLUMN public.product_reviews.moderated_by IS
  'Internal moderation actor; deliberately not granted to public Data API roles.';
COMMENT ON COLUMN public.product_reviews.is_legacy IS
  'Marks a deliberately imported browser-local legacy review; no automatic import is performed.';
COMMENT ON COLUMN public.product_reviews.image_path IS
  'Opaque path in the private product-review image bucket; clients must not upload directly.';

CREATE INDEX product_reviews_approved_product_created_idx
  ON public.product_reviews (product_id, created_at DESC)
  WHERE status = 'approved';

CREATE INDEX product_reviews_admin_queue_idx
  ON public.product_reviews (status, created_at DESC);

-- The public review policy checks product publication state. This grants only
-- the publication flag; the existing products RLS policy still hides unpublished rows.
GRANT SELECT (is_published) ON TABLE public.products TO anon;

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_reviews_public_read_approved
  ON public.product_reviews;
CREATE POLICY product_reviews_public_read_approved
  ON public.product_reviews
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1
      FROM public.products AS p
      WHERE p.id = product_reviews.product_id
        AND p.is_published = true
    )
  );

DROP POLICY IF EXISTS product_reviews_primary_admin_read_all
  ON public.product_reviews;
CREATE POLICY product_reviews_primary_admin_read_all
  ON public.product_reviews
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
    AND COALESCE((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
  );

-- Revoke table-wide access. Public roles receive only the columns required to
-- display and moderate reviews; author and moderator UUIDs stay private.
REVOKE ALL ON TABLE public.product_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  product_id,
  author_name,
  rating,
  review_text,
  status,
  image_path,
  is_legacy,
  created_at,
  updated_at,
  moderated_at
) ON TABLE public.product_reviews TO anon, authenticated;

-- Only trusted server-side code may create a review. There is intentionally no
-- public INSERT/UPDATE/DELETE policy or grant.
GRANT SELECT, INSERT ON TABLE public.product_reviews TO service_role;

CREATE OR REPLACE FUNCTION private.admin_moderate_product_review(
  p_review_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_jwt jsonb := auth.jwt();
  v_review public.product_reviews;
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized to moderate product reviews'
      USING ERRCODE = '42501';
  END IF;

  IF p_review_id IS NULL
     OR p_status IS NULL
     OR p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid product review moderation request'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_review
    FROM public.product_reviews
   WHERE id = p_review_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product review not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_review.status = p_status THEN
    RETURN pg_catalog.jsonb_build_object(
      'id', v_review.id,
      'product_id', v_review.product_id,
      'status', v_review.status,
      'updated_at', v_review.updated_at,
      'moderated_at', v_review.moderated_at
    );
  END IF;

  UPDATE public.product_reviews
     SET status = p_status,
         moderated_at = now(),
         moderated_by = auth.uid(),
         updated_at = now()
   WHERE id = p_review_id
   RETURNING * INTO v_review;

  PERFORM 1
    FROM private.write_admin_activity_log(
      'Product review moderation: ' || p_review_id::text || ' -> ' || p_status
    );

  RETURN pg_catalog.jsonb_build_object(
    'id', v_review.id,
    'product_id', v_review.product_id,
    'status', v_review.status,
    'updated_at', v_review.updated_at,
    'moderated_at', v_review.moderated_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.admin_moderate_product_review(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_moderate_product_review(uuid, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_moderate_product_review(
  p_review_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE sql
SET search_path = ''
AS $function$
  SELECT private.admin_moderate_product_review(p_review_id, p_status);
$function$;

REVOKE ALL ON FUNCTION public.admin_moderate_product_review(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_product_review(uuid, text)
  TO authenticated;


-- Anonymous review submissions are rate-limited by keyed hashes only. Raw IP
-- addresses and account identifiers are never persisted in this table.
CREATE TABLE private.product_review_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_review_rate_limit_hash_valid
    CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT product_review_rate_limit_attempts_nonnegative
    CHECK (attempt_count >= 0)
);

ALTER TABLE private.product_review_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.product_review_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE private.product_review_rate_limits TO service_role;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE INDEX product_review_rate_limits_updated_at_idx
  ON private.product_review_rate_limits (updated_at);

CREATE OR REPLACE FUNCTION private.consume_product_review_rate_limit(
  p_key_hash text,
  p_max_attempts integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_attempt_count integer;
  v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF p_key_hash IS NULL
     OR p_key_hash !~ '^[0-9a-f]{64}$'
     OR p_max_attempts IS NULL
     OR p_max_attempts NOT BETWEEN 1 AND 20
     OR p_window_seconds IS NULL
     OR p_window_seconds NOT BETWEEN 60 AND 86400 THEN
    RAISE EXCEPTION 'Invalid product review rate-limit request'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO private.product_review_rate_limits AS current_limit (
    key_hash, window_started_at, attempt_count, updated_at
  )
  VALUES (p_key_hash, v_now, 1, v_now)
  ON CONFLICT (key_hash) DO UPDATE
    SET window_started_at = CASE
          WHEN current_limit.window_started_at <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
            THEN v_now
          ELSE current_limit.window_started_at
        END,
        attempt_count = CASE
          WHEN current_limit.window_started_at <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
            THEN 1
          ELSE current_limit.attempt_count + 1
        END,
        updated_at = v_now
  RETURNING attempt_count INTO v_attempt_count;

  DELETE FROM private.product_review_rate_limits
   WHERE updated_at < v_now - interval '7 days';

  RETURN v_attempt_count <= p_max_attempts;
END;
$function$;

REVOKE ALL ON FUNCTION private.consume_product_review_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.consume_product_review_rate_limit(text, integer, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.consume_product_review_rate_limit(
  p_key_hash text,
  p_max_attempts integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.consume_product_review_rate_limit(
    p_key_hash,
    p_max_attempts,
    p_window_seconds
  );
$function$;

REVOKE ALL ON FUNCTION public.consume_product_review_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_product_review_rate_limit(text, integer, integer)
  TO service_role;

-- Review photos are private and are written/read only by the trusted Edge Function.
-- No anon/authenticated Storage object policies or direct upload grants are added.
INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
  'product-review-images',
  'product-review-images',
  false,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;
