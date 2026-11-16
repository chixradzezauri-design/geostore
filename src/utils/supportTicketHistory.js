const isMissingSupportTicketHistoryRpc = (status, detail) => status === 404 && /PGRST202|could not find the function|function .* does not exist|schema cache/i.test(String(detail || ''));
export const fetchMySupportTickets = async ({ supabaseUrl, headers }) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_my_support_tickets`, { method: 'POST', headers, body: JSON.stringify({ p_limit: 50 }) });
  const detail = response.ok ? '' : await response.text().catch(() => '');
  if (!response.ok && isMissingSupportTicketHistoryRpc(response.status, detail)) return null;
  if (!response.ok) throw new Error(detail || `HTTP ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Invalid support ticket history response');
  return rows.filter(row => row && typeof row.ticket_id === 'string' && /^t-[a-f0-9]{32}$/i.test(row.ticket_id));
};
