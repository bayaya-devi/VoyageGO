import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const locales = [
  { code: 'fr', title: 'Votre prochaine découverte commence ici.', direction: 'ltr', cookieTitle: 'Cookies et préférences', soon: 'Bientôt disponible' },
  { code: 'en', title: 'Your next discovery starts here.', direction: 'ltr', cookieTitle: 'Cookies and preferences', soon: 'Coming soon' },
  { code: 'ar', title: 'اكتشافك القادم يبدأ من هنا.', direction: 'rtl', cookieTitle: 'ملفات الارتباط والتفضيلات', soon: 'قريبًا' },
  { code: 'es', title: 'Tu próximo descubrimiento empieza aquí.', direction: 'ltr', cookieTitle: 'Cookies y preferencias', soon: 'Próximamente' },
  { code: 'pt', title: 'A sua próxima descoberta começa aqui.', direction: 'ltr', cookieTitle: 'Cookies e preferências', soon: 'Em breve' },
];

const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 960 } },
  { name: 'mobile', viewport: { width: 375, height: 812 } },
];

for (const locale of locales) {
  for (const device of viewports) {
    test(`${device.name} ${locale.code}: immersive globe, worldwide selection and legal route`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: device.viewport });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.goto(`${locale.code}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', locale.code);
      await expect(page.locator('html')).toHaveAttribute('dir', locale.direction);
      await expect(page.getByRole('heading', { level: 1, name: locale.title })).toBeVisible();
      await expect(page.locator('header')).toHaveCount(0);
      await expect(page.locator('.scene-brand')).toBeVisible();
      await expect(page.locator('#country-picker')).toBeVisible();
      await expect.poll(() => page.locator('#country-picker option').count()).toBeGreaterThan(150);
      await page.evaluate(() => window.scrollTo(0, document.querySelector('#journey-track').offsetTop + (document.querySelector('#journey-track').offsetHeight - innerHeight) * .82));
      await expect(page.locator('#journey-stage')).toHaveAttribute('data-progress', /^0\.8/);
      await expect(page.locator('#map-section')).not.toHaveAttribute('inert', '');

      await page.locator('#country-picker').selectOption('FRA');
      await expect(page.locator('#country-popup')).toBeVisible();
      await expect(page.locator('#country-popup')).toContainText(locale.soon);
      await expect(page.locator('#country-popup .country-action')).toBeDisabled();

      await page.locator('#country-picker').selectOption('MAR');
      await expect(page.locator('#country-popup .country-action')).toHaveAttribute('href', 'https://bayaya-devi.github.io/MarocoGO/');
      await expect(page.locator('#country-popup')).toContainText(locale.code === 'ar' ? 'المغرب' : locale.code === 'fr' ? 'Maroc' : locale.code === 'es' ? 'Marruecos' : locale.code === 'pt' ? 'Marrocos' : 'Morocco');

      const dimensions = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);

      await page.locator('[data-legal="cookies"]').click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(locale.cookieTitle);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
      await expect(page.locator('#reset-language')).toBeVisible();
      expect(pageErrors).toEqual([]);
      await context.close();
    });
  }
}

test('manual language preference overrides browser locale and survives routing', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' });
  await context.addInitScript(() => {
    if (location.pathname.endsWith('/VoyageGO/')) localStorage.setItem('voyagego-language', 'fr');
  });
  const page = await context.newPage();
  await page.goto('./');
  await expect(page).toHaveURL(/\/VoyageGO\/fr\/$/);
  await page.locator('#language-trigger').click();
  await page.getByRole('button', { name: 'Español' }).click();
  await expect(page).toHaveURL(/\/VoyageGO\/es\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('voyagego-language'))).toBe('es');
  await context.close();
});

test('browser language is detected for all supported languages and unsupported languages fall back to French', async ({ browser }) => {
  for (const [browserLocale, route] of [['fr-FR', 'fr'], ['ar-MA', 'ar'], ['en-US', 'en'], ['es-ES', 'es'], ['pt-BR', 'pt'], ['de-DE', 'fr']]) {
    const context = await browser.newContext({ locale: browserLocale });
    const page = await context.newPage();
    await page.goto('./');
    await expect(page).toHaveURL(new RegExp(`/VoyageGO/${route}/$`));
    await context.close();
  }
});

test('language menu supports keyboard dismissal and exposes all five locales', async ({ page }) => {
  await page.goto('fr/');
  const trigger = page.getByRole('button', { name: 'Choisir une langue' });
  await trigger.click();
  await expect(page.getByRole('button', { name: 'Español' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#language-menu')).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('system color scheme changes the interface without reloading', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('fr/');
  const light = await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor);
  await page.emulateMedia({ colorScheme: 'dark' });
  const dark = await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor);
  expect(dark).not.toBe(light);
});

test('desktop, tablet and narrow mobile layouts stay within the viewport in LTR and RTL', async ({ browser }) => {
  for (const locale of ['fr', 'ar']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${locale}/`);
    for (const width of [320, 375, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const dimensions = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(dimensions.body, `${locale} at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
    }
    await context.close();
  }
});

test('@a11y all five localized pages pass axe WCAG 2.2 AA checks', async ({ page }) => {
  for (const locale of locales) {
    await page.goto(`${locale.code}/`);
    await expect.poll(() => page.locator('#country-picker option').count()).toBeGreaterThan(150);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map(({ id, impact, help }) => ({ id, impact, help }))).toEqual([]);
  }
});

test('account signup is localized, keyboard-labelled, and honestly unavailable before backend setup', async ({ browser }) => {
  for (const locale of locales) {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${locale.code}/?page=account&view=signup`);
      await expect(page.locator('html')).toHaveAttribute('lang', locale.code);
      await expect(page.locator('html')).toHaveAttribute('dir', locale.direction);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('#account-form [type="submit"]')).toBeDisabled();
      await expect(page.locator('.account-unavailable')).toBeVisible();
      await expect(page.locator('.account-footer .footer-nav a')).toHaveCount(6);
      const dimensions = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
      expect(errors).toEqual([]);
      await context.close();
    }
  }
});

test('@a11y account signup passes axe WCAG 2.2 AA in all supported languages', async ({ page }) => {
  for (const locale of locales) {
    await page.goto(`${locale.code}/?page=account&view=signup`);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map(({ id, impact, help }) => ({ id, impact, help }))).toEqual([]);
  }
});

test('signup rejects weak credentials locally and sends normalized data to the configured auth endpoint', async ({ page }) => {
  await page.route('**/auth/runtime-config.js', (route) => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: "export const authConfig = Object.freeze({supabaseUrl:'https://voyagego-test.supabase.co',supabasePublishableKey:'sb_publishable_test'});",
  }));
  let signupRequest;
  await page.route('https://voyagego-test.supabase.co/auth/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/settings')) {
      await route.fulfill({ json: { external: { email: true, google: true }, disable_signup: false, mailer_autoconfirm: false } });
      return;
    }
    if (url.pathname.endsWith('/signup')) {
      signupRequest = route.request().postDataJSON();
      await route.fulfill({ json: { user: { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: signupRequest.email, app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: signupRequest.data, identities: [], created_at: new Date().toISOString() }, session: null } });
      return;
    }
    await route.fulfill({ status: 400, json: { message: 'Unexpected test request' } });
  });
  await page.goto('fr/?page=account&view=signup');
  await page.locator('#first-name').fill('Ada');
  await page.locator('#last-name').fill('Voyage');
  await page.locator('#email').fill(' NOT-AN-EMAIL ');
  await page.locator('#password').fill('weak');
  await page.locator('#confirm-password').fill('weak');
  await page.locator('#account-form [type="submit"]').click();
  await expect(page.locator('#account-message')).toContainText('adresse e-mail valide');
  expect(signupRequest).toBeUndefined();

  await page.locator('#email').fill(' Ada@Example.com ');
  await page.locator('#password').fill('Voyage7');
  await page.locator('#confirm-password').fill('Voyage7');
  await page.locator('#account-form [type="submit"]').click();
  await expect(page.locator('#account-message')).toContainText('Si votre inscription peut être finalisée');
  expect(signupRequest.email).toBe('ada@example.com');
  expect(signupRequest.data).toMatchObject({ first_name: 'Ada', last_name: 'Voyage', preferred_locale: 'fr' });
});
