-- Stage 55: persist vendor records without deleting historical supplier references.
-- The private table is reachable only through narrowly granted, primary-admin RPCs.

BEGIN;

CREATE TABLE IF NOT EXISTS private.admin_vendors (
  id text PRIMARY KEY
    CHECK (char_length(btrim(id)) BETWEEN 1 AND 64),
  name text NOT NULL
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  commission numeric(5,2) NOT NULL DEFAULT 0
    CHECK (commission >= 0 AND commission <= 100),
  status text NOT NULL DEFAULT 'აქტიური'
    CHECK (char_length(btrim(status)) BETWEEN 1 AND 40),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS admin_vendors_active_name_idx
  ON private.admin_vendors (lower(name))
  WHERE archived_at IS NULL;

ALTER TABLE private.admin_vendors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.admin_vendors FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.list_admin_vendors()
RETURNS TABLE (
  id text,
  name text,
  commission numeric,
  status text,
  archived_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR auth.jwt()->'app_metadata'->>'role' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT v.id, v.name, v.commission, v.status, v.archived_at, v.created_at, v.updated_at
  FROM private.admin_vendors AS v
  ORDER BY v.created_at, v.id;
END;
$function$;

CREATE OR REPLACE FUNCTION private.save_admin_vendors(p_vendors jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_item jsonb;
  v_id text;
  v_name text;
  v_commission numeric;
  v_status text;
  v_archived_at timestamptz;
  v_updated_at timestamptz;
  v_saved integer := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR auth.jwt()->'app_metadata'->>'role' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.' USING ERRCODE = '42501';
  END IF;

  IF p_vendors IS NULL
     OR pg_catalog.jsonb_typeof(p_vendors) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'ვენდორების სია არასწორია.' USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.jsonb_array_length(p_vendors) > 500 THEN
    RAISE EXCEPTION 'ვენდორების სია ზედმეტად დიდია.' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_vendors)
  LOOP
    v_id := btrim(COALESCE(v_item->>'id', ''));
    v_name := btrim(COALESCE(v_item->>'name', ''));
    v_status := btrim(COALESCE(v_item->>'status', 'აქტიური'));

    BEGIN
      v_commission := COALESCE(NULLIF(v_item->>'commission', '')::numeric, 0);
      v_archived_at := NULLIF(COALESCE(v_item->>'archived_at', v_item->>'archivedAt', ''), '')::timestamptz;
      v_updated_at := COALESCE(NULLIF(v_item->>'updated_at', '')::timestamptz, now());
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'ვენდორის მონაცემები არასწორია.' USING ERRCODE = '22023';
    END;

    IF char_length(v_id) NOT BETWEEN 1 AND 64
       OR char_length(v_name) NOT BETWEEN 1 AND 100
       OR char_length(v_status) NOT BETWEEN 1 AND 40
       OR v_commission < 0
       OR v_commission > 100
       OR v_commission <> round(v_commission, 2) THEN
      RAISE EXCEPTION 'ვენდორის მონაცემები არ აკმაყოფილებს მოთხოვნებს.' USING ERRCODE = '22023';
    END IF;

    -- Prevent a client clock set far into the future from blocking later updates.
    IF v_updated_at > now() + interval '5 minutes' THEN
      v_updated_at := now();
    END IF;

    IF v_archived_at IS NOT NULL THEN
      v_status := 'არქივირებული';
    END IF;

    INSERT INTO private.admin_vendors (
      id, name, commission, status, archived_at, created_at, updated_at, updated_by
    ) VALUES (
      v_id, v_name, v_commission, v_status, v_archived_at, now(), v_updated_at, auth.uid()
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          commission = EXCLUDED.commission,
          status = EXCLUDED.status,
          archived_at = EXCLUDED.archived_at,
          updated_at = EXCLUDED.updated_at,
          updated_by = auth.uid()
      WHERE private.admin_vendors.updated_at < EXCLUDED.updated_at;

    IF FOUND THEN
      v_saved := v_saved + 1;
    END IF;
  END LOOP;

  RETURN v_saved;
END;
$function$;

REVOKE ALL ON FUNCTION private.list_admin_vendors() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.save_admin_vendors(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.list_admin_vendors() TO authenticated;
GRANT EXECUTE ON FUNCTION private.save_admin_vendors(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_admin_vendors()
RETURNS TABLE (
  id text,
  name text,
  commission numeric,
  status text,
  archived_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT * FROM private.list_admin_vendors();
$function$;

CREATE OR REPLACE FUNCTION public.save_admin_vendors(p_vendors jsonb)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.save_admin_vendors(p_vendors);
$function$;

REVOKE ALL ON FUNCTION public.list_admin_vendors() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_admin_vendors(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_admin_vendors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_admin_vendors(jsonb) TO authenticated;

COMMIT;
