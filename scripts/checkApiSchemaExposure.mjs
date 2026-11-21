import { pathToFileURL } from 'node:url';
import { supabase } from '../src/supabaseClient.js';

/**
 * Only PostgREST's HTTP 406/PGRST106 proves this API schema is hidden.
 * SQL schema permissions alone cannot establish Data API exposure.
 */
export const evaluatePrivateSchemaProbe = ({ publicStatus, privateStatus, privateCode }) => {
  if (!Number.isInteger(publicStatus) || publicStatus < 200 || publicStatus > 299) {
    return { safe: false, reason: 'Public Data API health check did not succeed.' };
  }
  if (privateStatus === 406 && privateCode === 'PGRST106') {
    return { safe: true, reason: 'PostgREST explicitly denies private schema exposure.' };
  }
  return {
    safe: false,
    reason: 'Private schema was NOT explicitly rejected with HTTP 406/PGRST106. Review Data API Exposed schemas immediately.'
  };
};

export async function probePrivateSchemaExposure({
  request = fetch,
  origin = supabase.supabaseUrl,
  anonymousKey = supabase.supabaseKey
} = {}) {
  if (!/^https:\/\//.test(origin) || !anonymousKey) {
    throw new Error('Missing HTTPS Supabase URL or public browser API key.');
  }
  // Zero-row GETs only: no RPC calls, authentication, stock writes or orders.
  const url = new URL('/rest/v1/products?select=id&limit=0', origin);
  const headers = {
    apikey: anonymousKey,
    Authorization: 'Bearer ' + anonymousKey
  };
  const publicResponse = await request(url, {
    method: 'GET', headers: { ...headers, 'Accept-Profile': 'public' },
    signal: AbortSignal.timeout(12000), cache: 'no-store'
  });
  if (publicResponse.status < 200 || publicResponse.status > 299) {
    return evaluatePrivateSchemaProbe({
      publicStatus: publicResponse.status, privateStatus: null, privateCode: null
    });
  }
  const privateResponse = await request(url, {
    method: 'GET', headers: { ...headers, 'Accept-Profile': 'private' },
    signal: AbortSignal.timeout(12000), cache: 'no-store'
  });
  // Parse only PostgREST's status/error code, not a customer/product record.
  let privateCode = null;
  if (privateResponse.status === 406) {
    try { privateCode = (await privateResponse.json())?.code || null; }
    catch { privateCode = null; }
  }
  return evaluatePrivateSchemaProbe({
    publicStatus: publicResponse.status,
    privateStatus: privateResponse.status,
    privateCode
  });
}

async function main() {
  const finding = await probePrivateSchemaExposure();
  if (!finding.safe) throw new Error(finding.reason);
  console.log('PASS Stage53 read-only Data API probe: private schema not exposed (PGRST106). No Production writes.');
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => {
    console.error('FAIL Stage53 private schema release gate: ' + error.message);
    process.exitCode = 1;
  });
}
