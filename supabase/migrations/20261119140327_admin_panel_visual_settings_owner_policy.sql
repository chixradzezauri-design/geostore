-- Add an explicit owner-only RLS policy as defense in depth.
-- Direct table grants remain revoked; normal access is through owner-checked RPCs.
DROP POLICY IF EXISTS admin_panel_visual_settings_owner_only ON private.admin_panel_visual_settings;
-- Defense-in-depth RLS: only the primary owner identity can address this row.
-- Table privileges remain revoked; application access is still through checked RPCs.
CREATE POLICY admin_panel_visual_settings_owner_only
  ON private.admin_panel_visual_settings
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
    AND coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
  )
  WITH CHECK (
    auth.uid() = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
    AND coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
  );
