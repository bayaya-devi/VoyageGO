import { destinations, localeCodes } from './data/countries.js';
import { getAfricaCountry } from './data/africa-countries.js';
import { mountHorizon } from './horizons.js';

const app = document.querySelector('#app');
const preferenceKey = 'voyagego-language';
const languageLabels = { fr: 'Français', ar: 'العربية', en: 'English', es: 'Español', pt: 'Português' };
const iconPaths = {
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 0 0 18m0-18a15 15 0 0 1 0 18"/>',
  up: '<path d="M12 20V4m-7 7 7-7 7 7"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h2a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h0"/>',
  landscape: '<path d="m3 19 6-8 4 5 3-4 5 7H3Z"/><path d="M13 8h.01M3 21h18"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
};

let cleanupGlobe = () => {};
let cleanupAccount = () => {};
let cleanupHorizon = () => {};
let cleanupPlatform = () => {};
let renderGeneration = 0;

function icon(name, className = '') {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function localeFromPath() {
  const candidate = location.pathname.split('/').filter(Boolean).at(-1);
  return localeCodes.includes(candidate) ? candidate : null;
}

function countryFromPath() {
  const segments = location.pathname.split('/').filter(Boolean);
  const localeIndex = segments.findIndex((segment) => localeCodes.includes(segment));
  return localeIndex > 0 ? getAfricaCountry(segments[localeIndex - 1]) : null;
}

function preferredLocale() {
  try {
    const saved = localStorage.getItem(preferenceKey);
    if (localeCodes.includes(saved)) return saved;
  } catch { /* Browser storage is optional. */ }
  for (const language of navigator.languages || [navigator.language]) {
    const code = language?.toLowerCase().split('-')[0];
    if (localeCodes.includes(code)) return code;
  }
  return 'fr';
}

function getDevice() { return matchMedia('(max-width: 800px)').matches ? 'telephone' : 'ordinateur'; }
function currentPage() {
  const params = new URLSearchParams(location.search);
  if (params.get('page') === 'legal') return { type: 'legal', docId: params.get('doc') };
  if (params.get('page') === 'account') return { type: 'account', view: params.get('view') || 'login', returnTo: params.get('returnTo') };
  if (['prepare','explore','profile','provider','listing','bookings','onboarding'].includes(params.get('page'))) {
    return { type: params.get('page'), step: params.get('step'), scope: params.get('scope') };
  }
  const country = countryFromPath();
  return country ? { type: 'country', country } : null;
}

function homeUrl(locale, country = countryFromPath()) {
  return new URL(country ? `${country.id}/${locale}/` : `${locale}/`, new URL('./', document.baseURI)).href;
}
function legalUrl(locale, docId) {
  const url = new URL(homeUrl(locale));
  url.search = new URLSearchParams({ page: 'legal', doc: docId });
  return url.href;
}

function accountUrl(locale, view, returnTo = null) {
  const url = new URL(homeUrl(locale));
  url.searchParams.set('page', 'account');
  url.searchParams.set('view', view);
  if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) url.searchParams.set('returnTo', returnTo);
  return url.href;
}

function platformUrl(locale, page, extra = {}) {
  const url = new URL(homeUrl(locale));
  url.search = new URLSearchParams({ page, ...extra });
  return url.href;
}

function menuItems(copy) {
  return localeCodes.map((locale) => `<li><button type="button" data-language="${locale}" lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}" ${locale === copy.lang ? 'aria-current="true"' : ''}><span class="language-symbol" aria-hidden="true">${{ fr: '◌', ar: '◉', en: '◎', es: '◍', pt: '◯' }[locale]}</span><span>${copy.languageNames[locale]}</span></button></li>`).join('');
}

function languageControl(copy) {
  return `<div class="language-dock"><button id="language-trigger" class="language-trigger" type="button" aria-label="${escapeHtml(copy.chooseLanguage)}" aria-expanded="false" aria-controls="language-menu">${icon('globe')}</button>
    <div id="language-menu" class="language-menu" hidden><p>${escapeHtml(copy.chooseLanguage)}</p><ul>${menuItems(copy)}</ul></div></div>`;
}

function homeMenu(copy) {
  return `<div class="home-menu" id="home-menu">
    <div class="home-menu-panel" id="home-menu-panel" aria-label="${escapeHtml(copy.menu)}" hidden>
      <div class="home-menu-primary" id="home-menu-primary">
        <a href="${escapeHtml(platformUrl(copy.lang, 'prepare'))}">${escapeHtml(copy.steps[1].title)}</a>
        <a href="${escapeHtml(platformUrl(copy.lang, 'explore'))}">${escapeHtml(copy.steps[2].title)}</a>
        <a href="${escapeHtml(accountUrl(copy.lang, 'login'))}" data-home-login>${escapeHtml(copy.login)}</a>
        <a href="${escapeHtml(accountUrl(copy.lang, 'signup'))}" data-home-signup>${escapeHtml(copy.signup)}</a>
        <button type="button" id="home-language-trigger" aria-expanded="false" aria-controls="home-language-menu"><span>${escapeHtml(copy.language)}</span><span aria-hidden="true">›</span></button>
      </div>
      <div class="home-language-menu" id="home-language-menu" aria-label="${escapeHtml(copy.chooseLanguage)}" hidden>
        <button class="home-menu-back" type="button" id="home-language-back"><span aria-hidden="true">‹</span><span>${escapeHtml(copy.chooseLanguage)}</span></button>
        <ul>${menuItems(copy)}</ul>
      </div>
    </div>
    <button class="home-menu-trigger" id="home-menu-trigger" type="button" aria-label="${escapeHtml(copy.menu)}" aria-expanded="false" aria-controls="home-menu-panel"><span></span><span></span><span></span></button>
  </div>`;
}

function header(copy, page = null) {
  const isAccountEntry = page?.type === 'account' && ['login', 'signup'].includes(page.view);
  const accountActions = isAccountEntry
    ? `<nav class="account-header-links" aria-label="${escapeHtml(copy.accountNavigation)}"><a class="header-auth-link ${page.view === 'login' ? 'is-current' : ''}" href="${escapeHtml(accountUrl(copy.lang, 'login', page.returnTo))}" ${page.view === 'login' ? 'aria-current="page"' : ''}>${escapeHtml(copy.login)}</a><a class="header-auth-link ${page.view === 'signup' ? 'is-current' : ''}" href="${escapeHtml(accountUrl(copy.lang, 'signup', page.returnTo))}" ${page.view === 'signup' ? 'aria-current="page"' : ''}>${escapeHtml(copy.signup)}</a></nav>`
    : `<a class="profile-trigger header-profile" data-profile-link href="${escapeHtml(accountUrl(copy.lang, 'login'))}" aria-label="${escapeHtml(copy.login)}" title="${escapeHtml(copy.login)}">${icon('user')}<span>${escapeHtml(copy.login)}</span></a>`;
  return `<a class="skip-link" href="#main-content">${escapeHtml(copy.skip)}</a>
    <header class="secondary-header">
      <a class="brand" href="${escapeHtml(homeUrl(copy.lang))}" aria-label="VoyageGo — ${escapeHtml(copy.home)}"><img src="${new URL('voyagego-logo-2x.png', document.baseURI).href}" width="1086" height="362" alt="VoyageGo"></a>
      <nav class="secondary-primary-nav" aria-label="${escapeHtml(copy.menu)}"><a href="${escapeHtml(platformUrl(copy.lang,'prepare'))}" ${page?.type==='prepare'?'aria-current="page"':''}>${escapeHtml(copy.steps[1].title)}</a><a href="${escapeHtml(platformUrl(copy.lang,'explore'))}" ${page?.type==='explore'?'aria-current="page"':''}>${escapeHtml(copy.steps[2].title)}</a></nav>
      <div class="header-actions">${accountActions}${languageControl(copy)}</div>
    </header>`;
}

function destinationShortcuts(copy) {
  return destinations.map((country) => {
    const name = country.names[copy.lang];
    const status = country.status === 'content' ? copy.available : copy.comingSoon;
    const content = `<span class="destination-dot" aria-hidden="true"></span><span><bdi lang="${copy.lang}">${escapeHtml(name)}</bdi><small>${escapeHtml(status)}</small></span>${icon('arrow', 'destination-arrow')}`;
    return `<button class="destination-shortcut ${country.status === 'content' ? 'is-available' : ''}" type="button" data-destination="${country.iso3}" aria-label="${escapeHtml(name)} — ${escapeHtml(status)}">${content}</button>`;
  }).join('');
}

function destinationOptions(copy) {
  return destinations.map((country) => `<option value="${country.iso3}">${country.names[copy.lang]}</option>`).join('');
}

function homeContent(copy) {
  const stepNames = copy.steps.map((step) => `<li><span>${escapeHtml(step.title)}</span><small>${escapeHtml(step.text)}</small></li>`).join('');
  return `<main id="main-content" tabindex="-1" class="immersive-page">
    <div class="journey-track" id="journey-track">
      <div class="journey-stage" id="journey-stage" data-progress="0">
        <div class="living-horizon" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="universal-horizon" id="universal-horizon" aria-hidden="true"><img id="universal-horizon-image" alt=""></div>
        <a class="universal-horizon-credit" id="universal-horizon-credit" target="_blank" rel="noreferrer"></a>
        <div class="destination-visual" id="destination-visual" aria-hidden="true"><img data-destination-layer="0" alt=""><img data-destination-layer="1" alt=""></div>
        <div id="globe-host" aria-hidden="true"></div>
        <div id="globe-interaction" role="application" tabindex="0" aria-label="${escapeHtml(copy.mapLabel)}"></div>
        <p id="globe-status" class="sr-only" role="status" aria-live="polite"></p>
        <p id="country-announcement" class="sr-only" role="status" aria-live="polite"></p>
        <img class="scene-brand" id="scene-brand" src="${new URL('voyagego-logo-2x.png', document.baseURI).href}" width="1086" height="362" alt="VoyageGo">
        <div class="hero-copy" id="scene-welcome"><h1 class="hero-tagline" id="hero-title">${escapeHtml(copy.tag)}</h1><span class="scroll-arrow" aria-hidden="true">${icon('arrow')}</span></div>
        <ol class="stage-steps" id="scene-steps" aria-label="${escapeHtml(copy.stepLabel)}">${stepNames}</ol>
        <section class="map-copy" id="map-section" aria-labelledby="map-title" aria-hidden="true" inert>
          <h2 id="map-title"><span class="map-title-emphasis">${escapeHtml(copy.mapTitleEmphasis)}</span> ${escapeHtml(copy.mapTitleRest)}</h2>
          <p class="map-instruction-copy">${escapeHtml(copy.mapIntro)}</p>
          <label class="sr-only" for="country-picker">${escapeHtml(copy.countrySelectLabel)}</label>
          <select id="country-picker" class="sr-only" tabindex="-1"><option value="">${escapeHtml(copy.countryPrompt)}</option>${destinationOptions(copy)}</select>
          <div id="map-fallback" data-map-label="${escapeHtml(copy.mapLabel)}" hidden></div>
          <aside id="country-popup" class="country-popup" aria-label="${escapeHtml(copy.countryDetails)}" hidden></aside>
          <p class="map-attribution">${escapeHtml(copy.mapAttribution)}</p>
        </section>
      </div>
    </div>
    <div class="floating-controls">${homeMenu(copy)}</div>
    <div class="notice" id="notice" role="status" aria-live="polite" hidden><span id="notice-text"></span><button id="notice-close" type="button">${escapeHtml(copy.close)}</button></div>
  </main>`;
}

function legalContent(copy, docId) {
  const page = copy.legalPages[docId];
  if (!page) return `<main id="main-content" class="legal-page" tabindex="-1"><a href="${escapeHtml(homeUrl(copy.lang))}">${escapeHtml(copy.home)}</a><h1>${escapeHtml(copy.notFound)}</h1></main>`;
  const emailText = (value) => escapeHtml(value).replace(/aetbconseil@gmail\.com/g, '<a href="mailto:aetbconseil@gmail.com">aetbconseil@gmail.com</a>');
  return `<main id="main-content" class="legal-page" tabindex="-1"><a class="text-link back-link" href="${escapeHtml(homeUrl(copy.lang))}">${icon('arrow')} ${escapeHtml(copy.home)}</a>
    <p class="eyebrow">${escapeHtml(copy.legalHeading)}</p><h1>${escapeHtml(page.title)}</h1>
    <p class="legal-intro">${emailText(page.intro)}</p><div class="legal-sections">${page.sections.map(([heading, text]) => `<section><h2>${escapeHtml(heading)}</h2><p>${emailText(text)}</p></section>`).join('')}</div>
    ${page.action === 'reset-language' ? `<button class="secondary-button" id="reset-language" type="button">${escapeHtml(copy.resetLanguage)}</button>` : ''}</main>
    <footer class="site-footer legal-footer" id="site-footer"><div class="footer-main"><a class="footer-brand" href="${escapeHtml(homeUrl(copy.lang))}"><img src="${new URL('voyagego-logo-2x.png', document.baseURI).href}" width="1086" height="362" alt="VoyageGo"></a><nav class="footer-nav" aria-label="${escapeHtml(copy.footerLabel)}"><h2>${escapeHtml(copy.legalHeading)}</h2><ul>${copy.legal.map((link) => `<li><a href="${escapeHtml(legalUrl(copy.lang, link.id))}" data-legal="${link.id}">${escapeHtml(link.label)}</a></li>`).join('')}</ul></nav></div><div class="footer-meta"><span>© ${new Date().getFullYear()} VoyageGo</span></div></footer>
    <div class="floating-controls"><div class="back-top" id="back-top"><button type="button" aria-label="${escapeHtml(copy.top)}">${icon('up')}</button></div></div>`;
}

function setMetadata(copy, route) {
  const page = route?.type === 'legal' ? copy.legalPages[route.docId] : null;
  const account = route?.type === 'account';
  const platform = route && !page && !account ? route.type : null;
  document.documentElement.lang = copy.lang;
  document.documentElement.dir = copy.direction;
  const platformTitle = platform ? ({country:route.country?.names[copy.lang],prepare:copy.steps[1].title,explore:copy.steps[2].title,profile:copy.accountLabel,provider:'VoyageGo',listing:'VoyageGo',bookings:'VoyageGo',onboarding:'VoyageGo'}[platform]) : null;
  document.title = page ? `${page.title} — VoyageGo` : account ? `${copy.accountTitle} — VoyageGo` : platformTitle ? `${platformTitle} — VoyageGo` : `VoyageGo — ${copy.title}`;
  const description = page?.intro || (account ? copy.accountDescription : copy.description);
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = description;
  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.append(robots); }
  robots.content = page || account || (route?.type === 'country' && route.country.contentStatus !== 'published') || ['profile','provider','listing','bookings','onboarding'].includes(platform) ? 'noindex,follow' : 'index,follow';
  const canonical = document.querySelector('link[rel="canonical"]') || document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'canonical' }));
  canonical.href = page ? legalUrl(copy.lang, route.docId) : route?.type === 'country' ? homeUrl(copy.lang, route.country) : platform ? platformUrl(copy.lang, platform) : homeUrl(copy.lang);
  const updateMeta = (selector, content) => {
    let tag = document.querySelector(selector);
    if (!tag) {
      tag = document.createElement('meta');
      const [, attribute, value] = selector.match(/\[(name|property)="([^"]+)"\]/);
      tag.setAttribute(attribute, value);
      document.head.append(tag);
    }
    tag.content = content;
  };
  updateMeta('meta[property="og:title"]', document.title);
  updateMeta('meta[property="og:description"]', description);
  updateMeta('meta[property="og:url"]', canonical.href);
  localeCodes.forEach((locale) => {
    let alternate = document.querySelector(`link[hreflang="${locale}"]`);
    if (!alternate) { alternate = document.createElement('link'); alternate.rel = 'alternate'; alternate.hreflang = locale; document.head.append(alternate); }
    alternate.href = homeUrl(locale, route?.country || undefined);
  });
  const xDefault = document.querySelector('link[hreflang="x-default"]');
  if (xDefault) xDefault.href = route?.country ? homeUrl('fr', route.country) : new URL('./', document.baseURI).href;
}

function announce(message) {
  const notice = document.querySelector('#notice');
  if (!notice) return;
  document.querySelector('#notice-text').textContent = message;
  notice.hidden = false;
}

function bind(copy, page) {
  document.querySelectorAll('[data-language]').forEach((button) => button.addEventListener('click', () => {
    const locale = button.dataset.language;
    try { localStorage.setItem(preferenceKey, locale); } catch { /* The language still changes for this visit. */ }
    if (page?.type === 'legal') location.assign(legalUrl(locale, page.docId));
    else if (page?.type === 'account') location.assign(accountUrl(locale, page.view, page.returnTo));
    else if (page) location.assign(platformUrl(locale, page.type, page.step ? { step: page.step } : page.scope ? { scope: page.scope } : {}));
    else location.assign(homeUrl(locale));
  }));
  document.querySelector('#country-picker')?.addEventListener('change', (event) => {
    if (event.currentTarget.dataset.worldLoaded === 'true') return;
    const country = destinations.find((candidate) => candidate.iso3 === event.currentTarget.value);
    if (country?.status === 'content') location.assign(platformUrl(copy.lang, 'explore', { country: country.iso2 }));
    else if (country) announce(copy.comingSoonMessage);
  });
  document.querySelectorAll('#language-trigger').forEach((trigger) => trigger.addEventListener('click', () => {
    const menu = document.querySelector('#language-menu');
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!expanded));
    menu.hidden = expanded;
    if (!expanded) menu.querySelector('button')?.focus();
  }));
  document.querySelectorAll('#language-menu').forEach((menu) => menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      menu.hidden = true;
      const trigger = document.querySelector('#language-trigger');
      trigger?.setAttribute('aria-expanded', 'false');
      trigger?.focus();
    }
  }));

  const homeMenuRoot = document.querySelector('#home-menu');
  const homeMenuTrigger = document.querySelector('#home-menu-trigger');
  const homeMenuPanel = document.querySelector('#home-menu-panel');
  const homeLanguageTrigger = document.querySelector('#home-language-trigger');
  const homeLanguageMenu = document.querySelector('#home-language-menu');
  const homeMenuPrimary = document.querySelector('#home-menu-primary');
  const closeHomeMenu = ({ restoreFocus = false } = {}) => {
    if (!homeMenuPanel || !homeMenuTrigger) return;
    homeMenuPanel.hidden = true;
    homeLanguageMenu.hidden = true;
    homeMenuPrimary.hidden = false;
    homeMenuTrigger.setAttribute('aria-expanded', 'false');
    homeLanguageTrigger?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) homeMenuTrigger.focus();
  };
  homeMenuTrigger?.addEventListener('click', () => {
    const opening = homeMenuPanel.hidden;
    if (!opening) { closeHomeMenu(); return; }
    homeMenuPanel.hidden = false;
    homeMenuTrigger.setAttribute('aria-expanded', 'true');
    homeMenuPanel.querySelector('a, button')?.focus();
  });
  homeLanguageTrigger?.addEventListener('click', () => {
    homeMenuPrimary.hidden = true;
    homeLanguageMenu.hidden = false;
    homeLanguageTrigger.setAttribute('aria-expanded', 'true');
    homeLanguageMenu.querySelector('[data-language]')?.focus();
  });
  document.querySelector('#home-language-back')?.addEventListener('click', () => {
    homeLanguageMenu.hidden = true;
    homeMenuPrimary.hidden = false;
    homeLanguageTrigger.setAttribute('aria-expanded', 'false');
    homeLanguageTrigger.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (homeMenuPanel && !homeMenuPanel.hidden && !homeMenuRoot.contains(event.target)) closeHomeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && homeMenuPanel && !homeMenuPanel.hidden) closeHomeMenu({ restoreFocus: true });
  });
  document.querySelectorAll('[data-legal]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    const next = new URL(link.href);
    history.pushState({}, '', `${next.pathname}${next.search}`);
    render();
  }));
  document.querySelectorAll('[data-destination]').forEach((button) => button.addEventListener('click', () => {
    const country = destinations.find((candidate) => candidate.iso3 === button.dataset.destination);
    if (country?.status === 'content') location.assign(platformUrl(copy.lang, 'explore', { country: country.iso2 }));
    else {
      const picker = document.querySelector('#country-picker');
      if (picker?.querySelector(`option[value="${country?.iso3}"]`)) {
        picker.value = country.iso3;
        picker.dispatchEvent(new Event('change', { bubbles: true }));
      } else announce(copy.comingSoonMessage);
    }
  }));
  document.querySelector('#notice-close')?.addEventListener('click', () => { document.querySelector('#notice').hidden = true; });
  document.querySelector('#reset-language')?.addEventListener('click', () => {
    try { localStorage.removeItem(preferenceKey); } catch { /* Continue with browser language. */ }
    location.assign(new URL('./', document.baseURI));
  });
  const footer = document.querySelector('#site-footer');
  const backTop = document.querySelector('#back-top');
  if (footer && backTop && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => backTop.classList.toggle('is-visible', entry.isIntersecting), { rootMargin: '0px 0px 96px 0px' });
    observer.observe(footer);
  }
  document.querySelector('#back-top')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
}

async function render() {
  const generation = ++renderGeneration;
  cleanupGlobe();
  cleanupGlobe = () => {};
  cleanupAccount();
  cleanupAccount = () => {};
  cleanupHorizon();
  cleanupHorizon = () => {};
  cleanupPlatform();
  cleanupPlatform = () => {};
  const locale = localeFromPath();
  if (!locale) { location.replace(new URL(homeUrl(preferredLocale()), document.baseURI)); return; }
  const device = getDevice();
  document.documentElement.dataset.device = device;
  const { default: copy } = await import(`./${device}-${locale}.js`);
  if (generation !== renderGeneration) return;
  if (copy.lang !== locale) throw new Error(`Locale module mismatch: ${locale}`);
  const page = currentPage();
  const activeCountry = page?.country || countryFromPath();
  document.documentElement.toggleAttribute('data-country-experience', Boolean(activeCountry));
  if (activeCountry) {
    document.documentElement.style.setProperty('--country-primary', activeCountry.palette.primary);
    document.documentElement.style.setProperty('--country-secondary', activeCountry.palette.secondary);
    document.documentElement.style.setProperty('--country-accent', activeCountry.palette.accent);
  } else {
    ['--country-primary','--country-secondary','--country-accent'].forEach((name) => document.documentElement.style.removeProperty(name));
  }
  setMetadata(copy, page);
  if (page?.type === 'account') {
    app.innerHTML = header(copy, page);
    bind(copy, page);
    const { renderAccount, updateProfileBadge } = await import('./auth/account-ui.js');
    cleanupAccount = await renderAccount(app, copy, page.view, page.returnTo);
    await updateProfileBadge(copy);
    document.querySelector('#main-content')?.focus({ preventScroll: true });
    return;
  }
  if (page && page.type !== 'legal') {
    app.innerHTML = header(copy, page);
    bind(copy, page);
    const { renderPlatform } = await import('./platform/ui.js');
    cleanupPlatform = await renderPlatform(app, copy, page);
    const { updateProfileBadge } = await import('./auth/account-ui.js');
    await updateProfileBadge(copy);
    return;
  }
  app.innerHTML = page?.type === 'legal' ? `${header(copy, page)}${legalContent(copy, page.docId)}` : homeContent(copy);
  bind(copy, page);
  if (!page) {
    cleanupHorizon = mountHorizon(copy);
    Promise.all([import('./auth/account-ui.js'), import('./auth/client.js')]).then(async ([{ updateProfileBadge }, { readSession, signOut }]) => {
      updateProfileBadge(copy);
      const { session } = await readSession();
      if (!session?.user) return;
      const primary = document.querySelector('#home-menu-primary');
      if (!primary) return;
      primary.querySelector('[data-home-login]')?.remove();
      primary.querySelector('[data-home-signup]')?.remove();
      primary.insertAdjacentHTML('afterbegin', `<a href="${escapeHtml(accountUrl(copy.lang, 'profile'))}">${escapeHtml(copy.accountLabel)}</a><button type="button" data-home-signout>${escapeHtml(copy.signOut)}</button>`);
      primary.querySelector('[data-home-signout]')?.addEventListener('click', async () => {
        await signOut();
        location.reload();
      });
    }).catch(() => {});
    import('./globe.js').then(({ mountGlobe }) => mountGlobe(copy)).then((cleanup) => {
      if (generation !== renderGeneration) { cleanup(); return; }
      cleanupGlobe = cleanup;
    }).catch(() => {
      if (generation !== renderGeneration) return;
      const status = document.querySelector('#globe-status');
      if (status) status.textContent = copy.mapUnavailable;
      const fallback = document.querySelector('#map-fallback');
      if (fallback) fallback.hidden = false;
    });
  }
  window.scrollTo(0, 0);
  if (page) document.querySelector('#main-content')?.focus({ preventScroll: true });
}

window.addEventListener('popstate', render);
let resizeFrame = 0;
window.addEventListener('resize', () => {
  if (resizeFrame) return;
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0;
    if (localeFromPath() && getDevice() !== document.documentElement.dataset.device) render();
  });
});
render();
