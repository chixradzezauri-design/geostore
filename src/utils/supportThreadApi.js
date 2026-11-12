const isMissingRpc = (status, detail) => (
  status === 404 && /PGRST202|could not find the function|function .* does not exist|schema cache/i.test(String(detail || ''))
);

const postRpc = async (supabaseUrl, headers, functionName, body) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const detail = response.ok ? '' : await response.text().catch(() => '');
  return { response, detail };
};

const parseRows = async (response, detail, label) => {
  if (!response.ok) throw new Error(detail || `${label}: HTTP ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error(`${label}: მონაცემების ფორმატი არასწორია.`);
  return rows;
};

// Use the attachment-aware RPC when its migration is installed, while keeping
// existing ticket conversations readable during a staged/combined release.
export const fetchSupportTicketMessages = async ({
  supabaseUrl,
  headers,
  ticketId,
  accessToken = ''
}) => {
  const enhanced = await postRpc(
    supabaseUrl,
    headers,
    'get_support_ticket_messages_with_attachments',
    { p_ticket_id: ticketId, p_access_token: accessToken || null }
  );
  if (enhanced.response.ok) {
    return parseRows(enhanced.response, '', 'მიმოწერის ჩატვირთვა');
  }
  if (!isMissingRpc(enhanced.response.status, enhanced.detail)) {
    throw new Error(enhanced.detail || `მიმოწერის ჩატვირთვა ვერ მოხერხდა (HTTP ${enhanced.response.status}).`);
  }

  const legacy = await postRpc(
    supabaseUrl,
    headers,
    'get_support_ticket_messages',
    { p_ticket_id: ticketId, p_access_token: accessToken || null }
  );
  return parseRows(legacy.response, legacy.detail, 'მიმოწერის ჩატვირთვა');
};

// Read receipts are an additive enhancement. Their absence must not hide a
// conversation or block the existing support workflow.
export const markSupportTicketMessagesRead = async ({
  supabaseUrl,
  headers,
  ticketId,
  accessToken = ''
}) => {
  const { response, detail } = await postRpc(
    supabaseUrl,
    headers,
    'mark_support_ticket_messages_read',
    { p_ticket_id: ticketId, p_access_token: accessToken || null }
  );
  if (!response.ok && isMissingRpc(response.status, detail)) return false;
  if (!response.ok) {
    throw new Error(detail || `წაკითხული შეტყობინებების აღრიცხვა ვერ მოხერხდა (HTTP ${response.status}).`);
  }
  return true;
};

// Customer status is an additive, ownership-checked RPC. Older deployments
// continue to show the conversation without a status label until migrated.
export const fetchSupportTicketStatus = async ({ supabaseUrl, headers, ticketId, accessToken = '' }) => {
  const { response, detail } = await postRpc(
    supabaseUrl,
    headers,
    'get_support_ticket_status',
    { p_ticket_id: ticketId, p_access_token: accessToken || null }
  );
  if (!response.ok && isMissingRpc(response.status, detail)) return null;
  const rows = await parseRows(response, detail, 'ტიკეტის სტატუსის ჩატვირთვა');
  return rows[0] || null;
};

// This list is deliberately restricted to the authenticated UUID owner. It does
// not fall back to email matching or expose legacy guest tickets.
export const fetchMySupportTickets = async ({ supabaseUrl, headers }) => {
  const { response, detail } = await postRpc(
    supabaseUrl,
    headers,
    'get_my_support_tickets',
    { p_limit: 50 }
  );
  if (!response.ok && isMissingRpc(response.status, detail)) return null;
  return parseRows(response, detail, 'ჩემი მიმართვების ჩატვირთვა');
};

// If read-receipt migration is not installed yet, keep ticket loading available
// and simply show no unread badge until the additive RPC becomes available.
export const fetchSupportTicketUnreadCounts = async ({ supabaseUrl, headers }) => {
  const { response, detail } = await postRpc(
    supabaseUrl,
    headers,
    'get_support_ticket_unread_counts',
    {}
  );
  if (!response.ok && isMissingRpc(response.status, detail)) return [];
  return parseRows(response, detail, 'წაუკითხავი შეტყობინებების დათვლა');
};
