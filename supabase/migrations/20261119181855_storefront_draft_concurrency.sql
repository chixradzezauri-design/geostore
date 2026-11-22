-- Protect storefront drafts from silent cross-device overwrites.
-- Each save must present the draft_updated_at value last loaded or saved by that editor.
DROP FUNCTION IF EXISTS public.save_storefront_draft(jsonb);
DROP FUNCTION IF EXISTS private.save_storefront_draft(jsonb);

CREATE OR REPLACE FUNCTION private.save_storefront_draft(
  p_snapshot jsonb,
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
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_staff_permission('settings') THEN
    RAISE EXCEPTION 'მაღაზიის მონახაზის შეცვლის უფლება არ გაქვთ.'
      USING ERRCODE = '42501';
  END IF;

  IF p_snapshot IS NULL
     OR jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_snapshot->'categories') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_snapshot->'banners') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_snapshot->'siteSettings') IS DISTINCT FROM 'object'
     OR pg_column_size(p_snapshot) > 4194304 THEN
    RAISE EXCEPTION 'მაღაზიის მონახაზის მონაცემები არასწორია ან ზედმეტად დიდია.'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize first-time inserts as well as updates; SELECT FOR UPDATE alone
  -- cannot lock a row that does not exist yet.
  PERFORM pg_advisory_xact_lock(hashtextextended('geostore:storefront-draft', 0));

  SELECT config.draft_updated_at
    INTO v_current_updated_at
    FROM public.storefront_config AS config
   WHERE config.config_key = 'storefront'
   FOR UPDATE;

  IF NOT FOUND THEN
    IF p_expected_draft_updated_at IS NOT NULL THEN
      RAISE EXCEPTION 'მონახაზი სხვა მოწყობილობაზე შეიცვალა. განაახლეთ საერთო ვერსია.'
        USING ERRCODE = '40001';
    END IF;

    INSERT INTO public.storefront_config (
      config_key, draft_config, updated_by, draft_updated_at
    ) VALUES (
      'storefront', p_snapshot, auth.uid(), clock_timestamp()
    ) RETURNING draft_updated_at INTO v_saved_updated_at;
  ELSE
    IF p_expected_draft_updated_at IS DISTINCT FROM v_current_updated_at THEN
      RAISE EXCEPTION 'მონახაზი სხვა მოწყობილობაზე შეიცვალა. განაახლეთ საერთო ვერსია.'
        USING ERRCODE = '40001';
    END IF;

    UPDATE public.storefront_config
       SET draft_config = p_snapshot,
           updated_by = auth.uid(),
           draft_updated_at = GREATEST(clock_timestamp(), v_current_updated_at + interval '1 microsecond')
     WHERE config_key = 'storefront'
     RETURNING draft_updated_at INTO v_saved_updated_at;
  END IF;

  RETURN jsonb_build_object('draft_updated_at', v_saved_updated_at);
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_storefront_draft(
  p_snapshot jsonb,
  p_expected_draft_updated_at timestamptz
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.save_storefront_draft(p_snapshot, p_expected_draft_updated_at);
$function$;

REVOKE ALL ON FUNCTION private.save_storefront_draft(jsonb, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.save_storefront_draft(jsonb, timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.save_storefront_draft(jsonb, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_storefront_draft(jsonb, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.save_storefront_draft(jsonb, timestamptz) IS
  'Permission-checked storefront draft save with optimistic concurrency; published config and version history remain unchanged.';
