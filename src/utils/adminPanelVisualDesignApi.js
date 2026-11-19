import { supabase } from '../supabaseClient.js';
import { normalizeAdminPanelVisualDesign } from './adminPanelVisualDesign.js';

export async function fetchAdminPanelVisualDesign() {
  const { data, error } = await supabase.rpc('get_admin_panel_visual_design');
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return normalizeAdminPanelVisualDesign(data);
}

export async function saveAdminPanelVisualDesignToCloud(rawDesign) {
  const design = normalizeAdminPanelVisualDesign(rawDesign);
  const { data, error } = await supabase.rpc('save_admin_panel_visual_design', {
    p_design: design
  });
  if (error) throw error;
  return normalizeAdminPanelVisualDesign(
    data && typeof data === 'object' && !Array.isArray(data) ? data : design
  );
}
