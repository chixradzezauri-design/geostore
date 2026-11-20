import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboard = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const api = await readFile(new URL('../src/utils/adminPanelVisualDesignApi.js', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261119152000_admin_panel_visual_design_concurrency.sql', import.meta.url), 'utf8');
const baseMigration = await readFile(new URL('../supabase/migrations/20261119150000_admin_panel_visual_design_sync.sql', import.meta.url), 'utf8');

test('admin visual design is loaded and saved through the shared Supabase RPCs', () => {
  assert.match(api, /supabase\.rpc\('get_admin_panel_visual_design_state'\)/);
  assert.match(api, /supabase\.rpc\('save_admin_panel_visual_design_state'/);
  assert.match(api, /p_design: design/);
  assert.match(api, /p_expected_updated_at: expectedUpdatedAt/);
  assert.doesNotMatch(api, /\.from\(['"]admin_panel_visual_settings/);
});

test('admin visual design cloud access is restricted to the primary admin identity and role', () => {
  const ownerGuard = /auth\.uid\(\) IS DISTINCT FROM '[0-9a-f-]{36}'::uuid[\s\S]*?auth\.jwt\(\)->'app_metadata'->>'role'[\s\S]*?IS DISTINCT FROM 'admin'/;
  assert.match(baseMigration, ownerGuard);
  assert.match(migration, ownerGuard);
  assert.match(baseMigration, /REVOKE ALL ON TABLE private\.admin_panel_visual_settings FROM PUBLIC, anon, authenticated/);
  assert.match(baseMigration, /ALTER TABLE private\.admin_panel_visual_settings FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.save_admin_panel_visual_design_state\(jsonb, timestamptz\) FROM PUBLIC, anon/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.save_admin_panel_visual_design_state\(jsonb, timestamptz\) TO authenticated/);
});

test('admin visual design writes reject stale device versions instead of overwriting newer settings', () => {
  assert.match(migration, /p_expected_updated_at IS DISTINCT FROM v_current_updated_at/);
  assert.match(migration, /USING ERRCODE = '40001'/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /GREATEST\(clock_timestamp\(\), v_current_updated_at \+ interval '1 microsecond'\)/);
  assert.match(dashboard, /setAdminVisualSyncStatus\(error\?\.code === '40001' \? 'conflict' : 'error'\)/);
});

test('admin visual editor loads shared settings before enabling edits and does not claim sync after load failure', () => {
  assert.match(dashboard, /const sharedState = await fetchAdminPanelVisualDesign\(\)/);
  assert.match(dashboard, /setAdminVisualDesignReady\(true\)/);
  assert.match(dashboard, /setAdminVisualSyncStatus\('error'\)/);
  assert.match(dashboard, /setAdminVisualDesignReady\(false\)/);
  assert.match(dashboard, /რედაქტორი დროებით დაბლოკილია/);
});

test('admin visual editor serializes debounced saves and refreshes from other devices only when local changes are absent', () => {
  assert.match(dashboard, /adminVisualSaveQueueRef\.current = adminVisualSaveQueueRef\.current/);
  assert.match(dashboard, /saveAdminPanelVisualDesignToCloud\(adminVisualDesign, adminVisualUpdatedAtRef\.current\)/);
  assert.match(dashboard, /adminVisualHasLocalChangesRef\.current/);
  assert.match(dashboard, /window\.setInterval\(refreshSharedDesign, 30000\)/);
  assert.match(dashboard, /window\.addEventListener\('focus', refreshSharedDesign\)/);
  assert.match(dashboard, /document\.addEventListener\('visibilitychange', handleVisibilityChange\)/);
  assert.match(dashboard, /requestVersion !== adminVisualSaveVersionRef\.current/);
});
