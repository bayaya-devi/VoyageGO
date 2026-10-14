import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { sendAuthEmail, sendAuthOtp } from './email.js';

const locales = new Set(['fr', 'en', 'ar', 'es', 'pt']);
const passwordPattern = /^.{15,128}$/u;

function requestLocale(ctx) {
  const requested = ctx?.body?.preferredLocale;
  if (locales.has(requested)) return requested;
  const preferred = ctx?.request?.headers?.get?.('accept-language')?.split(',')[0]?.split('-')[0]?.toLowerCase();
  return locales.has(preferred) ? preferred : 'fr';
}

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
      sendOnSignUp: false,
      sendOnSignIn: true,
      expiresIn: 3600,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => sendAuthEmail(env, {
        to: user.email, url, locale: user.preferredLocale, type: 'verify',
      }),
    },
    plugins: [emailOTP({
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      storeOTP: 'hashed',
      resendStrategy: 'rotate',
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true,
      rateLimit: { window: 60, max: 3 },
      sendVerificationOTP: async ({ email, otp, type }, ctx) => sendAuthOtp(env, {
        to: email, otp, type, locale: requestLocale(ctx),
      }),
    })],
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google'],
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
      },
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
        '/email-otp/send-verification-otp': { window: 600, max: 3 },
        '/email-otp/verify-email': { window: 600, max: 8 },
        '/email-otp/request-password-reset': { window: 3600, max: 3 },
        '/email-otp/reset-password': { window: 3600, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: secureCookies,
      defaultCookieAttributes: { httpOnly: true, secure: secureCookies, sameSite: 'lax', path: '/' },
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
    },
  });
}
