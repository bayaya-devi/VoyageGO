export const VOYAGEGO_PASSWORD_PATTERN = /^.{15,128}$/u;

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(value) {
  return VOYAGEGO_PASSWORD_PATTERN.test(String(value ?? ''));
}

export function safeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const target = new URL(value, location.origin);
    const appBase = new URL(document.baseURI).pathname;
    if (target.origin !== location.origin || !target.pathname.startsWith(appBase)) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}
