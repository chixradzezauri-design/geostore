-- Store owner-only Admin Panel Visual Studio preferences centrally.
-- The private table is never exposed through PostgREST; access is only via owner-checked RPCs.

CREATE TABLE IF NOT EXISTS private.admin_panel_visual_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton IS TRUE),
  design jsonb NOT NULL CHECK (jsonb_typeof(design) = 'object'),
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.admin_panel_visual_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.admin_panel_visual_settings FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.admin_panel_visual_settings FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.get_admin_panel_visual_design()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_design jsonb;
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.'
      USING ERRCODE = '42501';
  END IF;

  SELECT settings.design
    INTO v_design
    FROM private.admin_panel_visual_settings AS settings
   WHERE settings.singleton IS TRUE;

  RETURN v_design;
END;
$function$;

CREATE OR REPLACE FUNCTION private.save_admin_panel_visual_design(p_design jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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

  INSERT INTO private.admin_panel_visual_settings (singleton, design, updated_by, updated_at)
  VALUES (true, p_design, auth.uid(), now())
  ON CONFLICT (singleton) DO UPDATE
    SET design = EXCLUDED.design,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();

  RETURN p_design;
END;
$function$;

REVOKE ALL ON FUNCTION private.get_admin_panel_visual_design() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.save_admin_panel_visual_design(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_admin_panel_visual_design() TO authenticated;
GRANT EXECUTE ON FUNCTION private.save_admin_panel_visual_design(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_panel_visual_design()
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.get_admin_panel_visual_design();
$function$;

CREATE OR REPLACE FUNCTION public.save_admin_panel_visual_design(p_design jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.save_admin_panel_visual_design(p_design);
$function$;

REVOKE ALL ON FUNCTION public.get_admin_panel_visual_design() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_admin_panel_visual_design(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_panel_visual_design() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_admin_panel_visual_design(jsonb) TO authenticated;
