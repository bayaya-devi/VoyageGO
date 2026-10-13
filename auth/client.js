import { isValidPassword, normalizeEmail } from './validation.js';

let clientPromise;
let googleEnabled = false;

function mapUser(user) {
  if (!user) return null;
  return {
    ...user,
    first_name: user.firstName || '',
    last_name: user.lastName || '',
    preferred_locale: user.preferredLocale || 'fr',
    email_confirmed_at: user.emailVerified ? user.updatedAt || user.createdAt : null,
  };
}

function mapSession(value) {
  if (!value?.user) return null;
  return { ...value, user: mapUser(value.user) };
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const response = await fetch(new URL('api/health', document.baseURI), { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return null;
      const health = await response.json();
      googleEnabled = Boolean(health.googleEnabled);
      if (!health.accountsEnabled) return null;
      const { createAuthClient } = await import('../vendor/voyagego-auth-client.js');
      return createAuthClient({ baseURL: location.origin, fetchOptions: { credentials: 'same-origin' } });
    })().catch(() => null);
  }
  return clientPromise;
}

export async function getAuthClient() { return getClient(); }
export async function isGoogleAuthEnabled() { await getClient(); return googleEnabled; }

export async function readSession() {
  const client = await getClient();
  if (!client) return { configured: false, session: null, error: null };
  const result = await client.getSession();
  return { configured: true, session: mapSession(result.data), error: result.error };
}

export async function signUp({ firstName, lastName, email, password, locale, redirectTo }) {
  if (!isValidPassword(password)) throw new Error('INVALID_PASSWORD');
  const client = await getClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  const name = `${firstName.trim()} ${lastName.trim()}`.trim();
  const result = await client.signUp.email({
    name, firstName: firstName.trim(), lastName: lastName.trim(), preferredLocale: locale,
    email: normalizeEmail(email), password, callbackURL: redirectTo,
  });
  return { data: { user: mapUser(result.data?.user), session: result.data?.token ? mapSession(result.data) : null }, error: result.error };
}

export async function signIn({ email, password }) {
  const client = await getClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  const result = await client.signIn.email({ email: normalizeEmail(email), password });
  const session = result.data?.user ? { user: mapUser(result.data.user), session: result.data.session } : null;
  return { data: session ? { session } : null, error: result.error };
}

export async function signInWithGoogle(redirectTo) {
  const client = await getClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  if (!googleEnabled) throw new Error('GOOGLE_UNAVAILABLE');
  return client.signIn.social({ provider: 'google', callbackURL: redirectTo });
}

export async function requestPasswordReset(email, redirectTo) {
  const client = await getClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  return client.forgetPassword({ email: normalizeEmail(email), redirectTo });
}

export async function updatePassword(password) {
  if (!isValidPassword(password)) throw new Error('INVALID_PASSWORD');
  const token = new URL(location.href).searchParams.get('token');
  if (!token) throw new Error('RECOVERY_SESSION_REQUIRED');
  const client = await getClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  return client.resetPassword({ newPassword: password, token });
}

export async function readProfile(userId) {
  const state = await readSession();
  if (!state.session?.user || state.session.user.id !== userId) {
    return { data: null, error: new Error('PROFILE_UNAVAILABLE') };
  }
  const user = state.session.user;
  return { data: { first_name: user.first_name, last_name: user.last_name, preferred_locale: user.preferred_locale, created_at: user.createdAt, updated_at: user.updatedAt }, error: null };
}

export async function updateProfile(_userId, { firstName, lastName, locale }) {
  const client = await getClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  return client.updateUser({ firstName: firstName.trim(), lastName: lastName.trim(), preferredLocale: locale });
}

export async function signOut() {
  const client = await getClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  return client.signOut();
}

export async function subscribeToAuthChanges(callback) {
  const client = await getClient();
  if (!client) return () => {};
  return client.useSession.subscribe((state) => callback(state.data ? 'SIGNED_IN' : 'SIGNED_OUT', mapSession(state.data)));
}

export { isValidEmail, isValidPassword, normalizeEmail } from './validation.js';
