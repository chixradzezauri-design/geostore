import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  evaluatePrivateSchemaProbe,
  probePrivateSchemaExposure
} from '../scripts/checkApiSchemaExposure.mjs';

const workflow = readFileSync(new URL('../.github/workflows/stage53-api-schema-gate.yml', import.meta.url), 'utf8');
const script = readFileSync(new URL('../scripts/checkApiSchemaExposure.mjs', import.meta.url), 'utf8');

test('Stage53: only healthy public API and explicit PGRST106 deny private exposure', () => {
  assert.deepEqual(
    evaluatePrivateSchemaProbe({ publicStatus: 200, privateStatus: 406, privateCode: 'PGRST106' }),
    { safe: true, reason: 'PostgREST explicitly denies private schema exposure.' }
  );
  for (const attempt of [
    { publicStatus: 503, privateStatus: 406, privateCode: 'PGRST106' },
    { publicStatus: 401, privateStatus: 406, privateCode: 'PGRST106' },
    { publicStatus: 200, privateStatus: 200, privateCode: null },
    { publicStatus: 200, privateStatus: 404, privateCode: 'PGRST205' },
    { publicStatus: 200, privateStatus: 406, privateCode: 'OTHER' },
    { publicStatus: 200, privateStatus: 500, privateCode: null }
  ]) {
    assert.equal(evaluatePrivateSchemaProbe(attempt).safe, false, JSON.stringify(attempt));
  }
});

test('Stage53: read-only browser-key probe uses no RPC or real rows', async () => {
  const requests = [];
  const stub = async (url, options) => {
    requests.push({ url: url.toString(), method: options.method,
      profile: options.headers['Accept-Profile'], key: options.headers.apikey });
    if (options.headers['Accept-Profile'] === 'public') return { status: 200 };
    return { status: 406, json: async () => ({ code: 'PGRST106' }) };
  };
  const decision = await probePrivateSchemaExposure({
    request: stub, origin: 'https://fixture.supabase.co', anonymousKey: 'public-fixture-key'
  });
  assert.equal(decision.safe, true);
  assert.deepEqual(requests.map(x => x.profile), ['public', 'private']);
  assert.ok(requests.every(x => x.method === 'GET' && x.url.includes('limit=0')));
  assert.ok(requests.every(x => x.url.includes('/rest/v1/products')));
  assert.ok(requests.every(x => x.key === 'public-fixture-key'));
});

test('Stage53: private profile exposure or failed public baseline blocks release', async () => {
  const exposed = await probePrivateSchemaExposure({
    request: async (_url, options) => options.headers['Accept-Profile'] === 'public'
      ? { status: 200 } : { status: 404, json: async () => ({ code: 'PGRST205' }) },
    origin: 'https://fixture.supabase.co', anonymousKey: 'public-fixture-key'
  });
  assert.equal(exposed.safe, false);
  const broken = await probePrivateSchemaExposure({
    request: async () => ({ status: 503 }),
    origin: 'https://fixture.supabase.co', anonymousKey: 'public-fixture-key'
  });
  assert.equal(broken.safe, false);
});

test('Stage53: safety gate runs on SQL changes and cannot write to Production', () => {
  assert.match(workflow, /Stage53 Data API private schema release gate/);
  assert.match(workflow, /supabase\/migrations\/\*\*/);
  assert.match(workflow, /node scripts\/checkApiSchemaExposure\.mjs/);
  assert.match(script, /method: 'GET'/);
  assert.match(script, /'Accept-Profile': 'private'/);
  assert.match(script, /limit=0/);
  assert.doesNotMatch(script, /method: 'POST'|method: 'PATCH'|method: 'DELETE'|CREATE TABLE|apply_migration/);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE|DATABASE_URL|SUPABASE_ACCESS_TOKEN/);
});
