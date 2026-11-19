import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchAdminCustomerDirectory,
  saveAdminCustomerCrmProfile
} from '../src/utils/adminCustomerCrmApi.js';

const headers = { apikey: 'test-key', Authorization: 'Bearer test-token' };

test('CRM directory uses the authenticated RPC and maps persistent profile fields', async () => {
  let request;
  const rows = await fetchAdminCustomerDirectory({
    supabaseUrl: 'https://example.supabase.co/',
    headers,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => [{
        id: '1060de3d-d28a-45f8-9a64-5e0368cffc4b',
        email: 'admin@example.com',
        is_vip: true,
        is_blocked: false,
        discount_percent: '12.5',
        admin_notes: 'VIP',
        orders_count: '3'
      }] };
    }
  });
  assert.equal(request.url, 'https://example.supabase.co/rest/v1/rpc/list_admin_customers');
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), { p_limit: 500 });
  assert.equal(rows[0].isVip, true);
  assert.equal(rows[0].discountPercent, 12.5);
  assert.equal(rows[0].orderCount, 3);
  assert.equal(rows[0].isServerCustomer, true);
});

test('CRM profile save sends only validated profile fields to the authenticated RPC', async () => {
  let request;
  const result = await saveAdminCustomerCrmProfile({
    supabaseUrl: 'https://example.supabase.co',
    headers,
    profile: {
      id: '1060de3d-d28a-45f8-9a64-5e0368cffc4b',
      isVip: true,
      isBlocked: false,
      discountPercent: 10,
      adminNotes: 'Call before delivery'
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ is_vip: true, discount_percent: 10 }) };
    }
  });
  assert.equal(request.url, 'https://example.supabase.co/rest/v1/rpc/save_admin_customer_crm_profile');
  assert.deepEqual(JSON.parse(request.options.body), {
    p_user_id: '1060de3d-d28a-45f8-9a64-5e0368cffc4b',
    p_is_vip: true,
    p_is_blocked: false,
    p_discount_percent: 10,
    p_admin_notes: 'Call before delivery'
  });
  assert.equal(result.is_vip, true);
});

test('CRM helpers reject missing admin authorization and invalid profile values', async () => {
  await assert.rejects(
    fetchAdminCustomerDirectory({
      supabaseUrl: 'https://example.supabase.co',
      headers: { apikey: 'test-key' },
      fetchImpl: async () => { throw new Error('must not call'); }
    }),
    /ადმინისტრატორის სესია/
  );
  await assert.rejects(
    saveAdminCustomerCrmProfile({
      supabaseUrl: 'https://example.supabase.co',
      headers,
      profile: {
        id: '1060de3d-d28a-45f8-9a64-5e0368cffc4b',
        discountPercent: 101,
        adminNotes: ''
      },
      fetchImpl: async () => { throw new Error('must not call'); }
    }),
    /0–100%/
  );
});

test('CRM profile save rejects non-UUID identifiers and oversized notes', async () => {
  await assert.rejects(
    saveAdminCustomerCrmProfile({
      supabaseUrl: 'https://example.supabase.co',
      headers,
      profile: { id: 'legacy-crm-1', discountPercent: 0, adminNotes: '' },
      fetchImpl: async () => { throw new Error('must not call'); }
    }),
    /იდენტიფიკატორი/
  );
  await assert.rejects(
    saveAdminCustomerCrmProfile({
      supabaseUrl: 'https://example.supabase.co',
      headers,
      profile: {
        id: '1060de3d-d28a-45f8-9a64-5e0368cffc4b',
        discountPercent: 0,
        adminNotes: 'x'.repeat(1001)
      },
      fetchImpl: async () => { throw new Error('must not call'); }
    }),
    /1000 სიმბოლო/
  );
});
