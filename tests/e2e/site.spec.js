import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const cases = [
  { locale: 'fr', device: 'desktop', viewport: { width: 1440, height: 960 }, title: 'Votre prochaine découverte commence ici.', direction: 'ltr' },
  { locale: 'en', device: 'desktop', viewport: { width: 1440, height: 960 }, title: 'Your next discovery starts here.', direction: 'ltr' },
  { locale: 'ar', device: 'desktop', viewport: { width: 1440, height: 960 }, title: 'اكتشافك القادم يبدأ من هنا.', direction: 'rtl' },
  { locale: 'fr', device: 'mobile', viewport: { width: 375, height: 812 }, title: 'Votre prochaine découverte commence ici.', direction: 'ltr' },
  { locale: 'en', device: 'mobile', viewport: { width: 375, height: 812 }, title: 'Your next discovery starts here.', direction: 'ltr' },
  { locale: 'ar', device: 'mobile', viewport: { width: 375, height: 812 }, title: 'اكتشافك القادم يبدأ من هنا.', direction: 'rtl' },
];

for (const scenario of cases) {
  test(`${scenario.device} ${scenario.locale}: portal, destinations and legal route`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: scenario.viewport });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(`${scenario.locale}/`);
    await expect(page.locator('html')).toHaveAttribute('lang', scenario.locale);
    await expect(page.locator('html')).toHaveAttribute('dir', scenario.direction);
    await expect(page.getByRole('heading', { level: 1, name: scenario.title })).toBeVisible();
    await expect(page.locator('#map-stage svg')).toBeVisible();
    await expect(page.locator('#map-stage [data-destination="ma"]')).toHaveAttribute('data-available', 'true');
    await expect(page.locator('#map-stage [data-destination="fr"]')).toHaveAttribute('aria-label', /.+/);
    await expect(page.locator('.destination-link.is-available')).toHaveAttribute('href', 'https://bayaya-devi.github.io/MarocoGO/');
    await page.locator('#map-stage [data-destination="fr"]').click();
    await expect(page.locator('#notice')).toBeVisible();
    await page.getByRole('button', { name: scenario.locale === 'ar' ? 'إغلاق' : scenario.locale === 'fr' ? 'Fermer' : 'Close' }).click();
    await page.getByRole('button', { name: scenario.locale === 'ar' ? 'تسجيل الدخول' : scenario.locale === 'fr' ? 'Connexion' : 'Sign in' }).click();
    await expect(page.locator('#notice')).toBeVisible();

    const dimensions = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);

    await page.locator('[data-legal="cookies"]').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(scenario.locale === 'ar' ? 'ملفات الارتباط والتفضيلات' : scenario.locale === 'fr' ? 'Cookies et préférences' : 'Cookies and preferences');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
    await expect(page.locator('#reset-language')).toBeVisible();
    expect(pageErrors).toEqual([]);
    await context.close();
  });
}

test('manual language preference overrides browser language and survives the selector', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' });
  await context.addInitScript(() => {
    if (location.pathname.endsWith('/VoyageGO/')) localStorage.setItem('voyagego-language', 'fr');
  });
  const page = await context.newPage();
  await page.goto('./');
  await expect(page).toHaveURL(/\/VoyageGO\/fr\/$/);
  await page.locator('#language-select').selectOption('ar');
  await expect(page).toHaveURL(/\/VoyageGO\/ar\/$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('voyagego-language'))).toBe('ar');
  await context.close();
});

test('browser language is detected and unsupported languages fall back to French', async ({ browser }) => {
  const english = await browser.newContext({ locale: 'en-US' });
  const englishPage = await english.newPage();
  await englishPage.goto('./');
  await expect(englishPage).toHaveURL(/\/VoyageGO\/en\/$/);
  await english.close();

  const unsupported = await browser.newContext({ locale: 'de-DE' });
  const fallbackPage = await unsupported.newPage();
  await fallbackPage.goto('./');
  await expect(fallbackPage).toHaveURL(/\/VoyageGO\/fr\/$/);
  await unsupported.close();
});

test('system color scheme changes the interface without reloading', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('fr/');
  const light = await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor);
  await page.emulateMedia({ colorScheme: 'dark' });
  const dark = await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor);
  expect(dark).not.toBe(light);
});

test('desktop, tablet and narrow mobile layouts stay within the viewport in LTR and RTL', async ({ page }) => {
  for (const locale of ['fr', 'ar']) {
    await page.goto(`${locale}/`);
    for (const width of [320, 375, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const dimensions = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(dimensions.body, `${locale} at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
    }
  }
});

test('@a11y localized pages pass axe WCAG 2.2 AA checks', async ({ page }) => {
  for (const locale of ['fr', 'en', 'ar']) {
    await page.goto(`${locale}/`);
    await page.locator('#map-stage [data-destination="ma"]').waitFor();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map(({ id, impact, help }) => ({ id, impact, help }))).toEqual([]);
  }
});
