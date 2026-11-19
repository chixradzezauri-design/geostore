-- Prevent one device from silently overwriting a newer visual-editor version.
-- The client must submit the updated_at value it last loaded or saved.
CREATE OR REPLACE FUNCTION private.get_admin_panel_visual_design_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_design jsonb;
  v_updated_at timestamptz;
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.'
      USING ERRCODE = '42501';
  END IF;

  SELECT settings.design, settings.updated_at
    INTO v_design, v_updated_at
    FROM private.admin_panel_visual_settings AS settings
   WHERE settings.singleton IS TRUE;

  RETURN jsonb_build_object('design', v_design, 'updated_at', v_updated_at);
END;
$function$;

CREATE OR REPLACE FUNCTION private.save_admin_panel_visual_design_state(
  p_design jsonb,
  p_expected_updated_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_current_updated_at timestamptz;
  v_saved_updated_at timestamptz;
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.'
      USING ERRCODE = '42501';
  END IF;

  IF p_design IS NULL
     OR jsonb_typeof(p_design) IS DISTINCT FROM 'object'
     OR pg_column_size(p_design) > 131072 THEN
    RAISE EXCEPTION 'ადმინპანელის დიზაინის მონაცემები არასწორია ან ზედმეტად დიდია.'
      USING ERRCODE = '22023';
  END IF;

  SELECT settings.updated_at
    INTO v_current_updated_at
    FROM private.admin_panel_visual_settings AS settings
   WHERE settings.singleton IS TRUE
   FOR UPDATE;

  IF NOT FOUND THEN
    IF p_expected_updated_at IS NOT NULL THEN
      RAISE EXCEPTION 'ადმინპანელის დიზაინი სხვა მოწყობილობაზე უკვე შეიცვალა. განაახლეთ საერთო ვერსია.'
        USING ERRCODE = '40001';
    END IF;

    INSERT INTO private.admin_panel_visual_settings (singleton, design, updated_by, updated_at)
    VALUES (true, p_design, auth.uid(), clock_timestamp())
    ON CONFLICT (singleton) DO NOTHING
    RETURNING updated_at INTO v_saved_updated_at;

    IF v_saved_updated_at IS NULL THEN
      RAISE EXCEPTION 'ადმინპანელის დიზაინი პარალელურად შეიცვალა. განაახლეთ საერთო ვერსია.'
        USING ERRCODE = '40001';
    END IF;
  ELSE
    IF p_expected_updated_at IS DISTINCT FROM v_current_updated_at THEN
      RAISE EXCEPTION 'ადმინპანელის დიზაინი სხვა მოწყობილობაზე უკვე შეიცვალა. განაახლეთ საერთო ვერსია.'
        USING ERRCODE = '40001';
    END IF;

    UPDATE private.admin_panel_visual_settings
       SET design = p_design,
           updated_by = auth.uid(),
           updated_at = clock_timestamp()
     WHERE singleton IS TRUE
     RETURNING updated_at INTO v_saved_updated_at;
  END IF;

  RETURN jsonb_build_object('design', p_design, 'updated_at', v_saved_updated_at);
END;
$function$;

REVOKE ALL ON FUNCTION private.get_admin_panel_visual_design_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.save_admin_panel_visual_design_state(jsonb, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_admin_panel_visual_design_state() TO authenticated;
GRANT EXECUTE ON FUNCTION private.save_admin_panel_visual_design_state(jsonb, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_panel_visual_design_state()
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.get_admin_panel_visual_design_state();
$function$;

CREATE OR REPLACE FUNCTION public.save_admin_panel_visual_design_state(
  p_design jsonb,
  p_expected_updated_at timestamptz
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.save_admin_panel_visual_design_state(p_design, p_expected_updated_at);
$function$;

REVOKE ALL ON FUNCTION public.get_admin_panel_visual_design_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_admin_panel_visual_design_state(jsonb, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_panel_visual_design_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_admin_panel_visual_design_state(jsonb, timestamptz) TO authenticated;
