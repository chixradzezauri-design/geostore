import test from 'node:test';
import assert from 'node:assert/strict';
import { getCheckoutErrorMessage } from './checkoutMessages.js';

test('translates database checkout errors to English and Russian', () => {
  const error = { message: JSON.stringify({ message: 'ტელეფონის ნომერი უნდა შეიცავდეს 9–15 ციფრს.' }) };
  assert.equal(getCheckoutErrorMessage(error, 'en'), 'Enter a phone number containing 9–15 digits.');
  assert.equal(getCheckoutErrorMessage(error, 'ru'), 'Введите номер телефона из 9–15 цифр.');
});

test('extracts PostgREST JSON error messages', () => {
  const error = { message: JSON.stringify({ code: 'P0001', message: 'კუპონი არასწორია ან აღარ არის აქტიური.' }) };
  assert.equal(getCheckoutErrorMessage(error, 'en'), 'The coupon is invalid or no longer active. Remove it and try again.');
});

test('keeps Georgian server error text', () => {
  const error = { message: 'მისამართი არასწორია.' };
  assert.equal(getCheckoutErrorMessage(error, 'ka'), error.message);
});

test('uses a safe localized fallback for unknown server errors', () => {
  assert.equal(getCheckoutErrorMessage({ message: 'unknown backend error' }, 'en'), 'The order could not be submitted. Please review your details and try again.');
  assert.equal(getCheckoutErrorMessage({ message: 'unknown backend error' }, 'ru'), 'Не удалось оформить заказ. Проверьте данные и повторите попытку.');
});
