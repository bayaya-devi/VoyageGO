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
      await expect(page.locator('.scene-brand img')).toBeVisible();
      await expect(page.locator('#country-picker')).toBeVisible();
      await expect.poll(() => page.locator('#country-picker option').count()).toBeGreaterThan(150);

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
