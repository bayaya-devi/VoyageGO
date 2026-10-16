const AUTH_TABLES = ['user', 'session', 'account', 'verification', 'rateLimit'];
const PLATFORM_TABLES = ['profile', 'destination', 'trip', 'tripItem', 'providerProfile', 'listing', 'availability', 'bookingRequest', 'bookingEvent', 'notification', 'favorite'];

async function hasTables(db, required) {
  if (!db) return false;
  try {
    const result = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
    const available = new Set((result.results || []).map((row) => row.name));
    return required.every((name) => available.has(name));
  } catch {
    return false;
  }
}

export async function onRequest({ env }) {
  const secretConfigured = Boolean(env.BETTER_AUTH_SECRET && env.BETTER_AUTH_SECRET.length >= 32);
  const authSchemaReady = secretConfigured && await hasTables(env.DB, AUTH_TABLES);
  const platformSchemaReady = authSchemaReady && await hasTables(env.DB, PLATFORM_TABLES);
  const mailConfigured = Boolean(env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL && env.BREVO_SENDER_NAME);
  const googleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const emailEnabled = authSchemaReady && mailConfigured;
  const googleEnabled = authSchemaReady && googleConfigured;
  return Response.json({
    accountsEnabled: authSchemaReady && (mailConfigured || googleConfigured),
    emailEnabled,
    googleEnabled,
    platformApiEnabled: platformSchemaReady,
  }, { headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' } });
}
