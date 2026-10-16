import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequest } from '../functions/api/health.js';

const authTables = ['user', 'session', 'account', 'verification', 'rateLimit'];
const platformTables = ['profile', 'destination', 'trip', 'tripItem', 'providerProfile', 'listing', 'availability', 'bookingRequest', 'bookingEvent', 'notification', 'favorite'];
const secret = 'a'.repeat(48);

function envFor(tables, extras = {}) {
  return {
    BETTER_AUTH_SECRET: secret,
    DB: { prepare: () => ({ all: async () => ({ results: tables.map((name) => ({ name })) }) }) },
    ...extras,
  };
}

async function health(env) {
  const response = await onRequest({ env });
  return { response, body: await response.json() };
}

test('health does not claim an empty or unavailable D1 database is ready', async () => {
  const { response, body } = await health(envFor([]));
  assert.equal(response.status, 200);
  assert.deepEqual(body, { accountsEnabled: false, emailEnabled: false, googleEnabled: false, platformApiEnabled: false });
  const unavailable = await health({ BETTER_AUTH_SECRET: secret });
  assert.equal(unavailable.body.platformApiEnabled, false);
});

test('health enables the platform API only after both auth and platform schemas exist', async () => {
  const authOnly = await health(envFor(authTables));
  assert.equal(authOnly.body.platformApiEnabled, false);
  const ready = await health(envFor([...authTables, ...platformTables]));
  assert.equal(ready.body.platformApiEnabled, true);
  assert.equal(ready.body.accountsEnabled, false);
});

test('health requires an available auth method and never discloses configuration values', async () => {
  const mailReady = await health(envFor([...authTables, ...platformTables], {
    BREVO_API_KEY: 'private-value', BREVO_SENDER_EMAIL: 'verified@example.test', BREVO_SENDER_NAME: 'VoyageGo',
  }));
  assert.deepEqual(mailReady.body, { accountsEnabled: true, emailEnabled: true, googleEnabled: false, platformApiEnabled: true });
  assert.equal(JSON.stringify(mailReady.body).includes('private-value'), false);
});

test('health fails closed when the D1 readiness query throws', async () => {
  const { body } = await health({ BETTER_AUTH_SECRET: secret, DB: { prepare: () => ({ all: async () => { throw new Error('unavailable'); } }) } });
  assert.equal(body.accountsEnabled, false);
  assert.equal(body.platformApiEnabled, false);
});
