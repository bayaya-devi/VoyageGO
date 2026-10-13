import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { sendAuthEmail } from './email.js';

const locales = new Set(['fr', 'en', 'ar', 'es', 'pt']);
const passwordPattern = /^.{15,128}$/u;

function validateProfile(data) {
  for (const field of ['firstName', 'lastName']) {
    if (field in data && (typeof data[field] !== 'string' || data[field].trim().length > 80)) {
      throw new APIError('BAD_REQUEST', { message: 'INVALID_PROFILE' });
    }
  }
  if ('preferredLocale' in data && !locales.has(data.preferredLocale)) {
    throw new APIError('BAD_REQUEST', { message: 'INVALID_LOCALE' });
  }
  if ('password' in data && !passwordPattern.test(data.password)) {
    throw new APIError('BAD_REQUEST', { message: 'INVALID_PASSWORD' });
  }
}

export function createAuth(env, request) {
  const baseURL = env.BETTER_AUTH_URL || env.PUBLIC_SITE_URL || new URL(request.url).origin;
  const secureCookies = new URL(baseURL).protocol === 'https:';
  const socialProviders = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({ firstName: profile.given_name || '', lastName: profile.family_name || '' }),
    },
  } : undefined;

  return betterAuth({
    appName: 'VoyageGo',
    baseURL,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins: [new URL(baseURL).origin],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 15,
      maxPasswordLength: 128,
      sendResetPassword: async ({ user, url }) => sendAuthEmail(env, {
        to: user.email, url, locale: user.preferredLocale, type: 'reset',
      }),
      onExistingUserSignUp: async () => {},
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      expiresIn: 3600,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => sendAuthEmail(env, {
        to: user.email, url, locale: user.preferredLocale, type: 'verify',
      }),
    },
    user: {
      additionalFields: {
        firstName: { type: 'string', required: false, defaultValue: '', input: true },
        lastName: { type: 'string', required: false, defaultValue: '', input: true },
        preferredLocale: { type: 'string', required: false, defaultValue: 'fr', input: true },
      },
    },
    databaseHooks: {
      user: {
        create: { before: async (data) => { validateProfile(data); return { data }; } },
        update: { before: async (data) => { validateProfile(data); return { data }; } },
      },
    },
    socialProviders,
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 20,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 3600, max: 5 },
        '/forget-password': { window: 3600, max: 3 },
        '/reset-password': { window: 3600, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: secureCookies,
      defaultCookieAttributes: { httpOnly: true, secure: secureCookies, sameSite: 'lax', path: '/' },
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
    },
  });
}
