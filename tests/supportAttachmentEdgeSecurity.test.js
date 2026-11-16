import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const edge = await readFile(
  new URL('../supabase/functions/support-attachments/index.ts', import.meta.url),
  'utf8'
);
const migration = await readFile(
  new URL('../supabase/migrations/20261110155000_support_ticket_attachments.sql', import.meta.url),
  'utf8'
);

test('support attachment bucket remains private and direct client access is denied', () => {
  assert.match(migration, /values\s*\(\s*'support-attachments'\s*,\s*'support-attachments'\s*,\s*false/i);
  assert.match(migration, /create policy "Deny direct support attachment access" on storage\.objects as restrictive/i);
  assert.match(migration, /using\s*\(bucket_id\s*<>\s*'support-attachments'\)/i);
  assert.match(migration, /with check\s*\(bucket_id\s*<>\s*'support-attachments'\)/i);
});

test('signed attachment URLs require a verified ticket message reference', () => {
  assert.match(edge, /action === "sign"/);
  assert.match(edge, /\.eq\("ticket_ref", ticketId\)/);
  assert.match(edge, /\.in\("attachment_path", uniquePaths\)/);
  assert.match(edge, /messageRows\.length !== uniquePaths\.length/);
  assert.match(edge, /createSignedUrl\(path, 600\)/);
  assert.doesNotMatch(edge, /getPublicUrl\s*\(/);
});

test('attachment upload validates size, declared MIME type and actual image signatures', () => {
  assert.match(edge, /const MAX_FILE_SIZE = 5 \* 1024 \* 1024/);
  assert.match(edge, /file\.size > MAX_FILE_SIZE/);
  assert.match(edge, /imageBytes\[0\] === 0xff[\s\S]*imageBytes\[1\] === 0xd8[\s\S]*imageBytes\[2\] === 0xff/);
  assert.match(edge, /imageBytes\[0\] === 0x89[\s\S]*imageBytes\[1\] === 0x50[\s\S]*imageBytes\[7\] === 0x0a/);
  assert.match(edge, /=== "RIFF"[\s\S]*=== "WEBP"/);
});

test('upload and signing both require a ticket owner, admin or valid private access token', () => {
  assert.match(edge, /admin\.auth\.getUser\(bearer\)/);
  assert.match(edge, /user\.id === ADMIN_ID[\s\S]*user\.app_metadata\?\.role === "admin"/);
  assert.match(edge, /ticket\.customer_user_id/);
  assert.match(edge, /ticket\.email/);
  assert.match(edge, /await sha256\(accessToken\) === ticket\.access_token_hash/);
  assert.match(edge, /if \(!isAdmin && !isAccountCustomer && !isTokenCustomer\) return json\(\{ error: "Access denied" \}, 403\)/);
});

test('database attachment RPC independently checks ticket authorization and object ownership', () => {
  assert.match(migration, /if v_is_admin is not true and v_is_customer is not true then raise exception/i);
  assert.match(migration, /from storage\.objects o where o\.bucket_id='support-attachments' and o\.name=p_attachment_path/i);
  assert.match(migration, /split_part\(p_attachment_path,'\/',1\) is distinct from p_ticket_id/i);
  assert.match(migration, /p_attachment_size is null or p_attachment_size not between 1 and 5242880/i);
});

test('failed persistence never deletes an attachment when the database verification is uncertain', () => {
  assert.match(edge, /if \(verificationError\)[\s\S]*return json\(\{ error: "შეტყობინების შენახვა მოწმდება\./);
  assert.match(edge, /if \(canRemoveSupportAttachmentAfterFailedSave\(\{ verificationError, persistedMessage \}\)\)[\s\S]*storage\.from\(BUCKET\)\.remove\(\[path\]\)/);
});
