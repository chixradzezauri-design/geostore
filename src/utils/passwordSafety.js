const COMMON_WEAK_PASSWORDS = new Set([
  'password123!', 'password1234!', 'password12345!', 'qwerty123456!', 'qwertyuiop12!',
  'welcome12345!', 'admin123456!', 'letmein12345!', 'iloveyou1234!',
  'geostore12345!', '123456789012!'
]);

export const validateRegistrationPassword = (password) => {
  const value = String(password ?? '');
  if (value.length < 12) return { valid: false, reason: 'length' };

  const normalized = value.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(normalized) ||
      /^(.)\1{11,}$/.test(normalized) ||
      /^(?:123456|abcdef|qwerty)/i.test(normalized)) {
    return { valid: false, reason: 'common' };
  }
  if (!/[a-z]/.test(value)) return { valid: false, reason: 'lowercase' };
  if (!/[A-Z]/.test(value)) return { valid: false, reason: 'uppercase' };
  if (!/[0-9]/.test(value)) return { valid: false, reason: 'number' };
  if (!/[^A-Za-z0-9]/.test(value)) return { valid: false, reason: 'symbol' };
  return { valid: true };
};

// HIBP Pwned Passwords uses k-anonymity: only the first five characters
// of the locally calculated SHA-1 hash leave the browser. The password and
// its complete hash are never sent to the service.
export const checkPwnedPassword = async (
  password,
  { cryptoApi = globalThis.crypto, fetchImpl = globalThis.fetch } = {}
) => {
  if (!cryptoApi?.subtle?.digest || typeof fetchImpl !== 'function') {
    return { valid: false, reason: 'unavailable' };
  }

  try {
    const bytes = new TextEncoder().encode(String(password ?? ''));
    const digest = await cryptoApi.subtle.digest('SHA-1', bytes);
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('').toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const response = await fetchImpl(
      'https://api.pwnedpasswords.com/range/' + prefix,
      {
        method: 'GET',
        headers: { 'Add-Padding': 'true' },
        cache: 'no-store',
        credentials: 'omit'
      }
    );
    if (!response?.ok) return { valid: false, reason: 'unavailable' };

    const matches = await response.text();
    const found = matches.split(/\r?\n/).some((line) => {
      const [candidate, countText] = line.trim().split(':');
      return candidate?.toUpperCase() === suffix && Number(countText) > 0;
    });

    return found
      ? { valid: false, reason: 'pwned' }
      : { valid: true };
  } catch {
    return { valid: false, reason: 'unavailable' };
  }
};
