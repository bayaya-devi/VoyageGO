const base = new URL('api/v1/', document.baseURI);

export class PlatformApiError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

export async function platformRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(new URL(path.replace(/^\//u, ''), base), { ...options, headers, credentials: 'same-origin', cache: 'no-store' });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new PlatformApiError(response.status, payload.error || 'REQUEST_FAILED');
  return payload.data;
}

export async function readHealth() {
  try {
    const response = await fetch(new URL('api/health', document.baseURI), { credentials: 'same-origin', cache: 'no-store' });
    return response.ok ? response.json() : { accountsEnabled: false, emailEnabled: false, googleEnabled: false, platformApiEnabled: false };
  } catch { return { accountsEnabled: false, emailEnabled: false, googleEnabled: false, platformApiEnabled: false }; }
}
