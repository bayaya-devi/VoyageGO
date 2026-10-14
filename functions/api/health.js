export async function onRequest({ env }) {
  const configured = Boolean(env.DB && env.BETTER_AUTH_SECRET && env.BETTER_AUTH_SECRET.length >= 32);
  const mailConfigured = Boolean(env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL && env.BREVO_SENDER_NAME);
  const googleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  return Response.json({
    accountsEnabled: configured && (mailConfigured || googleConfigured),
    emailEnabled: configured && mailConfigured,
    googleEnabled: configured && googleConfigured,
    platformApiEnabled: configured,
  }, { headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' } });
}
