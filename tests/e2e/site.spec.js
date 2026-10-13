import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isValidPassword } from '../../auth/validation.js';

const locales = [
  { code: 'fr', tagline: 'LE MONDE VOUS ATTEND', direction: 'ltr', cookieTitle: 'Cookies et préférences', soon: 'Bientôt disponible' },
  { code: 'en', tagline: 'THE WORLD IS WAITING', direction: 'ltr', cookieTitle: 'Cookies and preferences', soon: 'Coming soon' },
  { code: 'ar', tagline: 'العالم في انتظارك', direction: 'rtl', cookieTitle: 'ملفات الارتباط والتفضيلات', soon: 'قريبًا' },
  { code: 'es', tagline: 'EL MUNDO TE ESPERA', direction: 'ltr', cookieTitle: 'Cookies y preferencias', soon: 'Próximamente' },
  { code: 'pt', tagline: 'O MUNDO ESPERA POR SI', direction: 'ltr', cookieTitle: 'Cookies e preferências', soon: 'Em breve' },
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
      await expect(page.getByRole('heading', { level: 1, name: locale.tagline })).toBeVisible();
      await expect(page.locator('header')).toHaveCount(0);
      await expect(page.locator('#site-footer')).toHaveCount(0);
      await expect(page.locator('.scene-brand')).toBeVisible();
      await expect(page.locator('#country-picker')).toBeVisible();
      const brandAndTagline = await page.evaluate(() => {
        const logo = document.querySelector('.scene-brand').getBoundingClientRect();
        const tagline = document.querySelector('#hero-title').getBoundingClientRect();
        return { logoBottom: logo.bottom, taglineTop: tagline.top };
      });
      expect(brandAndTagline.taglineTop).toBeGreaterThan(brandAndTagline.logoBottom);
      await expect.poll(() => page.locator('#country-picker option').count(), { timeout: 20_000 }).toBeGreaterThan(150);
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

      await page.evaluate(() => window.scrollTo(0, document.querySelector('#journey-track').offsetTop + (document.querySelector('#journey-track').offsetHeight - innerHeight) * .45));
      await expect(page.locator('#journey-stage')).toHaveAttribute('data-progress', /^0\.4/);
      const storyGeometry = await page.evaluate(() => {
        const globe = document.querySelector('#globe-interaction').getBoundingClientRect();
        const labels = [...document.querySelectorAll('#scene-steps li')].map((element) => {
          const rect = element.getBoundingClientRect();
          return rect.right > globe.left && rect.left < globe.right && rect.bottom > globe.top && rect.top < globe.bottom;
        });
        return labels;
      });
      expect(storyGeometry).toEqual([false, false, false]);

      const dimensions = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);

      await page.goto(`${locale.code}/?page=legal&doc=cookies`);
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
  test.setTimeout(120_000);
  for (const locale of locales) {
    await page.goto(`${locale.code}/`);
    await expect.poll(() => page.locator('#country-picker option').count(), { timeout: 20_000 }).toBeGreaterThan(150);
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
      await expect(page.locator('.account-unavailable')).not.toContainText(/VoyageGo accounts are not enabled|Les comptes VoyageGo ne sont pas encore activés|حسابات VoyageGo غير مفعّلة|Las cuentas de VoyageGo aún no están activadas|As contas VoyageGo ainda não estão ativadas/i);
      await expect(page.locator('.account-backdrop img')).toBeVisible();
      await expect.poll(() => page.locator('.account-backdrop img').evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
      await expect(page.locator('.account-photo-caption a')).toBeVisible();
      await expect(page.locator('.account-header-links a')).toHaveCount(2);
      const headerButtons = await page.locator('.account-header-links a').evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
      expect(headerButtons[0]).toBe(headerButtons[1]);
      await page.locator('#language-trigger').click();
      const menuGeometry = await page.locator('#language-menu').evaluate((menu) => {
        const rect = menu.getBoundingClientRect();
        const header = document.querySelector('.secondary-header').getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, headerBottom: header.bottom, viewport: innerHeight };
      });
      expect(menuGeometry.top).toBeGreaterThanOrEqual(menuGeometry.headerBottom);
      expect(menuGeometry.bottom).toBeLessThanOrEqual(menuGeometry.viewport);
      await page.locator('#language-trigger').click();
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

test('account landscape stays stable for one form and changes for the next form', async ({ page }) => {
  await page.goto('fr/?page=account&view=login');
  const loginPhoto = await page.locator('.account-backdrop img').getAttribute('src');
  await page.locator('.account-header-links a').filter({ hasText: 'Inscription' }).click();
  await expect(page).toHaveURL(/view=signup/);
  const signupPhoto = await page.locator('.account-backdrop img').getAttribute('src');
  expect(signupPhoto).not.toBe(loginPhoto);
  await page.reload();
  await expect(page.locator('.account-backdrop img')).toHaveAttribute('src', signupPhoto);
});

test('account landscape failure shows the designed fallback without a mismatched location caption', async ({ page }) => {
  await page.route('**/assets/account-landscapes/**', (route) => route.abort());
  await page.goto('fr/?page=account&view=login');
  await expect(page.locator('.account-backdrop')).toHaveClass(/is-fallback/);
  await expect(page.locator('.account-photo-caption')).toBeHidden();
});

test('password rules enforce a long passphrase without arbitrary character classes', async ({ page }) => {
  expect(isValidPassword('Voyage7')).toBe(false);
  expect(isValidPassword('a'.repeat(15))).toBe(true);
  expect(isValidPassword('a'.repeat(129))).toBe(false);
  await page.goto('fr/?page=account&view=signup');
  await expect(page.locator('#password')).toHaveAttribute('minlength', '15');
  await expect(page.locator('#password')).toHaveAttribute('maxlength', '128');
  await expect(page.locator('#password-rules')).toContainText('Entre 15 et 128 caractères');
});
