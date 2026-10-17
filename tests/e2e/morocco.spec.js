import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const locales = [
  { code: 'fr', direction: 'ltr', title: 'Laissez-vous surprendre par ce qui vous attend.' },
  { code: 'en', direction: 'ltr', title: 'Let yourself be surprised by what awaits.' },
  { code: 'es', direction: 'ltr', title: 'Déjate sorprender por lo que te espera.' },
  { code: 'pt', direction: 'ltr', title: 'Deixe-se surpreender pelo que o espera.' },
  { code: 'ar', direction: 'rtl', title: 'دع ما ينتظرك يفاجئك.' },
];

test('Morocco home is immersive, localized and keeps essential navigation', async ({ page }) => {
  await page.goto('ma/fr/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: locales[0].title })).toBeVisible();
  await expect(page.locator('.secondary-header')).toHaveCount(0);
  const dock = page.getByRole('navigation', { name: 'Voyager' });
  await expect(dock.getByRole('link', { name: 'Accueil' })).toBeVisible();
  await expect(dock.getByRole('link', { name: 'Préparer' })).toBeVisible();
  await expect(dock.getByRole('link', { name: 'Explorer' })).toBeVisible();
  await expect(dock.getByRole('link', { name: 'Profil' })).toBeVisible();
  await expect(page.locator('.ma-hero-slide')).toHaveCount(3);
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('.ma-hero-slide.is-active')).toHaveCount(1);
});

test('five localized Morocco routes preserve direction and do not overflow', async ({ browser }) => {
  for (const locale of locales) {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto(`ma/${locale.code}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', locale.code);
      await expect(page.locator('html')).toHaveAttribute('dir', locale.direction);
      await expect(page.getByRole('heading', { name: locale.title })).toBeVisible();
      const width = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(width.body).toBeLessThanOrEqual(width.viewport);
      await context.close();
    }
  }
});

test('explore links map, list and immersive place page', async ({ page }) => {
  await page.goto('ma/fr/?page=explore');
  await expect(page.getByRole('heading', { name: 'Carte vivante' })).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.getByRole('button', { name: /Chefchaouen/ }).click();
  await expect(page.locator('[data-map-focus]')).toBeVisible();
  await page.locator('[data-map-focus]').getByRole('link', { name: 'Découvrir ce lieu' }).click();
  await expect(page.getByRole('heading', { name: 'Chefchaouen', level: 1 })).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.getByRole('button', { name: /Ajouter au voyage/ }).click();
  await expect(page.getByRole('button', { name: /Ajouté au carnet/ })).toBeDisabled();
});

test('planner persists selected places and exposes printable PDF export', async ({ page }) => {
  await page.goto('ma/fr/?page=prepare');
  await page.getByRole('checkbox', { name: /Chefchaouen/ }).check();
  await expect(page.locator('[data-journal]')).toContainText('Chefchaouen');
  await page.reload();
  await expect(page.getByRole('checkbox', { name: /Chefchaouen/ })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Exporter en PDF' })).toBeVisible();
});

test('shared account and profile keep Morocco contextual navigation', async ({ page }) => {
  await page.goto('ma/fr/?page=profile');
  await expect(page.locator('.secondary-header')).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Voyager' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible();
  await page.goto('ma/fr/?page=account&view=login');
  await expect(page.locator('.secondary-header')).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Voyager' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('reduced motion removes transformations and Morocco pages pass WCAG AA automation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('ma/ar/');
  await expect(page.locator('.ma-story-place').first()).toHaveCSS('transform', 'none');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map(({ id, impact, help }) => ({ id, impact, help }))).toEqual([]);
});
