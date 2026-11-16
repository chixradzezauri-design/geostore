const isMissingSupportStatusRpc = (status, detail) => (
  status === 404 && /PGRST202|could not find the function|function .* does not exist|schema cache/i.test(String(detail || ''))
);

// This RPC returns only minimal metadata for the verified ticket owner/admin.
// If its additive migration is not deployed yet, the conversation still works.
export const fetchSupportTicketStatus = async ({
  supabaseUrl,
  headers,
  ticketId,
  accessToken = ''
}) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_support_ticket_status`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_ticket_id: ticketId, p_access_token: accessToken || null })
  });
  const detail = response.ok ? '' : await response.text().catch(() => '');
  if (!response.ok && isMissingSupportStatusRpc(response.status, detail)) return null;
  if (!response.ok) {
    throw new Error(detail || `ტიკეტის სტატუსის ჩატვირთვა ვერ მოხერხდა (HTTP ${response.status}).`);
  }
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('ტიკეტის სტატუსის მონაცემების ფორმატი არასწორია.');
  return rows[0] || null;
};
