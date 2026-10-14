import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isValidPassword } from '../../auth/validation.js';

const locales = [
  { code: 'fr', tagline: 'LE MONDE VOUS ATTEND', direction: 'ltr', cookieTitle: 'Cookies et préférences', content: 'Contenu disponible' },
  { code: 'en', tagline: 'THE WORLD IS WAITING', direction: 'ltr', cookieTitle: 'Cookies and preferences', content: 'Content available' },
  { code: 'ar', tagline: 'العالم في انتظارك', direction: 'rtl', cookieTitle: 'ملفات الارتباط والتفضيلات', content: 'المحتوى متاح' },
  { code: 'es', tagline: 'EL MUNDO TE ESPERA', direction: 'ltr', cookieTitle: 'Cookies y preferencias', content: 'Contenido disponible' },
  { code: 'pt', tagline: 'O MUNDO ESPERA POR SI', direction: 'ltr', cookieTitle: 'Cookies e preferências', content: 'Conteúdo disponível' },
];

const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 960 } },
  { name: 'mobile', viewport: { width: 375, height: 812 } },
];

async function focusGlobe(page, longitude, latitude) {
  const interaction = page.locator('#globe-interaction');
  const stage = page.locator('#journey-stage');
  const box = await interaction.boundingBox();
  const rotation = await stage.evaluate((element) => ({ x: Number(element.dataset.rotationX), y: Number(element.dataset.rotationY) }));
  const target = { x: latitude * Math.PI / 180, y: -longitude * Math.PI / 180 };
  let horizontalRotation = target.y - rotation.y;
  while (horizontalRotation > Math.PI) horizontalRotation -= Math.PI * 2;
  while (horizontalRotation < -Math.PI) horizontalRotation += Math.PI * 2;
  let remainingX = horizontalRotation / .0042;
  let remainingY = (target.x - rotation.x) / .0042;
  while (Math.abs(remainingX) > .5 || Math.abs(remainingY) > .5) {
    const movementX = Math.max(-180, Math.min(180, remainingX));
    const movementY = Math.max(-180, Math.min(180, remainingY));
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + movementX, centerY + movementY, { steps: 5 });
    await page.mouse.up();
    remainingX -= movementX;
    remainingY -= movementY;
  }
  await expect.poll(() => stage.evaluate((element) => Number(element.dataset.rotationX)), { timeout: 10_000 }).toBeCloseTo(target.x, 1);
  await expect.poll(async () => {
    const actual = await stage.evaluate((element) => Number(element.dataset.rotationY));
    return Math.abs(Math.atan2(Math.sin(actual - target.y), Math.cos(actual - target.y)));
  }, { timeout: 10_000 }).toBeLessThan(.05);
}

async function clickGeographicPoint(page, longitude, latitude) {
  const geometry = await page.evaluate(({ longitude: pointLongitude, latitude: pointLatitude }) => {
    const stage = document.querySelector('#journey-stage');
    const interaction = document.querySelector('#globe-interaction').getBoundingClientRect();
    const rotationX = Number(stage.dataset.rotationX);
    const rotationY = Number(stage.dataset.rotationY);
    const longitudeRadians = pointLongitude * Math.PI / 180;
    const latitudeRadians = pointLatitude * Math.PI / 180;
    const local = {
      x: Math.cos(latitudeRadians) * Math.sin(longitudeRadians),
      y: Math.sin(latitudeRadians),
      z: Math.cos(latitudeRadians) * Math.cos(longitudeRadians),
    };
    const a = Math.cos(rotationX);
    const b = Math.sin(rotationX);
    const c = Math.cos(rotationY);
    const d = Math.sin(rotationY);
    const rotated = {
      x: c * local.x + d * local.z,
      y: b * d * local.x + a * local.y - b * c * local.z,
      z: -a * d * local.x + b * local.y + a * c * local.z,
    };
    const fieldOfView = 37 * Math.PI / 180;
    const focalLength = innerHeight / (2 * Math.tan(fieldOfView / 2));
    const centerX = interaction.left + interaction.width / 2;
    const centerY = interaction.top + interaction.height / 2;
    const scaleToCamera = (interaction.width / 2) / focalLength;
    const globeXToCamera = (centerX - innerWidth / 2) / focalLength;
    const globeYToCamera = -(centerY - innerHeight / 2) / focalLength;
    const perspective = 1 - scaleToCamera * rotated.z;
    return {
      x: innerWidth / 2 + focalLength * (globeXToCamera + scaleToCamera * rotated.x) / perspective,
      y: innerHeight / 2 - focalLength * (globeYToCamera + scaleToCamera * rotated.y) / perspective,
    };
  }, { longitude, latitude });
  await page.mouse.click(geometry.x, geometry.y);
}

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
      await expect(page.locator('.scroll-arrow')).toBeVisible();
      await expect(page.locator('#country-picker')).toHaveClass(/sr-only/);
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
      await expect(page.locator('#country-popup')).toContainText(locale.content);
      await expect(page.locator('#country-popup .country-action')).toHaveAttribute('href', new RegExp(`/${locale.code}/\\?page=explore&country=FR`));
      await expect(page.locator('#destination-visual')).toHaveAttribute('data-country', 'FRA');
      await expect.poll(() => page.locator('#destination-visual img.is-active').evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);

      await page.locator('#country-picker').selectOption('MAR');
      await expect(page.locator('#country-popup .country-action')).toHaveAttribute('href', new RegExp(`/ma/${locale.code}/$`));
      await expect(page.locator('#country-popup')).toContainText(locale.code === 'ar' ? 'المغرب' : locale.code === 'fr' ? 'Maroc' : locale.code === 'es' ? 'Marruecos' : locale.code === 'pt' ? 'Marrocos' : 'Morocco');

      await page.evaluate(() => window.scrollTo(0, document.querySelector('#journey-track').offsetTop + (document.querySelector('#journey-track').offsetHeight - innerHeight) * .45));
      await expect(page.locator('#journey-stage')).toHaveAttribute('data-progress', /^0\.4/);
      const storyGeometry = await page.evaluate(() => {
        const globe = document.querySelector('#globe-interaction').getBoundingClientRect();
        const rectangles = [...document.querySelectorAll('#scene-steps li')].map((element) => element.getBoundingClientRect());
        const labels = rectangles.map((rect) => rect.right > globe.left && rect.left < globe.right && rect.bottom > globe.top && rect.top < globe.bottom);
        return { labels, tops: rectangles.map((rect) => Math.round(rect.top)) };
      });
      expect(storyGeometry.labels).toEqual([false, false, false]);
      expect(Math.max(...storyGeometry.tops) - Math.min(...storyGeometry.tops)).toBeLessThanOrEqual(2);

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
  await page.locator('#home-menu-trigger').click();
  await page.locator('#home-language-trigger').click();
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
  const trigger = page.getByRole('button', { name: 'Navigation principale' });
  await trigger.click();
  await expect(page.locator('#home-menu-primary')).toContainText('Connexion');
  await expect(page.locator('#home-menu-primary')).toContainText('Inscription');
  await page.locator('#home-language-trigger').click();
  await expect(page.getByRole('button', { name: 'Español' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#home-menu-panel')).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('home menu is a single viewport-safe control and closes on toggle and outside click', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('fr/');
  await expect(page.locator('.floating-controls > *')).toHaveCount(1);
  const trigger = page.locator('#home-menu-trigger');
  await expect(trigger.locator('span')).toHaveCount(3);
  await trigger.click();
  const geometry = await page.locator('#home-menu-panel').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.height);
  await trigger.click();
  await expect(page.locator('#home-menu-panel')).toBeHidden();
  await trigger.click();
  await page.locator('#journey-stage').click({ position: { x: 20, y: 20 }, force: true });
  await expect(page.locator('#home-menu-panel')).toBeHidden();
});

test('final globe supports bounded wheel zoom and reversible progressive steps', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('fr/');
  const track = page.locator('#journey-track');
  await expect(track).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, (document.querySelector('#journey-track').offsetHeight - innerHeight) * .84));
  await expect(page.locator('#journey-stage')).toHaveAttribute('data-progress', /^0\.8/);
  const before = Number(await page.locator('#journey-stage').getAttribute('data-zoom'));
  await page.locator('#globe-interaction').hover({ force: true });
  await page.mouse.wheel(0, -420);
  await expect.poll(async () => Number(await page.locator('#journey-stage').getAttribute('data-zoom'))).toBeGreaterThan(before);
  await page.mouse.wheel(0, -5000);
  expect(Number(await page.locator('#journey-stage').getAttribute('data-zoom'))).toBeLessThanOrEqual(2.65);
  const globe = await page.locator('#globe-interaction').boundingBox();
  const rotationBefore = await page.locator('#journey-stage').evaluate((stage) => [Number(stage.dataset.rotationX), Number(stage.dataset.rotationY)]);
  await page.mouse.move(globe.x + globe.width / 2, globe.y + globe.height / 2);
  await page.mouse.down();
  await page.mouse.move(globe.x + globe.width / 2 + 48, globe.y + globe.height / 2 + 42, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => page.locator('#journey-stage').evaluate((stage) => Number(stage.dataset.rotationX))).not.toBe(rotationBefore[0]);
  await page.locator('#globe-interaction').press('ArrowRight');
  await expect.poll(() => page.locator('#journey-stage').evaluate((stage) => Number(stage.dataset.rotationY))).not.toBe(rotationBefore[1]);
  const keyboardZoom = Number(await page.locator('#journey-stage').getAttribute('data-zoom'));
  await page.locator('#globe-interaction').press('-');
  await expect.poll(async () => Number(await page.locator('#journey-stage').getAttribute('data-zoom'))).toBeLessThan(keyboardZoom);
  await page.evaluate(() => window.scrollTo(0, (document.querySelector('#journey-track').offsetHeight - innerHeight) * .34));
  const revealed = await page.locator('.stage-steps li').evaluateAll((items) => items.map((item) => Number(getComputedStyle(item).opacity)));
  expect(revealed[0]).toBeGreaterThan(revealed[2]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(track).toBeVisible();
  const reset = await page.locator('.stage-steps li').evaluateAll((items) => items.map((item) => Number(getComputedStyle(item).opacity)));
  expect(reset.every((value) => value < .05)).toBe(true);
});

test('destination photography crossfades and unverified countries use the atmospheric fallback', async ({ page }) => {
  await page.goto('fr/');
  await expect.poll(() => page.locator('#country-picker option').count(), { timeout: 20_000 }).toBeGreaterThan(230);
  await page.evaluate(() => window.scrollTo(0, (document.querySelector('#journey-track').offsetHeight - innerHeight) * .84));
  await page.locator('#country-picker').selectOption('THA');
  await expect(page.locator('#destination-visual')).toHaveAttribute('data-country', 'THA');
  await expect(page.locator('#country-popup .photo-credit')).toHaveAttribute('href', /commons\.wikimedia\.org/);
  await page.locator('#country-picker').selectOption('MAR');
  await expect(page.locator('#destination-visual')).toHaveAttribute('data-country', 'MAR');
  await page.locator('#country-picker').selectOption('CAN');
  await expect(page.locator('#destination-visual')).not.toHaveClass(/is-visible/);
  await expect(page.locator('#country-popup .photo-credit')).toHaveCount(0);
});

test('one curated horizon loads per opening, does not immediately repeat and returns after deselection', async ({ page }) => {
  test.setTimeout(90_000);
  const horizonRequests = [];
  page.on('request', (request) => {
    if (/\/assets\/horizons\/[^/?]+\.webp/.test(request.url())) horizonRequests.push(request.url());
  });
  await page.goto('fr/');
  const scene = page.locator('#universal-horizon');
  await expect(scene).toHaveClass(/is-ready/);
  const first = await scene.getAttribute('data-horizon-id');
  const firstSource = await page.locator('#universal-horizon-image').getAttribute('src');
  expect(horizonRequests).toHaveLength(1);
  await expect(page.locator('#universal-horizon-credit')).toHaveAttribute('href', /images\.nasa\.gov\/details\//);
  await expect(page.locator('#country-picker')).toHaveAttribute('data-world-loaded', 'true', { timeout: 20_000 });

  await page.evaluate(() => window.scrollTo(0, (document.querySelector('#journey-track').offsetHeight - innerHeight) * .84));
  await page.locator('#country-picker').selectOption('MAR');
  await expect(page.locator('#journey-stage')).toHaveClass(/has-destination-visual/, { timeout: 20_000 });
  await page.locator('#country-popup .popup-close').click();
  await expect(page.locator('#journey-stage')).not.toHaveClass(/has-destination-visual/);
  await expect(scene).toHaveAttribute('data-horizon-id', first);
  await expect(page.locator('#universal-horizon-image')).toHaveAttribute('src', firstSource);

  horizonRequests.length = 0;
  await page.reload();
  await expect(scene).toHaveClass(/is-ready/);
  await expect(scene).not.toHaveAttribute('data-horizon-id', first);
  expect(horizonRequests).toHaveLength(1);
});

test('reduced-motion preference disables horizon movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('fr/');
  await expect(page.locator('#universal-horizon')).toHaveClass(/is-ready/);
  await expect(page.locator('#universal-horizon-image')).toHaveCSS('animation-name', 'none');
});

test('real globe raycasting selects rotated and zoomed countries but not the ocean', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('fr/');
  await expect.poll(() => page.locator('#country-picker option').count(), { timeout: 20_000 }).toBeGreaterThan(230);
  await page.evaluate(() => window.scrollTo(0, (document.querySelector('#journey-track').offsetHeight - innerHeight) * .84));
  await expect(page.locator('#map-section')).not.toHaveAttribute('inert', '');

  await focusGlobe(page, -6, 32);
  await page.screenshot({ path: 'test-results/geo-control-africa-europe.png' });
  await clickGeographicPoint(page, -6, 32);
  const moroccoPick = await page.locator('#journey-stage').evaluate((stage) => ({ longitude: Number(stage.dataset.pickLongitude), latitude: Number(stage.dataset.pickLatitude) }));
  expect(moroccoPick.longitude).toBeCloseTo(-6, 0);
  expect(moroccoPick.latitude).toBeCloseTo(32, 0);
  await expect(page.locator('#country-picker')).toHaveValue('MAR');

  await page.locator('#globe-interaction').hover({ force: true });
  await page.mouse.wheel(0, -650);
  await expect.poll(async () => Number(await page.locator('#journey-stage').getAttribute('data-zoom'))).toBeGreaterThan(1.5);
  await focusGlobe(page, 101, 15);
  await page.screenshot({ path: 'test-results/geo-control-asia.png' });
  await clickGeographicPoint(page, 101, 15);
  await expect(page.locator('#country-picker')).toHaveValue('THA');

  await focusGlobe(page, -52, -10);
  await page.screenshot({ path: 'test-results/geo-control-americas.png' });
  await clickGeographicPoint(page, -52, -10);
  await expect(page.locator('#country-picker')).toHaveValue('BRA');

  await focusGlobe(page, 178.1, -17.8);
  await page.screenshot({ path: 'test-results/geo-control-oceania.png' });
  await clickGeographicPoint(page, 178.1, -17.8);
  await expect(page.locator('#country-picker')).toHaveValue('FJI');

  await focusGlobe(page, -30, 0);
  await clickGeographicPoint(page, -30, 0);
  await expect(page.locator('#country-picker')).toHaveValue('FJI');
});

test('globe recovers after WebGL context loss and remains interactive', async ({ page }) => {
  await page.goto('fr/');
  const stage=page.locator('#journey-stage');
  const canvas=page.locator('.globe-canvas');
  await expect(canvas).toHaveCount(1);
  await expect(stage).toHaveAttribute('data-render-state','running');
  await page.evaluate(()=>window.scrollTo(0,(document.querySelector('#journey-track').offsetHeight-innerHeight)*.84));
  await expect(page.locator('#map-section')).not.toHaveAttribute('inert','');

  await canvas.dispatchEvent('webglcontextlost',{cancelable:true});
  await expect(stage).toHaveAttribute('data-render-state','context-lost');
  await expect(page.locator('#map-fallback .atlas-fallback')).toBeVisible();

  await canvas.dispatchEvent('webglcontextrestored');
  await expect(stage).toHaveAttribute('data-render-state','running');
  await expect(page.locator('#map-fallback .atlas-fallback')).toBeHidden();
  await page.locator('#globe-interaction').focus();
  const before=Number(await stage.getAttribute('data-rotation-y'));
  await page.keyboard.press('ArrowRight');
  await expect.poll(async()=>Number(await stage.getAttribute('data-rotation-y'))).toBeGreaterThan(before);
});

test('rapid responsive rerenders keep a single globe renderer', async ({ page }) => {
  await page.goto('fr/');
  await expect(page.locator('.globe-canvas')).toHaveCount(1);
  for(const width of [790,820,780,840,760,1024]) await page.setViewportSize({width,height:820});
  await expect(page.locator('.globe-canvas')).toHaveCount(1);
  await expect(page.locator('#country-picker')).toHaveAttribute('data-world-loaded','true');
  await expect(page.locator('#journey-stage')).toHaveAttribute('data-render-state','running');
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
  test.setTimeout(120_000);
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
