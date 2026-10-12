import { isValidPassword, normalizeEmail } from './validation.js';

let clientPromise;

export async function getAuthClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const [{ authConfig }, { createClient }] = await Promise.all([
        import('./runtime-config.js'),
        import('../vendor/supabase-auth.js'),
      ]);
      if (!authConfig.supabaseUrl || !authConfig.supabasePublishableKey) return null;
      const configuredUrl = new URL(authConfig.supabaseUrl);
      if (configuredUrl.protocol !== 'https:' && !['localhost', '127.0.0.1', '::1'].includes(configuredUrl.hostname)) return null;
      if (/service[_-]?role/i.test(authConfig.supabasePublishableKey)) return null;
      return createClient(configuredUrl.origin, authConfig.supabasePublishableKey, {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'voyagego.auth.v1',
        },
      });
    })().catch(() => null);
  }
  return clientPromise;
}

export async function readSession() {
  const client = await getAuthClient();
  if (!client) return { configured: false, session: null, error: null };
  const { data, error } = await client.auth.getSession();
  return { configured: true, session: data?.session ?? null, error };
}

export async function signUp({ firstName, lastName, email, password, locale, redirectTo }) {
  if (!isValidPassword(password)) throw new Error('INVALID_PASSWORD');
  const client = await getAuthClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  return client.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: { emailRedirectTo: redirectTo, data: { first_name: firstName.trim(), last_name: lastName.trim(), preferred_locale: locale } },
  });
}

export async function signIn({ email, password }) {
  const client = await getAuthClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  return client.auth.signInWithPassword({ email: normalizeEmail(email), password });
}

export async function signInWithGoogle(redirectTo) {
  const client = await getAuthClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  return client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams: { prompt: 'select_account' } } });
}

export async function requestPasswordReset(email, redirectTo) {
  const client = await getAuthClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  return client.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo });
}

export async function updatePassword(password) {
  if (!isValidPassword(password)) throw new Error('INVALID_PASSWORD');
  const client = await getAuthClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionData.session) throw new Error('RECOVERY_SESSION_REQUIRED');
  return client.auth.updateUser({ password });
}

export async function readProfile(userId) {
  const client = await getAuthClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  return client.from('profiles').select('first_name,last_name,preferred_locale,created_at,updated_at').eq('id', userId).single();
}

export async function updateProfile(userId, { firstName, lastName, locale }) {
  const client = await getAuthClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  return client.from('profiles').update({ first_name: firstName.trim(), last_name: lastName.trim(), preferred_locale: locale }).eq('id', userId).select('first_name,last_name,preferred_locale,created_at,updated_at').single();
}

export async function signOut() {
  const client = await getAuthClient();
  if (!client) throw new Error('AUTH_UNAVAILABLE');
  return client.auth.signOut({ scope: 'global' });
}

export async function subscribeToAuthChanges(callback) {
  const client = await getAuthClient();
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

export { isValidEmail, isValidPassword, normalizeEmail } from './validation.js';
