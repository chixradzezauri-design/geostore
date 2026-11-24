-- STAGED CANDIDATE ONLY. Do not apply to production before review and
-- isolated PostgreSQL role/concurrency tests. Generate a tracked migration
-- using the Supabase CLI once an isolated environment is available.
BEGIN;
CREATE TABLE public.admin_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 100),
  commission numeric(5,2) NOT NULL DEFAULT 0 CHECK (commission BETWEEN 0 AND 100),
  is_active boolean NOT NULL DEFAULT true,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_suppliers_normalized_name_uidx ON public.admin_suppliers (lower(name));
ALTER TABLE public.admin_suppliers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_suppliers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_suppliers TO authenticated;
GRANT INSERT (name, commission, is_active) ON public.admin_suppliers TO authenticated;
GRANT UPDATE (commission, is_active) ON public.admin_suppliers TO authenticated;
-- Exact owner rule matches the inspected live has_staff_permission implementation.
-- Existing staff roles do not include a supplier permission; do not widen them.
CREATE POLICY admin_suppliers_owner_select ON public.admin_suppliers
  FOR SELECT TO authenticated USING (
    (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
    AND coalesce((SELECT auth.jwt())->'app_metadata'->>'role','') = 'admin'
  );
CREATE POLICY admin_suppliers_owner_insert ON public.admin_suppliers
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
    AND coalesce((SELECT auth.jwt())->'app_metadata'->>'role','') = 'admin'
  );
CREATE POLICY admin_suppliers_owner_update ON public.admin_suppliers
  FOR UPDATE TO authenticated USING (
    (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
    AND coalesce((SELECT auth.jwt())->'app_metadata'->>'role','') = 'admin'
  ) WITH CHECK (
    (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
    AND coalesce((SELECT auth.jwt())->'app_metadata'->>'role','') = 'admin'
  );
-- Only mutable fields can be changed via API grants. Names/IDs are immutable,
-- since existing product and order snapshots link by supplier name.
CREATE FUNCTION private.bump_admin_supplier_revision() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.revision := OLD.revision + 1;
  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.bump_admin_supplier_revision() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER admin_supplier_revision BEFORE UPDATE ON public.admin_suppliers
  FOR EACH ROW EXECUTE FUNCTION private.bump_admin_supplier_revision();
-- No DELETE grant/policy. Archive instead so historical relationships survive.
COMMIT;
