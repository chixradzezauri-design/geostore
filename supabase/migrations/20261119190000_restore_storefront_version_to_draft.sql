-- Restore an immutable published snapshot into the shared draft only.
-- The caller must present the draft timestamp last observed by that editor.
CREATE OR REPLACE FUNCTION private.restore_storefront_draft_from_version(
  p_version_id uuid,
  p_expected_draft_updated_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_current_updated_at timestamptz;
  v_saved_updated_at timestamptz;
  v_snapshot jsonb;
  v_version_label text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_staff_permission('settings') THEN
    RAISE EXCEPTION 'მაღაზიის მონახაზის შეცვლის უფლება არ გაქვთ.'
      USING ERRCODE = '42501';
  END IF;

  IF p_version_id IS NULL THEN
    RAISE EXCEPTION 'ასარჩევი ვერსია მითითებული არ არის.'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('geostore:storefront-draft', 0));

  SELECT config.draft_updated_at
    INTO v_current_updated_at
    FROM public.storefront_config AS config
   WHERE config.config_key = 'storefront'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'მაღაზიის მონახაზი ვერ მოიძებნა.'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_expected_draft_updated_at IS DISTINCT FROM v_current_updated_at THEN
    RAISE EXCEPTION 'მონახაზი სხვა მოწყობილობაზე შეიცვალა. განაახლეთ საერთო ვერსია.'
      USING ERRCODE = '40001';
  END IF;

  SELECT version.snapshot, version.version_label
    INTO v_snapshot, v_version_label
    FROM public.storefront_versions AS version
   WHERE version.id = p_version_id
     AND version.config_key = 'storefront';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'არჩეული გამოქვეყნებული ვერსია ვერ მოიძებნა.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Version rows are append-only and created by the validated publish RPC.
  -- Recheck the required top-level shape and size before copying to the draft.
  IF v_snapshot IS NULL
     OR jsonb_typeof(v_snapshot) IS DISTINCT FROM 'object'
     OR jsonb_typeof(v_snapshot->'categories') IS DISTINCT FROM 'array'
     OR jsonb_typeof(v_snapshot->'banners') IS DISTINCT FROM 'array'
     OR jsonb_typeof(v_snapshot->'siteSettings') IS DISTINCT FROM 'object'
     OR octet_length(v_snapshot::text) > 4194304 THEN
    RAISE EXCEPTION 'შენახული ვერსიის მონაცემები არასწორია.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.storefront_config
     SET draft_config = v_snapshot,
         updated_by = auth.uid(),
         draft_updated_at = GREATEST(clock_timestamp(), v_current_updated_at + interval '1 microsecond')
   WHERE config_key = 'storefront'
   RETURNING draft_updated_at INTO v_saved_updated_at;

  RETURN jsonb_build_object(
    'version_id', p_version_id,
    'version_label', v_version_label,
    'snapshot', v_snapshot,
    'draft_updated_at', v_saved_updated_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_storefront_draft_from_version(
  p_version_id uuid,
  p_expected_draft_updated_at timestamptz
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.restore_storefront_draft_from_version(p_version_id, p_expected_draft_updated_at);
$function$;

REVOKE ALL ON FUNCTION private.restore_storefront_draft_from_version(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.restore_storefront_draft_from_version(uuid, timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.restore_storefront_draft_from_version(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_storefront_draft_from_version(uuid, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.restore_storefront_draft_from_version(uuid, timestamptz) IS
  'Restores an immutable published storefront version into the shared draft only, with settings permission and optimistic concurrency; never publishes.';
