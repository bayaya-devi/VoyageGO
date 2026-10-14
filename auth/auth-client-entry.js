import { createAuthClient as createClient } from 'better-auth/client';
import { emailOTPClient } from 'better-auth/client/plugins';

export function createAuthClient(options) {
  return createClient({ ...options, plugins: [emailOTPClient()] });
}
