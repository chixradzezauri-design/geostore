import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { validateRegistrationPassword, checkPwnedPassword } from './passwordSafety.js';

test('rejects passwords shorter than 12 characters', () => {
  assert.deepEqual(validateRegistrationPassword('Aa1!short'), { valid: false, reason: 'length' });
});

test('requires mixed character types', () => {
  assert.deepEqual(validateRegistrationPassword('alllowercase123!'), { valid: false, reason: 'uppercase' });
  assert.deepEqual(validateRegistrationPassword('ALLUPPERCASE123!'), { valid: false, reason: 'lowercase' });
  assert.deepEqual(validateRegistrationPassword('MixedLettersOnly!'), { valid: false, reason: 'number' });
  assert.deepEqual(validateRegistrationPassword('MixedLetters1234'), { valid: false, reason: 'symbol' });
});

test('rejects obvious common or sequential passwords', () => {
  assert.deepEqual(validateRegistrationPassword('Password12345!'), { valid: false, reason: 'common' });
  assert.deepEqual(validateRegistrationPassword('123456abcdef!'), { valid: false, reason: 'common' });
});

test('accepts a long mixed password', () => {
  assert.deepEqual(validateRegistrationPassword('M0dern!Fashion#27'), { valid: true });
});

test('checks HIBP using only the five-character hash prefix', async () => {
  let requestedUrl = '';
  let requestOptions;
  const fetchImpl = async (url, options) => {
    requestedUrl = url;
    requestOptions = options;
    return {
      ok: true,
      text: async () => '1E4C9B93F3F0682250B6CF8331B7EE68FD8:42\r\n'
    };
  };
  const result = await checkPwnedPassword('password', { cryptoApi: webcrypto, fetchImpl });
  assert.deepEqual(result, { valid: false, reason: 'pwned' });
  assert.equal(requestedUrl, 'https://api.pwnedpasswords.com/range/5BAA6');
  assert.equal(requestOptions.headers['Add-Padding'], 'true');
  assert.equal(requestedUrl.includes('password'), false);
});

test('fails closed if the breached-password service is unavailable', async () => {
  const result = await checkPwnedPassword('M0dern!Fashion#27', {
    cryptoApi: webcrypto,
    fetchImpl: async () => ({ ok: false })
  });
  assert.deepEqual(result, { valid: false, reason: 'unavailable' });
});
