-- Server-backed product reviews with verified-purchase calculation.
-- Requires 20261108030000_bind_order_ownership_to_auth_user_uuid.sql.

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_label text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL CHECK (char_length(btrim(comment)) BETWEEN 1 AND 1200),
  image_path text,
  verified_purchase boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_reviews_one_per_user_product UNIQUE (user_id, product_id),
  CONSTRAINT product_reviews_image_path_owner CHECK (
    image_path IS NULL OR (
      split_part(image_path, '/', 1) = product_id
      AND image_path ~ '^[^/]+/[^/]+
  )
);

CREATE INDEX IF NOT EXISTS product_reviews_product_created_idx
  ON public.product_reviews (product_id, created_at DESC);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_reviews_public_read ON public.product_reviews;
CREATE POLICY product_reviews_public_read
  ON public.product_reviews FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.product_reviews FROM PUBLIC, anon, authenticated;
-- Never expose the review owner's Auth UUID through the public reviews API.
GRANT SELECT (
  id, product_id, author_label, rating, comment, image_path, verified_purchase, created_at
) ON TABLE public.product_reviews TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.submit_product_review(
  p_product_id text,
  p_rating integer,
  p_comment text,
  p_image_path text DEFAULT NULL
)
RETURNS public.product_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_label text;
  v_verified boolean := false;
  v_review public.product_reviews%rowtype;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'შეფასების დასატოვებლად საჭიროა ანგარიშში შესვლა.';
  END IF;
  IF p_product_id IS NULL OR length(btrim(p_product_id)) NOT BETWEEN 1 AND 64 THEN
    RAISE EXCEPTION 'პროდუქტის იდენტიფიკატორი არასწორია.';
  END IF;
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'შეფასება უნდა იყოს 1-დან 5-მდე.';
  END IF;
  IF p_comment IS NULL OR char_length(btrim(p_comment)) NOT BETWEEN 1 AND 1200 THEN
    RAISE EXCEPTION 'შეფასების ტექსტი უნდა შეიცავდეს 1-დან 1200 სიმბოლომდე.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = p_product_id) THEN
    RAISE EXCEPTION 'პროდუქტი ვერ მოიძებნა.';
  END IF;
  IF p_image_path IS NOT NULL AND (
    length(p_image_path) > 512
    OR p_image_path NOT LIKE v_uid::text || '/' || p_product_id || '/%'
    OR p_image_path LIKE '%..%'
    OR p_image_path LIKE '%\\%'
  ) THEN
    RAISE EXCEPTION 'შეფასების ფოტოს მისამართი არასწორია.';
  END IF;

  IF (
    SELECT count(*) FROM public.product_reviews r
    WHERE r.user_id = v_uid AND r.created_at > now() - interval '24 hours'
  ) >= 10 THEN
    RAISE EXCEPTION 'შეფასებების დღიური ლიმიტი ამოიწურა.';
  END IF;

  v_label := coalesce(
    nullif(left(btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', '')), 80), ''),
    nullif(left(btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'name', '')), 80), ''),
    'GEOSTORE customer'
  );
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END
    ) AS item(value)
    WHERE o.user_id = v_uid
      AND lower(btrim(coalesce(o.status, ''))) IN
        ('დასრულებული', 'ჩაბარებულია', 'delivered', 'completed', 'доставлен', 'завершён')
      AND item.value ->> 'id' = p_product_id
  ) INTO v_verified;

  INSERT INTO public.product_reviews
    (product_id, user_id, author_label, rating, comment, image_path, verified_purchase)
  VALUES
    (p_product_id, v_uid, v_label, p_rating, btrim(p_comment), p_image_path, v_verified)
  RETURNING * INTO v_review;

  RETURN v_review;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'ამ პროდუქტზე შეფასება უკვე დატოვებული გაქვთ.';
END;
$function$;

-- Keep the privileged implementation outside the exposed API schema.
REVOKE ALL ON FUNCTION private.submit_product_review(text, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.submit_product_review(text, integer, text, text) TO authenticated;

-- Expose only an invoker wrapper through PostgREST.
CREATE OR REPLACE FUNCTION public.submit_product_review(
  p_product_id text,
  p_rating integer,
  p_comment text,
  p_image_path text DEFAULT NULL
)
RETURNS public.product_reviews
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.submit_product_review(p_product_id, p_rating, p_comment, p_image_path);
$function$;

REVOKE ALL ON FUNCTION public.submit_product_review(text, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_product_review(text, integer, text, text) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-review-images',
  'product-review-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS product_review_images_public_read ON storage.objects;
CREATE POLICY product_review_images_public_read
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-review-images');

DROP POLICY IF EXISTS product_review_images_owner_insert ON storage.objects;
CREATE POLICY product_review_images_owner_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-review-images'
    AND owner_id = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS product_review_images_owner_delete ON storage.objects;
CREATE POLICY product_review_images_owner_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-review-images'
    AND owner_id = (SELECT auth.uid()::text)
  );

    )
  )
);

CREATE INDEX IF NOT EXISTS product_reviews_product_created_idx
  ON public.product_reviews (product_id, created_at DESC);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_reviews_public_read ON public.product_reviews;
CREATE POLICY product_reviews_public_read
  ON public.product_reviews FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.product_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.product_reviews TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.submit_product_review(
  p_product_id text,
  p_rating integer,
  p_comment text,
  p_image_path text DEFAULT NULL
)
RETURNS public.product_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_label text;
  v_verified boolean := false;
  v_review public.product_reviews%rowtype;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'შეფასების დასატოვებლად საჭიროა ანგარიშში შესვლა.';
  END IF;
  IF p_product_id IS NULL OR length(btrim(p_product_id)) NOT BETWEEN 1 AND 64 THEN
    RAISE EXCEPTION 'პროდუქტის იდენტიფიკატორი არასწორია.';
  END IF;
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'შეფასება უნდა იყოს 1-დან 5-მდე.';
  END IF;
  IF p_comment IS NULL OR char_length(btrim(p_comment)) NOT BETWEEN 1 AND 1200 THEN
    RAISE EXCEPTION 'შეფასების ტექსტი უნდა შეიცავდეს 1-დან 1200 სიმბოლომდე.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = p_product_id) THEN
    RAISE EXCEPTION 'პროდუქტი ვერ მოიძებნა.';
  END IF;
  IF p_image_path IS NOT NULL AND (
    length(p_image_path) > 512
    OR p_image_path NOT LIKE v_uid::text || '/' || p_product_id || '/%'
    OR p_image_path LIKE '%..%'
    OR p_image_path LIKE '%\\%'
  ) THEN
    RAISE EXCEPTION 'შეფასების ფოტოს მისამართი არასწორია.';
  END IF;

  IF (
    SELECT count(*) FROM public.product_reviews r
    WHERE r.user_id = v_uid AND r.created_at > now() - interval '24 hours'
  ) >= 10 THEN
    RAISE EXCEPTION 'შეფასებების დღიური ლიმიტი ამოიწურა.';
  END IF;

  v_label := coalesce(
    nullif(left(btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', '')), 80), ''),
    nullif(left(btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'name', '')), 80), ''),
    'GEOSTORE customer'
  );
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END
    ) AS item(value)
    WHERE o.user_id = v_uid
      AND lower(btrim(coalesce(o.status, ''))) IN
        ('დასრულებული', 'ჩაბარებულია', 'delivered', 'completed', 'доставлен', 'завершён')
      AND item.value ->> 'id' = p_product_id
  ) INTO v_verified;

  INSERT INTO public.product_reviews
    (product_id, user_id, author_label, rating, comment, image_path, verified_purchase)
  VALUES
    (p_product_id, v_uid, v_label, p_rating, btrim(p_comment), p_image_path, v_verified)
  RETURNING * INTO v_review;

  RETURN v_review;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'ამ პროდუქტზე შეფასება უკვე დატოვებული გაქვთ.';
END;
$function$;

-- Keep the privileged implementation outside the exposed API schema.
REVOKE ALL ON FUNCTION private.submit_product_review(text, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.submit_product_review(text, integer, text, text) TO authenticated;

-- Expose only an invoker wrapper through PostgREST.
CREATE OR REPLACE FUNCTION public.submit_product_review(
  p_product_id text,
  p_rating integer,
  p_comment text,
  p_image_path text DEFAULT NULL
)
RETURNS public.product_reviews
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.submit_product_review(p_product_id, p_rating, p_comment, p_image_path);
$function$;

REVOKE ALL ON FUNCTION public.submit_product_review(text, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_product_review(text, integer, text, text) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-review-images',
  'product-review-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS product_review_images_public_read ON storage.objects;
CREATE POLICY product_review_images_public_read
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-review-images');

DROP POLICY IF EXISTS product_review_images_owner_insert ON storage.objects;
CREATE POLICY product_review_images_owner_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND array_length(storage.foldername(name), 1) >= 2
  );

DROP POLICY IF EXISTS product_review_images_owner_delete ON storage.objects;
CREATE POLICY product_review_images_owner_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
