import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistrationPassword } from './passwordSafety.js';

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
