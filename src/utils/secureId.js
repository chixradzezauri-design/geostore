const PREFIX_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,15}$/;

/**
 * Creates a collision-resistant identifier using 128 bits from the browser's
 * cryptographically secure random generator. Fails closed when unavailable.
 */
export const createSecureId = (prefix, cryptoApi = globalThis.crypto) => {
  const safePrefix = String(prefix ?? '').trim();
  if (!PREFIX_PATTERN.test(safePrefix)) {
    throw new TypeError('A valid identifier prefix is required.');
  }
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('Cryptographically secure randomness is unavailable.');
  }

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  const token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${safePrefix}-${token}`;
};
