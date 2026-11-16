const LEGACY_MESSAGE_COLUMNS = 'id,created_at,client_name,sender,text,image,time';
const LEGACY_MESSAGE_PAGE_SIZE = 100;

const isValidCursor = cursor => (
  cursor &&
  typeof cursor.created_at === 'string' &&
  Number.isFinite(Date.parse(cursor.created_at)) &&
  (typeof cursor.id === 'string' || typeof cursor.id === 'number') &&
  /^[A-Za-z0-9_-]{1,128}$/.test(String(cursor.id))
);

export const buildLegacyMessagesPageUrl = (supabaseUrl, cursor = null, pageSize = LEGACY_MESSAGE_PAGE_SIZE) => {
  const safeLimit = Number.isFinite(Number(pageSize))
    ? Math.min(LEGACY_MESSAGE_PAGE_SIZE, Math.max(1, Math.floor(Number(pageSize))))
    : LEGACY_MESSAGE_PAGE_SIZE;
  const params = new URLSearchParams({
    select: LEGACY_MESSAGE_COLUMNS,
    order: 'created_at.desc,id.asc',
    limit: String(safeLimit)
  });
  if (cursor !== null) {
    if (!isValidCursor(cursor)) throw new Error('მიმოწერის ისტორიის გვერდის კურსორი არასწორია.');
    const timestamp = cursor.created_at;
    const id = String(cursor.id);
    params.set('or', \`(created_at.lt.\${timestamp},and(created_at.eq.\${timestamp},id.gt.\${id}))\`);
  }
  return \`\${String(supabaseUrl || '').replace(/\/+$/, '')}/rest/v1/messages?\${params.toString()}\`;
};

export const getLegacyMessageCursor = rows => {
  if (!Array.isArray(rows) || rows.length !== LEGACY_MESSAGE_PAGE_SIZE) return null;
  const last = rows[rows.length - 1];
  if (!last || !isValidCursor({ created_at: last.created_at, id: last.id })) return null;
  return { created_at: last.created_at, id: last.id };
};

export const mergeLegacyMessagePages = (existing, incoming) => {
  const byId = new Map();
  const append = row => {
    if (!row || typeof row !== 'object') return;
    const key = row.id === null || row.id === undefined ? \`legacy-row-\${byId.size}\` : String(row.id);
    byId.set(key, row);
  };
  (Array.isArray(existing) ? existing : []).forEach(append);
  (Array.isArray(incoming) ? incoming : []).forEach(append);
  return [...byId.values()].sort((a, b) => {
    const aTime = Date.parse(a?.created_at || '') || 0;
    const bTime = Date.parse(b?.created_at || '') || 0;
    if (aTime !== bTime) return bTime - aTime;
    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''), undefined, { numeric: true });
  });
};
