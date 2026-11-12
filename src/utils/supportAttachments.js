const FUNCTION_NAME = 'support-attachments';
const MAX_SUPPORT_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const getFunctionHeaders = (headers, includeJson = false) => ({
  apikey: headers?.apikey || '',
  Authorization: headers?.Authorization || '',
  ...(includeJson ? { 'Content-Type': 'application/json' } : {})
});

export const validateSupportAttachment = (file) => {
  if (!file) return '';
  if (!SUPPORT_IMAGE_TYPES.has(file.type)) return 'დასაშვებია მხოლოდ JPG, PNG ან WEBP ფოტო.';
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > MAX_SUPPORT_IMAGE_BYTES) {
    return 'ფოტოს ზომა უნდა იყოს მაქსიმუმ 5 MB.';
  }
  return '';
};

export const uploadSupportAttachment = async ({
  supabaseUrl,
  headers,
  ticketId,
  accessToken = '',
  message = '',
  requestId,
  file
}) => {
  const form = new FormData();
  form.set('action', 'upload');
  form.set('ticket_id', ticketId);
  form.set('access_token', accessToken);
  form.set('message', message);
  form.set('request_id', requestId);
  form.set('file', file);

  const response = await fetch(`${supabaseUrl}/functions/v1/${FUNCTION_NAME}`, {
    method: 'POST',
    headers: getFunctionHeaders(headers),
    body: form
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `ფოტოს ატვირთვა ვერ მოხერხდა (HTTP ${response.status}).`);
  }
  const result = await response.json();
  if (!result?.success) throw new Error('ფოტოს ატვირთვის პასუხი არასწორია.');
  return result.result;
};

export const getSupportAttachmentUrls = async ({
  supabaseUrl,
  headers,
  ticketId,
  accessToken = '',
  attachmentPaths
}) => {
  const uniquePaths = [...new Set(Array.isArray(attachmentPaths) ? attachmentPaths.filter(Boolean) : [])];
  if (!uniquePaths.length) return {};
  const batches = [];
  for (let index = 0; index < uniquePaths.length; index += 100) {
    batches.push(uniquePaths.slice(index, index + 100));
  }
  const results = await Promise.all(batches.map(async (batch) => {
    const response = await fetch(`${supabaseUrl}/functions/v1/${FUNCTION_NAME}`, {
      method: 'POST',
      headers: getFunctionHeaders(headers, true),
      body: JSON.stringify({
        action: 'sign',
        ticket_id: ticketId,
        access_token: accessToken,
        attachment_paths: batch
      })
    });
    if (!response.ok) throw new Error('ფოტოს უსაფრთხო ბმულის მიღება ვერ მოხერხდა.');
    const result = await response.json();
    return result?.signed_urls && typeof result.signed_urls === 'object' ? result.signed_urls : {};
  }));
  return Object.assign({}, ...results);
};

export const attachSupportImageUrls = async ({
  rows,
  supabaseUrl,
  headers,
  ticketId,
  accessToken = ''
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const attachmentPaths = [...new Set(safeRows.map((row) => row?.attachment_path).filter(Boolean))];
  if (!attachmentPaths.length) return safeRows;
  try {
    const signedUrls = await getSupportAttachmentUrls({
      supabaseUrl,
      headers,
      ticketId,
      accessToken,
      attachmentPaths
    });
    return safeRows.map((row) => ({
      ...row,
      attachment_url: row?.attachment_path ? String(signedUrls[row.attachment_path] || '') : ''
    }));
  } catch (error) {
    console.warn('GEOSTORE support image links unavailable:', error);
    return safeRows.map((row) => row?.attachment_path ? { ...row, attachment_url: '' } : row);
  }
};

// A Storage object may be removed after an RPC error only when a follow-up
// database read succeeded and proved that no committed message references it.
export const canRemoveSupportAttachmentAfterFailedSave = ({ verificationError, persistedMessage }) => (
  !verificationError && !persistedMessage
);
