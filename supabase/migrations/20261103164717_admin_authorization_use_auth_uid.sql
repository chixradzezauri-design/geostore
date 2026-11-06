-- Replace hard-coded administrator email comparisons across GEOSTORE policies
-- and order RPCs with the immutable primary Supabase Auth user ID.
-- Customer-owned order matching by the customer's own email is intentionally unchanged.
DO $$
DECLARE
  r record;
  v_qual text;
  v_check text;
  v_old text := 'lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> ''email''::text), ''''::text)) = ''chixradzezauri@gmail.com''::text';
  v_new text := '( SELECT auth.uid() AS uid) = ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid';
  v_sql text;
  v_policy_count integer := 0;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
      FROM pg_policies
     WHERE COALESCE(qual, '') LIKE '%chixradzezauri@gmail.com%'
        OR COALESCE(with_check, '') LIKE '%chixradzezauri@gmail.com%'
  LOOP
    v_qual := CASE WHEN r.qual IS NULL THEN NULL ELSE replace(r.qual, v_old, v_new) END;
    v_check := CASE WHEN r.with_check IS NULL THEN NULL ELSE replace(r.with_check, v_old, v_new) END;

    IF (r.qual IS NOT NULL AND v_qual = r.qual)
       OR (r.with_check IS NOT NULL AND v_check = r.with_check) THEN
      IF (r.qual IS NOT NULL AND position('chixradzezauri@gmail.com' in r.qual) > 0 AND v_qual = r.qual)
         OR (r.with_check IS NOT NULL AND position('chixradzezauri@gmail.com' in r.with_check) > 0 AND v_check = r.with_check) THEN
        RAISE EXCEPTION 'Could not safely replace administrator email in policy %.%', r.schemaname, r.policyname;
      END IF;
    END IF;

    v_sql := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    IF v_qual IS NOT NULL THEN v_sql := v_sql || format(' USING (%s)', v_qual); END IF;
    IF v_check IS NOT NULL THEN v_sql := v_sql || format(' WITH CHECK (%s)', v_check); END IF;
    EXECUTE v_sql;
    v_policy_count := v_policy_count + 1;
  END LOOP;
  IF v_policy_count = 0 THEN
    RAISE EXCEPTION 'No administrator email policies were found; refusing a no-op migration.';
  END IF;
END
$$;

DO $$
DECLARE
  r record;
  v_definition text;
  v_old text := 'or lower(coalesce(auth.jwt()->>''email'', '''')) <> ''chixradzezauri@gmail.com'' then';
  v_new text := 'or auth.uid() is distinct from ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid then';
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT p.oid, pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.prokind = 'f'
       AND n.nspname = 'private'
       AND p.proname IN ('admin_update_order_status', 'admin_reactivate_cancelled_order')
       AND pg_get_functiondef(p.oid) LIKE '%chixradzezauri@gmail.com%'
  LOOP
    v_definition := replace(r.definition, v_old, v_new);
    IF v_definition = r.definition THEN
      RAISE EXCEPTION 'Could not safely replace administrator email in function OID %', r.oid;
    END IF;
    EXECUTE v_definition;
    v_count := v_count + 1;
  END LOOP;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Expected to update 2 order security functions, updated %', v_count;
  END IF;
END
$$;