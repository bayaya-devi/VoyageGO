import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { africaCountries, africaLocales } from '../../data/africa-countries.js';

async function expectNoWcagViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(results.violations.map(({ id, impact, help, nodes }) => ({ id, impact, help, targets: nodes.map((node) => node.target) }))).toEqual([]);
}

for (const country of africaCountries) {
  test(`@a11y ${country.iso2} country interface`, async ({ page }) => {
    await page.goto(`${country.id}/fr/`);
    await expectNoWcagViolations(page);
  });
}

for (const locale of africaLocales) {
  test(`@a11y Morocco ${locale} mobile/RTL archetype`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`ma/${locale}/`);
    await expectNoWcagViolations(page);
  });
}
