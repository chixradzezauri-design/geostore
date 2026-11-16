const SUPPORT_TICKET_HISTORY_PAGE_SIZE = 50;

const isMissingSupportTicketHistoryRpc = (status, detail) =>
  status === 404 && /PGRST202|could not find the function|function .* does not exist|schema cache/i.test(String(detail || ''));

const normalizeSupportTicketRows = rows => {
  if (!Array.isArray(rows)) throw new Error('Invalid support ticket history response');
  return rows.filter(row =>
    row &&
    typeof row.ticket_id === 'string' &&
    /^t-[a-f0-9]{32}$/i.test(row.ticket_id) &&
    typeof row.last_message_at === 'string' &&
    Number.isFinite(Date.parse(row.last_message_at))
  );
};

export const mergeSupportTicketPages = (existing, incoming) => {
  const byTicketId = new Map();
  for (const ticket of Array.isArray(existing) ? existing : []) {
    if (ticket?.ticket_id) byTicketId.set(ticket.ticket_id, ticket);
  }
  for (const ticket of Array.isArray(incoming) ? incoming : []) {
    if (ticket?.ticket_id) byTicketId.set(ticket.ticket_id, ticket);
  }
  return [...byTicketId.values()].sort((a, b) => {
    const aTime = Date.parse(a.last_message_at || a.created_at || '') || 0;
    const bTime = Date.parse(b.last_message_at || b.created_at || '') || 0;
    return bTime - aTime || String(b.ticket_id).localeCompare(String(a.ticket_id));
  });
};

export const fetchMySupportTickets = async ({ supabaseUrl, headers, cursor = null }) => {
  const safeCursor = cursor && typeof cursor === 'object' ? cursor : null;
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_my_support_tickets_page`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_limit: SUPPORT_TICKET_HISTORY_PAGE_SIZE,
      p_before_last_message_at: safeCursor?.last_message_at || null,
      p_before_ticket_id: safeCursor?.ticket_id || null
    })
  });
  const detail = response.ok ? '' : await response.text().catch(() => '');
  if (!response.ok && isMissingSupportTicketHistoryRpc(response.status, detail)) {
    // Keep the existing first-page history working until the pagination
    // migration is installed; older deployments already expose this RPC.
    if (safeCursor) return { rows: [], nextCursor: null };
    const legacyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_my_support_tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_limit: SUPPORT_TICKET_HISTORY_PAGE_SIZE })
    });
    const legacyDetail = legacyResponse.ok ? '' : await legacyResponse.text().catch(() => '');
    if (!legacyResponse.ok && isMissingSupportTicketHistoryRpc(legacyResponse.status, legacyDetail)) return null;
    if (!legacyResponse.ok) throw new Error(legacyDetail || `HTTP ${legacyResponse.status}`);
    return { rows: normalizeSupportTicketRows(await legacyResponse.json()), nextCursor: null };
  }
  if (!response.ok) throw new Error(detail || `HTTP ${response.status}`);
  const validRows = normalizeSupportTicketRows(await response.json());
  const last = validRows[validRows.length - 1];
  return {
    rows: validRows,
    nextCursor: validRows.length === SUPPORT_TICKET_HISTORY_PAGE_SIZE
      ? { last_message_at: last.last_message_at, ticket_id: last.ticket_id }
      : null
  };
};
