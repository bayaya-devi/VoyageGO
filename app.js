import { destinations, mapBounds, mapDataUrl } from './data/countries.js';

const app = document.querySelector('#app');
const languageCodes = ['fr', 'en', 'ar'];
const preferenceKey = 'voyagego-language';
const iconPaths = {
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-7 16-7 16 0"/>',
  up: '<path d="M12 20V4m-7 7 7-7 7 7"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h2a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h0"/>',
  landscape: '<path d="m3 19 6-8 4 5 3-4 5 7H3Z"/><path d="M13 8h.01M3 21h18"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
};

function icon(name, className = '') {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function localeFromPath() {
  const candidate = location.pathname.split('/').filter(Boolean).at(-1);
  return languageCodes.includes(candidate) ? candidate : null;
}

function preferredLocale() {
  try {
    const saved = localStorage.getItem(preferenceKey);
    if (languageCodes.includes(saved)) return saved;
  } catch { /* Storage can be disabled; the site still works. */ }
  for (const candidate of navigator.languages || [navigator.language]) {
    const code = candidate?.toLowerCase().split('-')[0];
    if (languageCodes.includes(code)) return code;
  }
  return 'fr';
}

function getDevice() {
  return matchMedia('(max-width: 800px)').matches ? 'telephone' : 'ordinateur';
}

function currentPage() {
  const params = new URLSearchParams(location.search);
  return params.get('page') === 'legal' ? params.get('doc') : null;
}

function statusLabel(country, copy) {
  return country.status === 'available' ? copy.openCountry : copy.comingSoon;
}

function projection([longitude, latitude]) {
  const x = ((longitude - mapBounds.west) / (mapBounds.east - mapBounds.west)) * 1000;
  const y = ((mapBounds.north - latitude) / (mapBounds.north - mapBounds.south)) * 620;
  return [x, y];
}

function ringPath(ring) {
  return ring.map((coordinate, index) => {
    const [x, y] = projection(coordinate);
    return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ') + 'Z';
}

function geometryPath(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((polygon) => polygon.map(ringPath).join(' ')).join(' ');
}

function renderMap(copy) {
  const stage = document.querySelector('#map-stage');
  const mapUrl = new URL(mapDataUrl.replace(/^\.\.\//, './'), import.meta.url);
  fetch(mapUrl)
    .then((response) => {
      if (!response.ok) throw new Error('Map data unavailable');
      return response.json();
    })
    .then((geojson) => {
      if (!stage.isConnected) return;
      const destinationByIso = new Map(destinations.map((country) => [country.iso3, country]));
      const paths = geojson.features.map((feature) => {
        const iso = feature.properties['ISO3166-1-Alpha-3'];
        const destination = destinationByIso.get(iso);
        const available = destination?.status === 'available';
        const selectable = Boolean(destination);
        const name = destination?.names[copy.lang] || feature.properties.name;
        const label = selectable ? `${name} — ${statusLabel(destination, copy)}` : name;
        return `<path class="country ${destination?.visual.mapClass || ''}"
          d="${geometryPath(feature.geometry)}" fill-rule="evenodd"
          ${selectable ? `data-destination="${destination.id}" role="button" tabindex="0" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"'}
          ${available ? 'data-available="true"' : ''}/>`;
      }).join('');
      const shadowPaths = paths.replace(/ (?:data-destination|role|tabindex|aria-label|data-available)="[^"]*"/g, '');
      stage.innerHTML = `<svg class="world-map" viewBox="0 0 1000 620" role="group" aria-labelledby="map-label">
        <title id="map-label">${escapeHtml(copy.mapLabel)}</title>
        <defs>
          <linearGradient id="land-shade" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#d7c49d"/><stop offset=".55" stop-color="#9ebd9d"/><stop offset="1" stop-color="#5f9989"/></linearGradient>
          <linearGradient id="ocean-shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#8bc9d0"/><stop offset="1" stop-color="#4e9ca4"/></linearGradient>
          <filter id="terrain-shadow" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="7"/></filter>
        </defs>
        <path class="ocean" d="M0 0h1000v620H0z"/>
        <path class="ocean-glow" d="M20 480c170-105 256-45 397-119 123-65 226-92 563-72v331H20Z"/>
        <g class="land-shadow" transform="translate(0 9)" filter="url(#terrain-shadow)">${shadowPaths.replaceAll('class="country ', 'class="country country--shadow ')}</g>
        <g class="land-mass">${paths}</g>
        <g class="terrain-lines" aria-hidden="true"><path d="M318 150c38-30 91-34 128-11m-150 35c46-36 107-39 155-13m-157 48c55-38 116-42 170-17M405 367c47-23 102-20 143 4m-166 16c55-29 113-26 164 2"/></g>
      </svg>
      <div class="map-light" aria-hidden="true"></div>`;
      stage.querySelectorAll('[data-destination]').forEach((countryPath) => {
        const activate = () => openDestination(countryPath.dataset.destination, copy);
        countryPath.addEventListener('click', activate);
        countryPath.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
        });
      });
    })
    .catch(() => {
      if (stage.isConnected) {
        stage.innerHTML = `<p class="map-fallback" role="status">${escapeHtml(copy.mapUnavailable)}</p>`;
      }
    });
}

function openDestination(id, copy) {
  const country = destinations.find((item) => item.id === id);
  if (country?.status === 'available' && country.url) location.assign(country.url);
  else announce(copy.comingSoonMessage || copy.mapIntro);
}

function announce(message) {
  const notice = document.querySelector('#notice');
  if (!notice) return;
  document.querySelector('#notice-text').textContent = message;
  notice.hidden = false;
}

function destinationLinks(copy) {
  return destinations.map((country) => {
    const available = country.status === 'available';
    const label = country.names[copy.lang];
    const content = `<span class="destination-mark" aria-hidden="true"></span>
      <span class="destination-copy"><bdi class="destination-name">${escapeHtml(label)}</bdi>
      <span class="destination-status">${escapeHtml(statusLabel(country, copy))}</span></span>
      ${available ? icon('arrow', 'destination-arrow') : '<span class="destination-soon" aria-hidden="true">· · ·</span>'}`;
    return available
      ? `<a class="destination-link is-available" href="${escapeHtml(country.url)}" lang="${copy.lang}">${content}</a>`
      : `<button class="destination-link" type="button" data-destination="${country.id}" lang="${copy.lang}" aria-label="${escapeHtml(label)} — ${escapeHtml(statusLabel(country, copy))}">${content}</button>`;
  }).join('');
}

function languageOptions(copy) {
  const options = [
    ['fr', 'Français'], ['en', 'English'], ['ar', 'العربية'],
  ];
  return options.map(([code, label]) => `<option value="${code}" ${copy.lang === code ? 'selected' : ''} lang="${code}">${label}</option>`).join('');
}

function header(copy) {
  return `<a class="skip-link" href="#main-content">${escapeHtml(copy.skip)}</a>
    <header class="site-header">
      <a class="brand" href="${escapeHtml(homeUrl(copy.lang))}" aria-label="VoyageGo — ${escapeHtml(copy.home)}">
        <img src="./voyagego-logo-2x.png" width="1086" height="362" alt="VoyageGo" fetchpriority="high">
      </a>
      <div class="header-controls">
        <label class="language-control"><span class="sr-only">${escapeHtml(copy.language)}</span>${icon('globe')}
          <select id="language-select" aria-label="${escapeHtml(copy.language)}">${languageOptions(copy)}</select>
        </label>
        <button class="account-button" id="login-button" type="button" aria-label="${escapeHtml(copy.login)}">
          ${icon('user')}<span>${escapeHtml(copy.login)}</span>
        </button>
      </div>
    </header>`;
}

function homeContent(copy) {
  const stepIcons = ['compass', 'route', 'landscape'];
  return `<main id="main-content" tabindex="-1">
      <section class="opening" aria-labelledby="hero-title">
        <div class="opening-copy">
          <p class="eyebrow reveal">${escapeHtml(copy.tag)}</p>
          <h1 class="reveal" id="hero-title">${escapeHtml(copy.title)}</h1>
          <p class="opening-intro reveal">${escapeHtml(copy.intro)}</p>
          <a class="primary-link reveal" href="#destinations">${escapeHtml(copy.cta)} ${icon('arrow')}</a>
        </div>
        <a class="opening-scroll" href="#destinations" aria-label="${escapeHtml(copy.scroll)}">${icon('arrow')}<span>${escapeHtml(copy.scroll)}</span></a>
      </section>
      <section class="destination-section" id="destinations" aria-labelledby="destination-title">
        <div class="section-heading reveal"><p class="eyebrow">VoyageGo</p>
          <h2 id="destination-title">${escapeHtml(copy.mapTitle)}</h2><p>${escapeHtml(copy.mapIntro)}</p></div>
        <div class="map-composition">
          <div class="map-orbit map-orbit--outer" aria-hidden="true"></div>
          <div class="map-orbit map-orbit--inner" aria-hidden="true"></div>
          <div class="map-stage" id="map-stage" aria-label="${escapeHtml(copy.mapLabel)}">
            <div class="map-loading" aria-hidden="true"><span></span><span></span><span></span></div>
          </div>
          <div class="map-caption"><span class="caption-line"></span>${escapeHtml(copy.mapAttribution)}</div>
        </div>
        <nav class="destination-list reveal" aria-label="${escapeHtml(copy.destinationsLabel)}">${destinationLinks(copy)}</nav>
      </section>
      <section class="story-section" aria-labelledby="story-title">
        <div class="story-heading reveal"><p class="eyebrow">${escapeHtml(copy.storyEyebrow)}</p><h2 id="story-title">${escapeHtml(copy.storyTitle)}</h2></div>
        <ol class="journey-steps" aria-label="${escapeHtml(copy.stepLabel)}">
          ${copy.steps.map((step, index) => `<li class="journey-step reveal">
            <span class="step-index">0${index + 1}</span><span class="step-glyph">${icon(stepIcons[index])}</span>
            <div><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text)}</p></div>
          </li>`).join('')}
        </ol>
      </section>
    </main>`;
}

function legalContent(copy, docId) {
  const page = copy.legalPages[docId];
  if (!page) return `<main id="main-content" class="legal-page" tabindex="-1"><a class="text-link" href="${escapeHtml(homeUrl(copy.lang))}">${escapeHtml(copy.home)}</a><h1>${escapeHtml(copy.notFound)}</h1></main>`;
  return `<main id="main-content" class="legal-page" tabindex="-1">
    <a class="text-link back-link" href="${escapeHtml(homeUrl(copy.lang))}">${icon('arrow')} ${escapeHtml(copy.home)}</a>
    <p class="eyebrow">${escapeHtml(copy.legalHeading)}</p>
    <h1>${escapeHtml(page.title)}</h1>
    <p class="legal-draft">${escapeHtml(copy.draft)}</p>
    <p class="legal-intro">${escapeHtml(page.intro)}</p>
    <div class="legal-sections">${page.sections.map(([heading, text]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></section>`).join('')}</div>
    ${page.action === 'reset-language' ? `<button class="secondary-button" id="reset-language" type="button">${escapeHtml(copy.resetLanguage)}</button>` : ''}
  </main>`;
}

function footer(copy) {
  return `<footer class="site-footer" id="site-footer">
    <div class="footer-main">
      <div class="footer-brand-block"><img src="./voyagego-logo-2x.png" width="1086" height="362" alt="VoyageGo" loading="lazy"><p>${escapeHtml(copy.footerLead)}</p></div>
      <div class="footer-nav-block"><h2>${escapeHtml(copy.legalHeading)}</h2>
        <nav aria-label="${escapeHtml(copy.footerLabel)}"><ul>${copy.legal.map((link) => `<li><a href="${escapeHtml(legalUrl(copy.lang, link.id))}" data-legal="${link.id}">${escapeHtml(link.label)}</a></li>`).join('')}</ul></nav>
      </div>
      <a class="footer-home" href="${escapeHtml(homeUrl(copy.lang))}">${escapeHtml(copy.home)} ${icon('arrow')}</a>
    </div>
    <div class="footer-meta"><span>© ${new Date().getFullYear()} VoyageGo</span><span>${escapeHtml(copy.footerNote)}</span></div>
  </footer>`;
}

function homeUrl(locale) {
  return new URL(`${locale}/`, new URL('./', document.baseURI)).href;
}

function legalUrl(locale, docId) {
  const url = new URL(homeUrl(locale));
  url.search = new URLSearchParams({ page: 'legal', doc: docId });
  return url.href;
}

function setMetadata(copy, docId) {
  const page = docId ? copy.legalPages[docId] : null;
  document.documentElement.lang = copy.lang;
  document.documentElement.dir = copy.direction;
  document.title = page ? `${page.title} — VoyageGo` : `VoyageGo — ${copy.title}`;
  let description = page?.intro || copy.description;
  if (!description) description = copy.title;
  let meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = description;
  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.append(robots); }
  robots.content = page ? 'noindex,follow' : 'index,follow';
  const updateMeta = (selector, content) => {
    let element = document.querySelector(selector);
    if (!element) {
      element = document.createElement('meta');
      const [attribute, value] = selector.match(/\[(name|property)="([^"]+)"\]/).slice(1);
      element.setAttribute(attribute, value);
      document.head.append(element);
    }
    element.content = content;
  };
  updateMeta('meta[property="og:title"]', document.title);
  updateMeta('meta[property="og:description"]', description);
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
  canonical.href = page ? legalUrl(copy.lang, docId) : homeUrl(copy.lang);
  updateMeta('meta[property="og:url"]', canonical.href);
  languageCodes.forEach((locale) => {
    let alternate = document.querySelector(`link[hreflang="${locale}"]`);
    if (!alternate) { alternate = document.createElement('link'); alternate.rel = 'alternate'; alternate.hreflang = locale; document.head.append(alternate); }
    alternate.href = homeUrl(locale);
  });
  let xDefault = document.querySelector('link[hreflang="x-default"]');
  if (!xDefault) { xDefault = document.createElement('link'); xDefault.rel = 'alternate'; xDefault.hreflang = 'x-default'; document.head.append(xDefault); }
  xDefault.href = new URL('./', document.baseURI).href;
}

function bind(copy) {
  const select = document.querySelector('#language-select');
  select?.addEventListener('change', () => {
    try { localStorage.setItem(preferenceKey, select.value); } catch { /* Language switch still works without storage. */ }
    const page = currentPage();
    location.assign(page ? legalUrl(select.value, page) : homeUrl(select.value));
  });

  document.querySelector('#login-button')?.addEventListener('click', () => announce(copy.loginUnavailable));
  document.querySelector('#notice-close')?.addEventListener('click', () => { document.querySelector('#notice').hidden = true; });
  document.querySelectorAll('[data-destination]').forEach((control) => {
    control.addEventListener('click', () => openDestination(control.dataset.destination, copy));
  });
  document.querySelectorAll('[data-legal]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const next = new URL(link.href);
      history.pushState({}, '', `${next.pathname}${next.search}`);
      render();
    });
  });
  document.querySelector('#reset-language')?.addEventListener('click', () => {
    try { localStorage.removeItem(preferenceKey); } catch { /* Browser storage is optional. */ }
    location.assign(new URL('./', document.baseURI));
  });

  const footer = document.querySelector('#site-footer');
  const backTop = document.querySelector('#back-top');
  if (footer && backTop && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => backTop.classList.toggle('is-visible', entry.isIntersecting), { rootMargin: '0px 0px 120px 0px' });
    observer.observe(footer);
  }
  document.querySelector('#back-top button')?.addEventListener('click', () => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
  });

  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.14 });
    document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
  } else {
    document.querySelectorAll('.reveal').forEach((element) => element.classList.add('is-visible'));
  }
}

async function render() {
  const explicitLocale = localeFromPath();
  if (!explicitLocale) {
    location.replace(new URL(homeUrl(preferredLocale()), document.baseURI));
    return;
  }
  const moduleName = `${getDevice()}-${explicitLocale}.js`;
  const { default: copy } = await import(`./${moduleName}`);
  if (copy.lang !== explicitLocale) throw new Error(`Locale module mismatch: ${moduleName}`);
  document.documentElement.dataset.device = getDevice();
  const page = currentPage();
  setMetadata(copy, page);
  app.innerHTML = `${header(copy)}${page ? legalContent(copy, page) : homeContent(copy)}${footer(copy)}
    <div class="back-top" id="back-top"><button type="button" aria-label="${escapeHtml(copy.top)}" title="${escapeHtml(copy.top)}">${icon('up')}</button></div>
    <div class="notice" id="notice" role="status" aria-live="polite" hidden><span id="notice-text"></span><button id="notice-close" type="button">${escapeHtml(copy.close)}</button></div>`;
  bind(copy);
  if (!page) renderMap(copy);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('popstate', render);
window.addEventListener('resize', () => {
  if (localeFromPath() && getDevice() !== document.documentElement.dataset.device) render();
});
document.documentElement.dataset.device = getDevice();
render();
