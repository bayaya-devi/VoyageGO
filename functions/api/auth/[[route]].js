import { createAuth } from '../../_shared/auth.js';

export async function onRequest(context) {
  const { env, request } = context;
  if (!env.DB || !env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    return Response.json({ error: 'AUTH_NOT_CONFIGURED' }, { status: 503, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
  }
  const pathname = new URL(request.url).pathname;
  const emailRequiredRoutes = new Set([
    '/api/auth/sign-up/email', '/api/auth/sign-in/email', '/api/auth/forget-password',
    '/api/auth/reset-password', '/api/auth/send-verification-email',
    '/api/auth/email-otp/send-verification-otp', '/api/auth/email-otp/verify-email',
    '/api/auth/email-otp/request-password-reset', '/api/auth/email-otp/reset-password',
  ]);
  const emailReady = Boolean(env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL && env.BREVO_SENDER_NAME);
  if (!emailReady && request.method !== 'GET' && emailRequiredRoutes.has(pathname)) {
    return Response.json({ error: 'AUTH_NOT_CONFIGURED' }, { status: 503, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
  }
  return createAuth(env, request).handler(request);
}
