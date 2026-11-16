const resolveRpcUrl = (supabaseUrl, functionName) => {
  const base = String(supabaseUrl || '').replace(/\/+$/, '');
  if (!base || !['list_admin_customers', 'save_admin_customer_crm_profile'].includes(functionName)) {
    throw new Error('Supabase CRM RPC configuration is invalid.');
  }
  return `${base}/rest/v1/rpc/${functionName}`;
};

const assertAdminHeaders = headers => {
  if (!headers || typeof headers !== 'object' || !headers.Authorization || !headers.apikey) {
    throw new Error('აქტიური ადმინისტრატორის სესია ვერ დადასტურდა.');
  }
  return headers;
};

export const fetchAdminCustomerDirectory = async ({ supabaseUrl, headers, fetchImpl = fetch }) => {
  const response = await fetchImpl(resolveRpcUrl(supabaseUrl, 'list_admin_customers'), {
    method: 'POST',
    headers: assertAdminHeaders(headers),
    body: JSON.stringify({ p_limit: 500 })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `CRM მომხმარებლების ჩატვირთვა ვერ მოხერხდა (HTTP ${response.status}).`);
  }
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('CRM მომხმარებლების მონაცემების ფორმატი არასწორია.');
  return rows.map(row => ({
    ...row,
    id: row.id,
    isVip: Boolean(row.is_vip),
    isBlocked: Boolean(row.is_blocked),
    discountPercent: Number(row.discount_percent) || 0,
    adminNotes: String(row.admin_notes || ''),
    orderCount: Number(row.orders_count) || 0,
    isServerCustomer: true,
    isLocalCrmRecord: false
  }));
};

export const saveAdminCustomerCrmProfile = async ({
  supabaseUrl,
  headers,
  profile,
  fetchImpl = fetch
}) => {
  const userId = String(profile?.id || '').trim();
  const discount = Number(profile?.discountPercent) || 0;
  const notes = String(profile?.adminNotes || '');
  if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error('CRM მომხმარებლის იდენტიფიკატორი არასწორია.');
  }
  if (!Number.isFinite(discount) || discount < 0 || discount > 100 || notes.length > 1000) {
    throw new Error('ფასდაკლება უნდა იყოს 0–100%-ის ფარგლებში, შენიშვნა კი მაქსიმუმ 1000 სიმბოლო.');
  }
  const response = await fetchImpl(resolveRpcUrl(supabaseUrl, 'save_admin_customer_crm_profile'), {
    method: 'POST',
    headers: assertAdminHeaders(headers),
    body: JSON.stringify({
      p_user_id: userId,
      p_is_vip: Boolean(profile.isVip),
      p_is_blocked: Boolean(profile.isBlocked),
      p_discount_percent: discount,
      p_admin_notes: notes
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || 'CRM მონაცემების ბაზაში შენახვა ვერ მოხერხდა.');
  }
  const result = await response.json();
  return Array.isArray(result) ? result[0] : result;
};
