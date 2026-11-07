import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOrderTrackingMessage } from './orderTrackingMessage.js';

const orderCode = \`ORD-\${'A1B2C3D4'.repeat(4)}\`;

test('parses order code and international phone while masking the phone in chat text', () => {
  const result = parseOrderTrackingMessage(\`Track \${orderCode} +995 555 123 456\`);
  assert.equal(result.orderIntent, true);
  assert.equal(result.orderCode, orderCode);
  assert.equal(result.phone, '995555123456');
  assert.equal(result.phoneIsValid, true);
  assert.equal(result.safeUserText, \`Track \${orderCode} •••••••••\`);
  assert.equal(result.safeUserText.includes('555 123 456'), false);
});

test('supports the two-message flow by combining a pending order code with a phone message', () => {
  const result = parseOrderTrackingMessage('+995 555 123 456', orderCode);
  assert.equal(result.orderIntent, true);
  assert.equal(result.orderCode, orderCode);
  assert.equal(result.phone, '995555123456');
  assert.equal(result.safeUserText, '•••••••••');
});

test('does not mask ordinary numeric product or budget messages', () => {
  const result = parseOrderTrackingMessage('I need shoes under 150 GEL');
  assert.equal(result.orderIntent, false);
  assert.equal(result.safeUserText, 'I need shoes under 150 GEL');
});

test('marks phone numbers outside the 9–15 digit range as invalid', () => {
  const tooShort = parseOrderTrackingMessage('555 123 45', orderCode);
  const tooLong = parseOrderTrackingMessage('995 555 123 456 7890', orderCode);
  assert.equal(tooShort.hasPhoneCandidate, true);
  assert.equal(tooShort.phoneIsValid, false);
  assert.equal(tooLong.hasPhoneCandidate, true);
  assert.equal(tooLong.phoneIsValid, false);
});

test('recognizes an order-status request that still needs the order code', () => {
  const result = parseOrderTrackingMessage('Where is my order?');
  assert.equal(result.orderIntent, true);
  assert.equal(result.orderCode, '');
  assert.equal(result.hasPhoneCandidate, false);
});
