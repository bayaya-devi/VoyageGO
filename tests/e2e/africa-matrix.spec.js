import { test, expect } from '@playwright/test';
import { africaCountries, africaLocales } from '../../data/africa-countries.js';

test.describe.configure({ mode: 'parallel' });

for (const country of africaCountries) {
  for (const locale of africaLocales) {
    test(`${country.iso2}/${locale} works on desktop and mobile`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
      await page.goto(`${country.id}/${locale}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.getByRole('heading', { level: 1, name: country.names[locale] })).toBeVisible();
      await expect(page.locator('.country-statuses span')).toHaveCount(4);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/${country.id}/${locale}/$`, 'u'));
      await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(6);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--country-primary').trim())).toBe(country.palette.primary);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      await expect(page.locator('.country-facts')).toBeVisible();
      const dimensions = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
      expect(pageErrors).toEqual([]);
    });
  }
}
