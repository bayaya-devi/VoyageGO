import { createAuth } from './auth.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
};
const ID = /^[a-zA-Z0-9_-]{1,96}$/u;

export class HttpError extends Error {
  constructor(status, code, details = undefined) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}

export function errorResponse(error) {
  if (error instanceof HttpError) return json({ error: error.code, details: error.details }, error.status);
  console.error('VoyageGo API error', error instanceof Error ? error.message : error);
  return json({ error: 'INTERNAL_ERROR' }, 500);
}

export function assertOrigin(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) throw new HttpError(403, 'INVALID_ORIGIN');
}

export async function readJson(request, maxBytes = 32_768) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON_REQUIRED');
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
  try { return text ? JSON.parse(text) : {}; } catch { throw new HttpError(400, 'INVALID_JSON'); }
}

export async function requireSession(env, request) {
  if (!env.DB || !env.BETTER_AUTH_SECRET) throw new HttpError(503, 'AUTH_NOT_CONFIGURED');
  const session = await createAuth(env, request).api.getSession({ headers: request.headers });
  if (!session?.user?.id) throw new HttpError(401, 'AUTH_REQUIRED');
  return session;
}

export async function consumeRateLimit(env, key, { max = 120, windowSeconds = 60 } = {}) {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const fullKey = `platform:${key}:${bucket}`;
  await env.DB.prepare(`INSERT INTO rateLimit (id, key, count, lastRequest) VALUES (?, ?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = count + 1, lastRequest = excluded.lastRequest`)
    .bind(crypto.randomUUID(), fullKey, Date.now()).run();
  const row = await env.DB.prepare('SELECT count FROM rateLimit WHERE key = ?').bind(fullKey).first();
  if ((row?.count || 0) > max) throw new HttpError(429, 'RATE_LIMITED');
}

export function assertId(value, name = 'id') {
  if (typeof value !== 'string' || !ID.test(value)) throw new HttpError(400, 'INVALID_IDENTIFIER', { field: name });
  return value;
}

export function stringField(value, name, { required = false, max = 500, min = 0 } = {}) {
  if (value == null && !required) return null;
  if (typeof value !== 'string') throw new HttpError(400, 'INVALID_FIELD', { field: name });
  const normalized = value.trim();
  if ((required && normalized.length < Math.max(1, min)) || normalized.length < min || normalized.length > max) {
    throw new HttpError(400, 'INVALID_FIELD', { field: name });
  }
  return normalized;
}

export function enumField(value, name, allowed, fallback = undefined) {
  const candidate = value ?? fallback;
  if (!allowed.includes(candidate)) throw new HttpError(400, 'INVALID_FIELD', { field: name });
  return candidate;
}

export function integerField(value, name, { min = 0, max = Number.MAX_SAFE_INTEGER, optional = false } = {}) {
  if (value == null && optional) return null;
  if (!Number.isInteger(value) || value < min || value > max) throw new HttpError(400, 'INVALID_FIELD', { field: name });
  return value;
}

export function isoDateTime(value, name) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new HttpError(400, 'INVALID_FIELD', { field: name });
  return new Date(value).toISOString();
}

export function parseJsonColumns(row, columns) {
  if (!row) return row;
  const output = { ...row };
  for (const column of columns) {
    try { output[column] = JSON.parse(output[column] || 'null'); } catch { output[column] = null; }
  }
  return output;
}

export function pageLimit(url) {
  const raw = Number(url.searchParams.get('limit') || 20);
  return Number.isInteger(raw) ? Math.min(100, Math.max(1, raw)) : 20;
}
