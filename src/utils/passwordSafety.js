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
