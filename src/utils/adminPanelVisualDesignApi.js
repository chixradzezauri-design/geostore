import { supabase } from '../supabaseClient.js';
import { normalizeAdminPanelVisualDesign } from './adminPanelVisualDesign.js';

const normalizeDesignState = data => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { design: null, updatedAt: null };
  }
  return {
    design: data.design && typeof data.design === 'object' && !Array.isArray(data.design)
      ? normalizeAdminPanelVisualDesign(data.design)
      : null,
    updatedAt: typeof data.updated_at === 'string' ? data.updated_at : null
  };
};

export async function fetchAdminPanelVisualDesign() {
  const { data, error } = await supabase.rpc('get_admin_panel_visual_design_state');
  if (error) throw error;
  return normalizeDesignState(data);
}

export async function saveAdminPanelVisualDesignToCloud(rawDesign, expectedUpdatedAt = null) {
  const design = normalizeAdminPanelVisualDesign(rawDesign);
  const { data, error } = await supabase.rpc('save_admin_panel_visual_design_state', {
    p_design: design,
    p_expected_updated_at: expectedUpdatedAt
  });
  if (error) throw error;
  const state = normalizeDesignState(data);
  return { ...state, design: state.design || design };
}
