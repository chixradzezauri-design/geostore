import test from 'node:test';
import assert from 'node:assert/strict';

import {
  attachSupportImageUrls,
  canRemoveSupportAttachmentAfterFailedSave,
  uploadSupportAttachment,
  validateSupportAttachment
} from '../src/utils/supportAttachments.js';

test('support attachment validation allows supported image types up to 5 MB', () => {
  assert.equal(validateSupportAttachment(null), '');
  assert.equal(validateSupportAttachment({ type: 'image/jpeg', size: 1 }), '');
  assert.equal(validateSupportAttachment({ type: 'image/png', size: 5 * 1024 * 1024 }), '');
  assert.equal(validateSupportAttachment({ type: 'image/webp', size: 1024 }), '');
});

test('support attachment validation rejects unsupported types and invalid sizes', () => {
  assert.match(validateSupportAttachment({ type: 'image/gif', size: 100 }), /JPG, PNG ან WEBP/);
  assert.match(validateSupportAttachment({ type: 'image/jpeg', size: 0 }), /5 MB/);
  assert.match(validateSupportAttachment({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }), /5 MB/);
});

test('text-only support messages do not request signed image URLs', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error('unexpected fetch');
  };
  try {
    const rows = [{ id: 1, message: 'hello', attachment_path: null }];
    const result = await attachSupportImageUrls({
      rows,
      supabaseUrl: 'https://example.supabase.co',
      headers: { apikey: 'public-key', Authorization: 'Bearer token' },
      ticketId: 't-test'
    });
    assert.deepEqual(result, rows);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('support attachment upload sends the file through the private Edge Function', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({ success: true, result: { message_id: 9 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  try {
    const file = new File(['image bytes'], 'photo.png', { type: 'image/png' });
    const result = await uploadSupportAttachment({
      supabaseUrl: 'https://example.supabase.co',
      headers: { apikey: 'public-key', Authorization: 'Bearer session-token', 'Content-Type': 'application/json' },
      ticketId: 't-test',
      accessToken: 'a'.repeat(64),
      message: 'See attached',
      requestId: '11111111-1111-4111-8111-111111111111',
      file
    });
    assert.equal(result.message_id, 9);
    assert.equal(captured.url, 'https://example.supabase.co/functions/v1/support-attachments');
    assert.equal(captured.options.method, 'POST');
    assert.equal(captured.options.headers.apikey, 'public-key');
    assert.equal(captured.options.headers.Authorization, 'Bearer session-token');
    assert.equal(captured.options.headers['Content-Type'], undefined);
    assert.equal(captured.options.body.get('ticket_id'), 't-test');
    assert.equal(captured.options.body.get('file').name, 'photo.png');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('support attachment history resolves images through ticket-authorized signed URLs', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({ signed_urls: { 't-test/11111111-1111-4111-8111-111111111111.png': 'https://example.supabase.co/storage/v1/object/sign/support-attachments/t-test/photo.png?token=short-lived' }, expires_in: 600 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  try {
    const rows = [{ id: 2, attachment_path: 't-test/11111111-1111-4111-8111-111111111111.png' }];
    const result = await attachSupportImageUrls({
      rows,
      supabaseUrl: 'https://example.supabase.co',
      headers: { apikey: 'public-key', Authorization: 'Bearer session-token' },
      ticketId: 't-test',
      accessToken: 'a'.repeat(64)
    });
    assert.equal(result[0].attachment_url.includes('token=short-lived'), true);
    assert.equal(captured.url, 'https://example.supabase.co/functions/v1/support-attachments');
    assert.equal(JSON.parse(captured.options.body).action, 'sign');
    assert.equal(JSON.parse(captured.options.body).access_token, 'a'.repeat(64));
    assert.deepEqual(JSON.parse(captured.options.body).attachment_paths, ['t-test/11111111-1111-4111-8111-111111111111.png']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('long support threads request signed image URLs in batches of at most 100', async () => {
  const originalFetch = globalThis.fetch;
  const batchSizes = [];
  globalThis.fetch = async (_url, options) => {
    const paths = JSON.parse(options.body).attachment_paths;
    batchSizes.push(paths.length);
    return new Response(JSON.stringify({
      signed_urls: Object.fromEntries(paths.map((path) => [path, `https://example.test/${path}`]))
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      id: index + 1,
      attachment_path: `t-test/${String(index + 1).padStart(36, '0')}.png`
    }));
    const result = await attachSupportImageUrls({
      rows,
      supabaseUrl: 'https://example.supabase.co',
      headers: { apikey: 'public-key', Authorization: 'Bearer session-token' },
      ticketId: 't-test'
    });
    assert.deepEqual(batchSizes.sort((a, b) => a - b), [1, 100]);
    assert.equal(result.length, 101);
    assert.equal(result.every((row) => row.attachment_url.startsWith('https://example.test/')), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


import {
  fetchSupportTicketMessages,
  fetchSupportTicketUnreadCounts,
  markSupportTicketMessagesRead
} from '../src/utils/supportThreadApi.js';

const missingSupportRpc = (name) => new Response(JSON.stringify({
  code: 'PGRST202',
  message: `Could not find the function public.${name} in the schema cache`
}), { status: 404, headers: { 'Content-Type': 'application/json' } });

test('support thread falls back to the legacy RPC when attachment migration is not installed', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    if (url.endsWith('/get_support_ticket_messages_with_attachments')) {
      return missingSupportRpc('get_support_ticket_messages_with_attachments');
    }
    return new Response(JSON.stringify([{ id: 1, message: 'Old message', sender_role: 'customer' }]), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  };
  try {
    const rows = await fetchSupportTicketMessages({
      supabaseUrl: 'https://example.supabase.co',
      headers: { apikey: 'public-key' },
      ticketId: 't-example',
      accessToken: 'a'.repeat(64)
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].message, 'Old message');
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url.endsWith('/get_support_ticket_messages'), true);
    assert.equal(calls[1].body.p_access_token, 'a'.repeat(64));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('support thread does not fall back on authorization errors', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response('Forbidden', { status: 403 });
  };
  try {
    await assert.rejects(fetchSupportTicketMessages({
      supabaseUrl: 'https://example.supabase.co',
      headers: {},
      ticketId: 't-example'
    }), /Forbidden/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('missing read-receipt RPC does not block opening a support thread', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => missingSupportRpc('mark_support_ticket_messages_read');
  try {
    const result = await markSupportTicketMessagesRead({
      supabaseUrl: 'https://example.supabase.co',
      headers: {},
      ticketId: 't-example'
    });
    assert.equal(result, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('missing unread-count RPC returns an empty count list without failing tickets', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => missingSupportRpc('get_support_ticket_unread_counts');
  try {
    const rows = await fetchSupportTicketUnreadCounts({
      supabaseUrl: 'https://example.supabase.co',
      headers: {}
    });
    assert.deepEqual(rows, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test('failed support attachment save is cleaned up only after a successful absence check', () => {
  assert.equal(canRemoveSupportAttachmentAfterFailedSave({ verificationError: null, persistedMessage: null }), true);
  assert.equal(canRemoveSupportAttachmentAfterFailedSave({ verificationError: null, persistedMessage: { id: 7 } }), false);
  assert.equal(canRemoveSupportAttachmentAfterFailedSave({ verificationError: new Error('network'), persistedMessage: null }), false);
});
