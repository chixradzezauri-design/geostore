import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecureId } from './secureId.js';

test('creates a prefixed 128-bit uppercase hexadecimal identifier', () => {
  const cryptoApi = {
    getRandomValues(bytes) {
      bytes.forEach((_, index) => { bytes[index] = index; });
      return bytes;
    }
  };

  assert.equal(
    createSecureId('prod', cryptoApi),
    'prod-000102030405060708090A0B0C0D0E0F'
  );
});

test('fails closed when secure randomness is unavailable', () => {
  assert.throws(
    () => createSecureId('prod', null),
    /Cryptographically secure randomness is unavailable/
  );
  assert.throws(
    () => createSecureId('prod', {}),
    /Cryptographically secure randomness is unavailable/
  );
});

test('rejects invalid identifier prefixes', () => {
  const cryptoApi = { getRandomValues: bytes => bytes };
  assert.throws(() => createSecureId('', cryptoApi), /valid identifier prefix/);
  assert.throws(() => createSecureId('bad prefix', cryptoApi), /valid identifier prefix/);
  assert.throws(() => createSecureId('x'.repeat(17), cryptoApi), /valid identifier prefix/);
});
