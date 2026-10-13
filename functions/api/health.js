export async function onRequest({ env }) {
  const configured = Boolean(env.DB && env.BETTER_AUTH_SECRET && env.BETTER_AUTH_SECRET.length >= 32);
  const mailConfigured = Boolean(env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL && env.BREVO_SENDER_NAME);
  return Response.json({
    accountsEnabled: configured && mailConfigured,
    googleEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  }, { headers: { 'cache-control': 'no-store' } });
}
