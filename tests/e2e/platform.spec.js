import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const localized = [
  ['fr','Préparez sans perdre le fil.','Explorez au-delà des frontières.','Profil VoyageGo','ltr'],
  ['en','Plan without losing the thread.','Explore beyond borders.','VoyageGo profile','ltr'],
  ['ar','خطط من دون أن تفقد خيط الرحلة.','استكشف بلا حدود.','ملف VoyageGo الشخصي','rtl'],
  ['es','Prepara sin perder el hilo.','Explora más allá de las fronteras.','Perfil de VoyageGo','ltr'],
  ['pt','Prepara sem perder o fio.','Explora além das fronteiras.','Perfil VoyageGo','ltr'],
];
const publicOrigin = (process.env.PUBLIC_SITE_URL || 'https://bayaya-devi.github.io/VoyageGO').replace(/\/+$/u, '');

for (const [locale,prepareTitle,exploreTitle,profileTitle,direction] of localized) {
  test(`${locale} worldwide pages remain localized and responsive`,async({page})=>{
    const errors=[]; page.on('pageerror',(error)=>errors.push(error.message));
    const localizedDocument = await page.request.get(`${locale}/`);
    const localizedHtml = await localizedDocument.text();
    expect(localizedHtml).toContain(`<link rel="canonical" href="${publicOrigin}/${locale}/">`);
    expect(localizedHtml).toContain(`<meta property="og:url" content="${publicOrigin}/${locale}/">`);
    await page.goto(`${locale}/?page=prepare`);
    await expect(page.locator('html')).toHaveAttribute('dir',direction);
    await expect(page.getByRole('heading',{level:1,name:prepareTitle})).toBeVisible();
    await expect(page.locator('.platform-nav a')).toHaveCount(4);
    await page.goto(`${locale}/?page=explore`);
    await expect(page.getByRole('heading',{level:1,name:exploreTitle})).toBeVisible();
    await expect(page.locator('.destination-editorial article')).toHaveCount(6);
    await page.goto(`${locale}/?page=profile`);
    await expect(page.getByRole('heading',{level:1,name:profileTitle})).toBeVisible();
    const size=await page.evaluate(()=>({body:document.body.scrollWidth,viewport:document.documentElement.clientWidth}));
    expect(size.body).toBeLessThanOrEqual(size.viewport);
    expect(errors).toEqual([]);
  });
}

test('trip draft survives navigation without pretending to be synchronized',async({page})=>{
  await page.goto('fr/?page=prepare');
  await page.getByLabel('Nom du voyage').fill('Atlas au printemps');
  await page.getByLabel('Destination').fill('Maroc');
  await page.getByLabel('Notes').fill('Deux journées dans le Haut Atlas');
  await page.getByRole('button',{name:'Enregistrer le brouillon'}).click();
  await expect(page.locator('#draft-status')).toContainText('enregistré sur cet appareil');
  await page.reload();
  await expect(page.getByLabel('Nom du voyage')).toHaveValue('Atlas au printemps');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('voyagego-trip-draft-v1')).destination)).toBe('Maroc');
});

test('onboarding allows exactly three favorite countries and persists progress',async({page})=>{
  await page.goto('fr/?page=onboarding&step=4');
  const choices=page.locator('[data-country]');
  await choices.nth(0).click(); await choices.nth(1).click(); await choices.nth(2).click(); await choices.nth(3).click();
  await expect(page.locator('[data-country][aria-pressed="true"]')).toHaveCount(3);
  await expect(page.locator('#countries-next')).toBeEnabled();
  await page.reload();
  await expect(page.locator('[data-country][aria-pressed="true"]')).toHaveCount(3);
});

test('profile and provider routes remain honest while identity is disabled',async({page})=>{
  await page.goto('fr/?page=profile');
  await expect(page.getByRole('link',{name:'Se connecter'})).toBeVisible();
  await expect(page.locator('.platform-status')).toContainText('connexion sécurisée');
  await page.goto('fr/?page=provider');
  await expect(page.getByRole('link',{name:'Se connecter'})).toBeVisible();
  await expect(page.getByText('Elle ne crée jamais un second compte.')).toBeVisible();
});

test('@a11y worldwide public, planner and onboarding pages pass WCAG 2.2 AA automation',async({page})=>{
  for(const path of ['fr/?page=prepare','fr/?page=explore','fr/?page=onboarding&step=4','ar/?page=prepare']){
    await page.goto(path);
    const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    expect(results.violations.map(({id,impact,help,nodes})=>({id,impact,help,targets:nodes.map((node)=>node.target)}))).toEqual([]);
  }
});
