import { destinations, localeCodes } from './data/countries.js';

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
  return null;
}

function homeUrl(locale) { return new URL(`${locale}/`, new URL('./', document.baseURI)).href; }
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

function menuItems(copy) {
  return localeCodes.map((locale) => `<li><button type="button" data-language="${locale}" lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}" ${locale === copy.lang ? 'aria-current="true"' : ''}><span class="language-symbol" aria-hidden="true">${{ fr: '◌', ar: '◉', en: '◎', es: '◍', pt: '◯' }[locale]}</span><span>${copy.languageNames[locale]}</span></button></li>`).join('');
}

function languageControl(copy) {
  return `<div class="language-dock"><button id="language-trigger" class="language-trigger" type="button" aria-label="${escapeHtml(copy.chooseLanguage)}" aria-expanded="false" aria-controls="language-menu">${icon('globe')}</button>
    <div id="language-menu" class="language-menu" hidden><p>${escapeHtml(copy.chooseLanguage)}</p><ul>${menuItems(copy)}</ul></div></div>`;
}

function header(copy) {
  return `<a class="skip-link" href="#main-content">${escapeHtml(copy.skip)}</a>
    <header class="secondary-header">
      <a class="brand" href="${escapeHtml(homeUrl(copy.lang))}" aria-label="VoyageGo — ${escapeHtml(copy.home)}"><img src="${new URL('voyagego-logo-2x.png', document.baseURI).href}" width="1086" height="362" alt="VoyageGo"></a>
      <div class="header-actions"><a class="profile-trigger header-profile" data-profile-link href="${escapeHtml(accountUrl(copy.lang, 'login'))}" aria-label="${escapeHtml(copy.login)}" title="${escapeHtml(copy.login)}">${icon('user')}<span>${escapeHtml(copy.login)}</span></a>${languageControl(copy)}</div>
    </header>`;
}

function destinationShortcuts(copy) {
  return destinations.map((country) => {
    const name = country.names[copy.lang];
    const status = country.status === 'available' ? copy.available : copy.comingSoon;
    const content = `<span class="destination-dot" aria-hidden="true"></span><span><bdi lang="${copy.lang}">${escapeHtml(name)}</bdi><small>${escapeHtml(status)}</small></span>${icon('arrow', 'destination-arrow')}`;
    return `<button class="destination-shortcut ${country.status === 'available' ? 'is-available' : ''}" type="button" data-destination="${country.iso3}" aria-label="${escapeHtml(name)} — ${escapeHtml(status)}">${content}</button>`;
  }).join('');
}

function destinationOptions(copy) {
  return destinations.map((country) => `<option value="${country.iso3}">${country.names[copy.lang]}</option>`).join('');
}

function homeContent(copy) {
  const stepIcons = ['compass', 'route', 'landscape'];
  return `<main id="main-content" tabindex="-1" class="immersive-page">
    <div id="globe-host" aria-hidden="true"></div>
    <div id="globe-interaction" aria-hidden="true"></div>
    <p id="globe-status" class="sr-only" role="status" aria-live="polite"></p>
    <p id="country-announcement" class="sr-only" role="status" aria-live="polite"></p>
    <a class="scene-brand" href="${escapeHtml(homeUrl(copy.lang))}" aria-label="VoyageGo — ${escapeHtml(copy.home)}"><img src="${new URL('voyagego-logo-2x.png', document.baseURI).href}" width="1086" height="362" alt="VoyageGo"></a>
    <section class="hero-scene" id="hero" aria-labelledby="hero-title">
      <div class="hero-copy reveal"><p class="eyebrow">${escapeHtml(copy.tag)}</p><h1 id="hero-title">${escapeHtml(copy.title)}</h1><p class="hero-intro">${escapeHtml(copy.intro)}</p><a class="scroll-prompt" href="#story">${escapeHtml(copy.scroll)} ${icon('arrow')}</a></div>
      <span class="hero-coordinate" aria-hidden="true">31° 47′ N&nbsp;&nbsp; 7° 05′ W</span>
    </section>
    <section class="story-scene" id="story" aria-labelledby="story-title">
      <div class="story-copy"><p class="eyebrow">${escapeHtml(copy.storyEyebrow)}</p><h2 id="story-title">${escapeHtml(copy.storyTitle)}</h2>
        <ol class="journey-steps" aria-label="${escapeHtml(copy.stepLabel)}">${copy.steps.map((step, index) => `<li class="journey-step reveal"><span class="step-glyph">${icon(stepIcons[index])}</span><div><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text)}</p></div><span class="step-index">0${index + 1}</span></li>`).join('')}</ol>
      </div>
      <span class="story-orbit" aria-hidden="true"></span>
    </section>
    <section class="map-scene" id="map-section" aria-labelledby="map-title">
      <div class="map-copy"><p class="eyebrow">${escapeHtml(copy.mapEyebrow)}</p><h2 id="map-title">${escapeHtml(copy.mapTitle)}</h2><p>${escapeHtml(copy.mapIntro)}</p>
        <label class="country-picker-label" for="country-picker">${escapeHtml(copy.countrySelectLabel)}</label>
        <select id="country-picker" aria-label="${escapeHtml(copy.countrySelectLabel)}"><option value="">${escapeHtml(copy.countryPrompt)}</option>${destinationOptions(copy)}</select>
        <div id="map-fallback" data-map-label="${escapeHtml(copy.mapLabel)}" hidden></div>
        <nav class="destination-shortcuts" aria-label="${escapeHtml(copy.destinationsLabel)}">${destinationShortcuts(copy)}</nav>
        <p class="map-attribution">${escapeHtml(copy.mapAttribution)}</p>
      </div>
      <aside id="country-popup" class="country-popup" aria-label="${escapeHtml(copy.countryDetails)}" hidden></aside>
      <span class="map-instruction" aria-hidden="true">${icon('globe')} ${escapeHtml(copy.mapHint)}</span>
    </section>
    <footer class="site-footer" id="site-footer">
      <div class="footer-main"><a class="footer-brand" href="${escapeHtml(homeUrl(copy.lang))}" aria-label="VoyageGo — ${escapeHtml(copy.home)}"><img src="${new URL('voyagego-logo-2x.png', document.baseURI).href}" width="1086" height="362" alt="VoyageGo"></a>
        <nav class="footer-nav" aria-label="${escapeHtml(copy.footerLabel)}"><h2>${escapeHtml(copy.legalHeading)}</h2><ul>${copy.legal.map((link) => `<li><a href="${escapeHtml(legalUrl(copy.lang, link.id))}" data-legal="${link.id}">${escapeHtml(link.label)}</a></li>`).join('')}</ul></nav>
      </div><div class="footer-meta"><span>© ${new Date().getFullYear()} VoyageGo</span></div>
    </footer>
    <div class="floating-controls"><a class="profile-trigger floating-profile" data-profile-link href="${escapeHtml(accountUrl(copy.lang, 'login'))}" aria-label="${escapeHtml(copy.login)}" title="${escapeHtml(copy.login)}">${icon('user')}</a>${languageControl(copy)}<div class="back-top" id="back-top"><button type="button" aria-label="${escapeHtml(copy.top)}" title="${escapeHtml(copy.top)}">${icon('up')}</button></div></div>
    <div class="notice" id="notice" role="status" aria-live="polite" hidden><span id="notice-text"></span><button id="notice-close" type="button">${escapeHtml(copy.close)}</button></div>
  </main>`;
}

function legalContent(copy, docId) {
  const page = copy.legalPages[docId];
  if (!page) return `<main id="main-content" class="legal-page" tabindex="-1"><a href="${escapeHtml(homeUrl(copy.lang))}">${escapeHtml(copy.home)}</a><h1>${escapeHtml(copy.notFound)}</h1></main>`;
  return `<main id="main-content" class="legal-page" tabindex="-1"><a class="text-link back-link" href="${escapeHtml(homeUrl(copy.lang))}">${icon('arrow')} ${escapeHtml(copy.home)}</a>
    <p class="eyebrow">${escapeHtml(copy.legalHeading)}</p><h1>${escapeHtml(page.title)}</h1><p class="legal-draft">${escapeHtml(copy.draft)}</p>
    <p class="legal-intro">${escapeHtml(page.intro)}</p><div class="legal-sections">${page.sections.map(([heading, text]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></section>`).join('')}</div>
    ${page.action === 'reset-language' ? `<button class="secondary-button" id="reset-language" type="button">${escapeHtml(copy.resetLanguage)}</button>` : ''}</main>
    <footer class="site-footer legal-footer" id="site-footer"><div class="footer-main"><a class="footer-brand" href="${escapeHtml(homeUrl(copy.lang))}"><img src="${new URL('voyagego-logo-2x.png', document.baseURI).href}" width="1086" height="362" alt="VoyageGo"></a><nav class="footer-nav" aria-label="${escapeHtml(copy.footerLabel)}"><h2>${escapeHtml(copy.legalHeading)}</h2><ul>${copy.legal.map((link) => `<li><a href="${escapeHtml(legalUrl(copy.lang, link.id))}" data-legal="${link.id}">${escapeHtml(link.label)}</a></li>`).join('')}</ul></nav></div><div class="footer-meta"><span>© ${new Date().getFullYear()} VoyageGo</span></div></footer>
    <div class="floating-controls"><div class="back-top" id="back-top"><button type="button" aria-label="${escapeHtml(copy.top)}">${icon('up')}</button></div></div>`;
}

function setMetadata(copy, route) {
  const page = route?.type === 'legal' ? copy.legalPages[route.docId] : null;
  const account = route?.type === 'account';
  document.documentElement.lang = copy.lang;
  document.documentElement.dir = copy.direction;
  document.title = page ? `${page.title} — VoyageGo` : account ? `${copy.accountTitle} — VoyageGo` : `VoyageGo — ${copy.title}`;
  const description = page?.intro || (account ? copy.accountDescription : copy.description);
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = description;
  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.append(robots); }
  robots.content = page || account ? 'noindex,follow' : 'index,follow';
  const canonical = document.querySelector('link[rel="canonical"]') || document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'canonical' }));
  canonical.href = page ? legalUrl(copy.lang, route.docId) : homeUrl(copy.lang);
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
    alternate.href = homeUrl(locale);
  });
  const xDefault = document.querySelector('link[hreflang="x-default"]');
  if (xDefault) xDefault.href = new URL('./', document.baseURI).href;
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
    else location.assign(homeUrl(locale));
  }));
  document.querySelector('#country-picker')?.addEventListener('change', (event) => {
    if (event.currentTarget.dataset.worldLoaded === 'true') return;
    const country = destinations.find((candidate) => candidate.iso3 === event.currentTarget.value);
    if (country?.status === 'available' && country.url) location.assign(country.url);
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
  document.querySelectorAll('[data-legal]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    const next = new URL(link.href);
    history.pushState({}, '', `${next.pathname}${next.search}`);
    render();
  }));
  document.querySelectorAll('[data-destination]').forEach((button) => button.addEventListener('click', () => {
    const country = destinations.find((candidate) => candidate.iso3 === button.dataset.destination);
    if (country?.status === 'available' && country.url) location.assign(country.url);
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
  document.querySelector('#back-top button')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
}

async function render() {
  cleanupGlobe();
  cleanupGlobe = () => {};
  cleanupAccount();
  cleanupAccount = () => {};
  const locale = localeFromPath();
  if (!locale) { location.replace(new URL(homeUrl(preferredLocale()), document.baseURI)); return; }
  const { default: copy } = await import(`./${getDevice()}-${locale}.js`);
  if (copy.lang !== locale) throw new Error(`Locale module mismatch: ${locale}`);
  document.documentElement.dataset.device = getDevice();
  const page = currentPage();
  setMetadata(copy, page);
  if (page?.type === 'account') {
    app.innerHTML = header(copy);
    bind(copy, page);
    const { renderAccount, updateProfileBadge } = await import('./auth/account-ui.js');
    cleanupAccount = await renderAccount(app, copy, page.view, page.returnTo);
    await updateProfileBadge(copy);
    document.querySelector('#main-content')?.focus({ preventScroll: true });
    return;
  }
  app.innerHTML = page?.type === 'legal' ? `${header(copy)}${legalContent(copy, page.docId)}` : homeContent(copy);
  bind(copy, page);
  if (!page) {
    import('./auth/account-ui.js').then(({ updateProfileBadge }) => updateProfileBadge(copy)).catch(() => {});
    import('./globe.js').then(({ mountGlobe }) => mountGlobe(copy)).then((cleanup) => { cleanupGlobe = cleanup; }).catch(() => {
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
window.addEventListener('resize', () => {
  if (localeFromPath() && getDevice() !== document.documentElement.dataset.device) render();
});
render();
