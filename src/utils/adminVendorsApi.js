import { supabase } from '../supabaseClient';

const MISSING_RPC_CODES = new Set(['PGRST202', '42883']);

const isMissingRpc = (error) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return MISSING_RPC_CODES.has(code) ||
    /could not find the function|function .* does not exist|schema cache/i.test(message);
};

export const normalizeAdminVendor = (vendor) => {
  if (!vendor || typeof vendor !== 'object' || Array.isArray(vendor)) return null;

  const id = String(vendor.id || '').trim();
  const name = String(vendor.name || '').trim();
  const commission = Number(vendor.commission ?? 0);
  if (!id || id.length > 64 || !name || name.length > 100 ||
      !Number.isFinite(commission) || commission < 0 || commission > 100) {
    return null;
  }

  const archivedAt = vendor.archived_at || vendor.archivedAt || null;
  return {
    id,
    name,
    commission: Math.round(commission * 100) / 100,
    status: archivedAt ? 'არქივირებული' : String(vendor.status || 'აქტიური').trim().slice(0, 40) || 'აქტიური',
    archived_at: archivedAt,
    created_at: vendor.created_at || vendor.createdAt || null,
    updated_at: vendor.updated_at || vendor.updatedAt || null
  };
};

export const normalizeAdminVendors = (vendors) =>
  (Array.isArray(vendors) ? vendors : [])
    .map(normalizeAdminVendor)
    .filter(Boolean);

const timestamp = (value) => {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
};

export const mergeAdminVendors = (localVendors, remoteVendors) => {
  const merged = new Map();
  normalizeAdminVendors(remoteVendors).forEach((vendor) => merged.set(vendor.id, vendor));

  normalizeAdminVendors(localVendors).forEach((localVendor) => {
    const remoteVendor = merged.get(localVendor.id);
    if (!remoteVendor || timestamp(localVendor.updated_at) > timestamp(remoteVendor.updated_at)) {
      merged.set(localVendor.id, localVendor);
    }
  });

  return [...merged.values()].sort((a, b) =>
    String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
    a.id.localeCompare(b.id)
  );
};

const withSyncTimestamp = (vendor) => ({
  ...vendor,
  updated_at: vendor.updated_at || new Date().toISOString()
});

export const syncAdminVendors = async (localVendors, client = supabase) => {
  const { data, error } = await client.rpc('list_admin_vendors');
  if (error) {
    if (isMissingRpc(error)) {
      return { supported: false, vendors: normalizeAdminVendors(localVendors) };
    }
    throw error;
  }

  const remoteVendors = normalizeAdminVendors(data);
  const merged = mergeAdminVendors(localVendors, remoteVendors);
  const remoteById = new Map(remoteVendors.map((vendor) => [vendor.id, vendor]));
  const pending = merged
    .filter((vendor) => {
      const remote = remoteById.get(vendor.id);
      return !remote || timestamp(vendor.updated_at) > timestamp(remote.updated_at);
    })
    .map(withSyncTimestamp);

  if (pending.length) {
    const { error: saveError } = await client.rpc('save_admin_vendors', {
      p_vendors: pending
    });
    if (saveError) {
      if (isMissingRpc(saveError)) {
        return { supported: false, vendors: normalizeAdminVendors(localVendors) };
      }
      throw saveError;
    }
  }

  const { data: latestData, error: latestError } = await client.rpc('list_admin_vendors');
  if (latestError) throw latestError;

  return {
    supported: true,
    vendors: normalizeAdminVendors(latestData)
  };
};

export const persistAdminVendors = async (vendors, client = supabase) => {
  const payload = normalizeAdminVendors(vendors).filter((vendor) => vendor.updated_at);
  if (!payload.length) return { supported: true, saved: 0 };

  const { data, error } = await client.rpc('save_admin_vendors', {
    p_vendors: payload
  });
  if (error) {
    if (isMissingRpc(error)) return { supported: false, saved: 0 };
    throw error;
  }

  return { supported: true, saved: Number(data || 0) };
};
