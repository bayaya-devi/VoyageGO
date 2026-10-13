import {
  getAuthClient, readProfile, readSession, requestPasswordReset, signIn, signInWithGoogle,
  signOut, signUp, subscribeToAuthChanges, updatePassword, updateProfile,
} from './client.js';
import { isValidEmail, isValidPassword, safeReturnTo } from './validation.js';

const languageLabels = { fr: 'Français', ar: 'العربية', en: 'English', es: 'Español', pt: 'Português' };
const recoveryKey = 'voyagego.password-recovery.pending';
const photoMemoryKey = 'voyagego.account-photo.last';
const accountPhotos = [
  {
    id: 'marrakesh', src: new URL('../assets/account-landscapes/marrakesh-medina.webp', import.meta.url).href,
    location: { fr: 'Médina de Marrakech, Maroc', en: 'Marrakesh Medina, Morocco', ar: 'المدينة العتيقة بمراكش، المغرب', es: 'Medina de Marrakech, Marruecos', pt: 'Medina de Marraquexe, Marrocos' },
    author: 'Val Vesa', source: 'https://unsplash.com/photos/colorful-marketplace-with-textiles-and-crafts-RYWS-IZLRKU', position: 'center 52%',
  },
  {
    id: 'paris', src: new URL('../assets/account-landscapes/paris-eiffel.webp', import.meta.url).href,
    location: { fr: 'Tour Eiffel, Paris, France', en: 'Eiffel Tower, Paris, France', ar: 'برج إيفل، باريس، فرنسا', es: 'Torre Eiffel, París, Francia', pt: 'Torre Eiffel, Paris, França' },
    author: 'Lisa', source: 'https://unsplash.com/photos/eiffel-tower-at-paris-france-MGDIKg9Bw5U', position: 'center 48%',
  },
  {
    id: 'patagonia', src: new URL('../assets/account-landscapes/patagonia-el-bolson.webp', import.meta.url).href,
    location: { fr: 'El Bolsón, Patagonie, Argentine', en: 'El Bolsón, Patagonia, Argentina', ar: 'إل بولسون، باتاغونيا، الأرجنتين', es: 'El Bolsón, Patagonia, Argentina', pt: 'El Bolsón, Patagónia, Argentina' },
    author: 'Hector Ramon Perez', source: 'https://unsplash.com/photos/landscape-photography-of-blue-body-of-water-viewing-mountain-under-blue-and-white-sky-FIlMQrXb7ig', position: 'center 55%',
  },
  {
    id: 'rome', src: new URL('../assets/account-landscapes/rome-colosseum.webp', import.meta.url).href,
    location: { fr: 'Colisée, Rome, Italie', en: 'Colosseum, Rome, Italy', ar: 'الكولوسيوم، روما، إيطاليا', es: 'Coliseo, Roma, Italia', pt: 'Coliseu, Roma, Itália' },
    author: 'Ruben Ramirez', source: 'https://unsplash.com/photos/colosseum-rome-nAb-SFzL1GM', position: 'center 50%',
  },
];

function photoForSession(view) {
  const sessionKey = `voyagego.account-photo.${view}`;
  try {
    const remembered = sessionStorage.getItem(sessionKey);
    const existing = accountPhotos.find((photo) => photo.id === remembered);
    if (existing) return existing;
  } catch { /* Continue with a transient photo if storage is unavailable. */ }
  let previous = null;
  try { previous = localStorage.getItem(photoMemoryKey); } catch { /* Storage may be unavailable. */ }
  const choices = accountPhotos.filter((photo) => photo.id !== previous);
  const selected = choices[Math.floor(Math.random() * choices.length)] || accountPhotos[0];
  try {
    sessionStorage.setItem(sessionKey, selected.id);
    localStorage.setItem(photoMemoryKey, selected.id);
  } catch { /* The form still works with an in-memory selection. */ }
  return selected;
}

function photoMarkup(copy, authCopy, photo) {
  return `<figure class="account-backdrop" style="--account-photo-position:${photo.position}"><img src="${escapeHtml(photo.src)}" alt="" decoding="async" fetchpriority="high"><div class="account-photo-shade" aria-hidden="true"></div></figure><div class="account-photo-caption"><strong lang="${copy.lang}" dir="auto">${escapeHtml(photo.location[copy.lang])}</strong><a href="${escapeHtml(photo.source)}" target="_blank" rel="noreferrer noopener">${escapeHtml(authCopy.photoBy)} ${escapeHtml(photo.author)} · Unsplash</a></div>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function accountUrl(locale, view, returnTo = null) {
  const url = new URL(`${locale}/`, document.baseURI);
  url.searchParams.set('page', 'account');
  url.searchParams.set('view', view);
  const safe = safeReturnTo(returnTo);
  if (safe) url.searchParams.set('returnTo', safe);
  return url.href;
}

function field(id, label, type = 'text', options = {}) {
  const { autocomplete = '', required = true, maxLength = null, value = '', describedBy = '' } = options;
  return `<div class="account-field"><label for="${id}">${escapeHtml(label)}</label><div class="account-input-wrap"><input id="${id}" name="${id}" type="${type}" value="${escapeHtml(value)}" ${autocomplete ? `autocomplete="${autocomplete}"` : ''} ${maxLength ? `maxlength="${maxLength}"` : ''} ${describedBy ? `aria-describedby="${describedBy}"` : ''} ${required ? 'required' : ''}></div></div>`;
}

function passwordField(id, label, copy, autocomplete, confirmation = false) {
  return `<div class="account-field"><label for="${id}">${escapeHtml(label)}</label><div class="account-input-wrap"><input id="${id}" name="${id}" type="password" autocomplete="${autocomplete}" minlength="15" maxlength="128" ${confirmation ? '' : 'aria-describedby="password-rules"'} required><button class="password-toggle" type="button" data-password-toggle="${id}" aria-label="${escapeHtml(copy.showPassword)}" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div>`;
}

function passwordRules(copy) {
  return `<fieldset class="password-rules" id="password-rules"><legend>${escapeHtml(copy.passwordRules)}</legend><ul><li data-rule="length">${escapeHtml(copy.ruleLength)}</li></ul></fieldset>`;
}

function googleMark() {
  return `<svg class="google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.6-2.1 4.8-4.4 6.2l7.1 5.5c4.1-3.8 6.5-9.3 6.5-15.4Z"/><path fill="#34A853" d="M24 44c5.9 0 10.9-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.5-9.1l-7.3 5.5C7.8 39 15.3 44 24 44Z"/><path fill="#FBBC05" d="M11.5 26.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1l-7.3-5.5C2.8 15.3 2 18.5 2 22s.8 6.7 2.2 9.6l7.3-5.5Z"/><path fill="#EA4335" d="M24 10.8c3.2 0 6 1.1 8.2 3.2l6.1-6.1C34.6 4.2 29.6 2 24 2 15.3 2 7.8 7 4.2 14.4l7.3 5.5c1.8-5.2 6.7-9.1 12.5-9.1Z"/></svg>`;
}

function providerButton(copy, enabled) {
  return `<button class="google-button" type="button" data-auth-action="google" ${enabled ? '' : 'disabled'}>${googleMark()}<span>${escapeHtml(copy.continueGoogle)}</span></button>`;
}

function viewMarkup(copy, authCopy, view, configured, session, googleEnabled) {
  if (view === 'profile' && session?.user) {
    return `<section class="account-panel" aria-labelledby="account-title"><p class="eyebrow">VoyageGo</p><h1 id="account-title">${escapeHtml(authCopy.profileTitle)}</h1><p class="account-intro">${escapeHtml(authCopy.authIntro)}</p><div class="account-status"><span>${escapeHtml(authCopy.emailStatus)}</span><strong>${escapeHtml(session.user.email_confirmed_at || session.user.confirmed_at ? authCopy.emailVerified : authCopy.emailPending)}</strong></div><form class="account-form" id="profile-form" novalidate>${field('first-name', authCopy.firstName, 'text', { value: session.profile?.first_name ?? '', autocomplete: 'given-name', maxLength: 80 })}${field('last-name', authCopy.lastName, 'text', { value: session.profile?.last_name ?? '', autocomplete: 'family-name', maxLength: 80 })}<div class="account-field"><label for="preferred-locale">${escapeHtml(authCopy.preferredLanguage)}</label><select id="preferred-locale" name="preferred-locale">${Object.entries(languageLabels).map(([code, name]) => `<option value="${code}" ${code === (session.profile?.preferred_locale || copy.lang) ? 'selected' : ''}>${name}</option>`).join('')}</select></div><p class="account-message" id="account-message" role="status" aria-live="polite"></p><button class="account-primary" type="submit" ${configured ? '' : 'disabled'}>${escapeHtml(authCopy.saveProfile)}</button><button class="account-secondary" type="button" data-auth-action="signout">${escapeHtml(authCopy.signOut)}</button></form></section>`;
  }

  const titles = { login: authCopy.signInTitle, signup: authCopy.signUpTitle, forgot: authCopy.forgotTitle, reset: authCopy.resetTitle, callback: authCopy.pending };
  let form = '';
  if (view === 'login') {
    form = `<form class="account-form" id="account-form" data-form="login" novalidate>${field('email', authCopy.email, 'email', { autocomplete: 'email' })}${passwordField('password', authCopy.password, authCopy, 'current-password')}<a class="account-quiet-link" href="${escapeHtml(accountUrl(copy.lang, 'forgot'))}">${escapeHtml(authCopy.forgot)}</a><p class="account-message" id="account-message" role="status" aria-live="polite"></p><button class="account-primary" type="submit" ${configured ? '' : 'disabled'}>${escapeHtml(authCopy.signIn)}</button><p class="account-switch">${escapeHtml(authCopy.noAccount)} <a href="${escapeHtml(accountUrl(copy.lang, 'signup'))}">${escapeHtml(authCopy.createAccount)}</a></p></form>`;
  } else if (view === 'signup') {
    form = `<form class="account-form" id="account-form" data-form="signup" novalidate>${field('first-name', authCopy.firstName, 'text', { autocomplete: 'given-name', maxLength: 80 })}${field('last-name', authCopy.lastName, 'text', { autocomplete: 'family-name', maxLength: 80 })}${field('email', authCopy.email, 'email', { autocomplete: 'email' })}${passwordField('password', authCopy.password, authCopy, 'new-password')}${passwordRules(authCopy)}${passwordField('confirm-password', authCopy.confirmPassword, authCopy, 'new-password', true)}<p class="account-message" id="account-message" role="status" aria-live="polite"></p><button class="account-primary" type="submit" ${configured ? '' : 'disabled'}>${escapeHtml(authCopy.signUp)}</button><p class="account-switch">${escapeHtml(authCopy.hasAccount)} <a href="${escapeHtml(accountUrl(copy.lang, 'login'))}">${escapeHtml(authCopy.signIn)}</a></p></form>`;
  } else if (view === 'forgot') {
    form = `<form class="account-form" id="account-form" data-form="forgot" novalidate>${field('email', authCopy.email, 'email', { autocomplete: 'email' })}<p class="account-message" id="account-message" role="status" aria-live="polite"></p><button class="account-primary" type="submit" ${configured ? '' : 'disabled'}>${escapeHtml(authCopy.sendReset)}</button><a class="account-switch" href="${escapeHtml(accountUrl(copy.lang, 'login'))}">${escapeHtml(authCopy.backToSignIn)}</a></form>`;
  } else if (view === 'reset') {
    form = `<form class="account-form" id="account-form" data-form="reset" novalidate>${passwordField('password', authCopy.password, authCopy, 'new-password')}${passwordRules(authCopy)}${passwordField('confirm-password', authCopy.confirmPassword, authCopy, 'new-password', true)}<p class="account-message" id="account-message" role="status" aria-live="polite"></p><button class="account-primary" type="submit" ${configured ? '' : 'disabled'}>${escapeHtml(authCopy.updatePassword)}</button></form>`;
  } else {
    form = `<div class="account-message" id="account-message" role="status" aria-live="polite">${escapeHtml(authCopy.pending)}</div>`;
  }

  const showGoogle = googleEnabled && ['login', 'signup'].includes(view);
  return `<section class="account-panel" aria-labelledby="account-title"><p class="eyebrow">VoyageGo</p><h1 id="account-title">${escapeHtml(titles[view] || authCopy.signInTitle)}</h1><p class="account-intro">${escapeHtml(authCopy.authIntro)}</p>${showGoogle ? `<div class="account-provider">${providerButton(authCopy, configured)}<p class="account-divider"><span>${escapeHtml(authCopy.continueEmail)}</span></p></div>` : ''}${form}<a class="account-home-link" href="${escapeHtml(new URL(`${copy.lang}/`, document.baseURI).href)}">${escapeHtml(authCopy.backHome)}</a></section>`;
}

function criteria(password, copy) {
  const count = [...password].length;
  const checks = { length: count >= 15 && count <= 128 };
  document.querySelectorAll('[data-rule]').forEach((item) => {
    const valid = Boolean(checks[item.dataset.rule]);
    item.classList.toggle('is-valid', valid);
    item.setAttribute('aria-label', `${valid ? '✓ ' : ''}${item.textContent}`);
  });
  return isValidPassword(password);
}

function setMessage(message, isError = false) {
  const target = document.querySelector('#account-message');
  if (!target) return;
  target.textContent = message;
  target.setAttribute('role', isError ? 'alert' : 'status');
  target.classList.toggle('is-error', isError);
  target.classList.toggle('is-success', !isError);
}

function setBusy(form, busy, copy) {
  const submit = form.querySelector('[type="submit"]');
  if (!submit) return;
  if (!submit.dataset.idleLabel) submit.dataset.idleLabel = submit.textContent;
  submit.disabled = busy || !form.dataset.configured;
  submit.textContent = busy ? copy.pending : submit.dataset.idleLabel;
}

function hasRecoveryFlag() {
  try { if (sessionStorage.getItem(recoveryKey) === 'true') return true; } catch { /* Storage can be disabled by the browser. */ }
  return Boolean(new URLSearchParams(location.search).get('token'))
    || new URLSearchParams(location.search).get('type') === 'recovery'
    || new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
}

function formMessage(error, copy, authCopy, fallback) {
  if (error?.message === 'AUTH_UNAVAILABLE') return authCopy.unavailableHelp;
  if (error?.message === 'INVALID_PASSWORD') return authCopy.invalidPassword;
  if (error?.message === 'RECOVERY_SESSION_REQUIRED') return authCopy.recoveryInvalid;
  return fallback;
}

async function bindForm(app, copy, authCopy, view, configured, session, returnTo) {
  app.querySelectorAll('[data-password-toggle]').forEach((button) => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.setAttribute('aria-label', reveal ? authCopy.hidePassword : authCopy.showPassword);
    button.setAttribute('aria-pressed', String(reveal));
  }));

  const password = app.querySelector('#password');
  password?.addEventListener('input', () => criteria(password.value, authCopy));

  const google = app.querySelector('[data-auth-action="google"]');
  google?.addEventListener('click', async () => {
    if (!configured) { setMessage(authCopy.unavailableHelp, true); return; }
    google.disabled = true;
    try {
      const callback = accountUrl(copy.lang, 'callback', returnTo);
      const { error } = await signInWithGoogle(callback);
      if (error) setMessage(authCopy.googleError, true);
    } catch (error) {
      setMessage(formMessage(error, copy, authCopy, authCopy.googleError), true);
    } finally { google.disabled = false; }
  });

  const signout = app.querySelector('[data-auth-action="signout"]');
  signout?.addEventListener('click', async () => {
    signout.disabled = true;
    try {
      const { error } = await signOut();
      if (error) throw error;
      location.assign(accountUrl(copy.lang, 'login'));
    } catch { signout.disabled = false; setMessage(authCopy.signOutError, true); }
  });

  const profileForm = app.querySelector('#profile-form');
  if (profileForm) profileForm.dataset.configured = String(configured);
  profileForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const firstName = profileForm.elements['first-name'].value.trim();
    const lastName = profileForm.elements['last-name'].value.trim();
    if (!firstName || !lastName) { setMessage(authCopy.required, true); return; }
    if (firstName.length > 80 || lastName.length > 80) { setMessage(authCopy.nameTooLong, true); return; }
    setBusy(profileForm, true, authCopy);
    try {
      const { error } = await updateProfile(session.user.id, { firstName, lastName, locale: profileForm.elements['preferred-locale'].value });
      if (error) throw error;
      setMessage(authCopy.profileSaved);
    } catch { setMessage(authCopy.profileSavedError, true); }
    finally { setBusy(profileForm, false, authCopy); }
  });

  const form = app.querySelector('#account-form');
  if (!form) return;
  form.dataset.configured = String(configured);
  form.querySelectorAll('[type="submit"]').forEach((button) => { button.disabled = !configured; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const kind = form.dataset.form;
    const missing = [...form.elements].find((element) => element.required && !String(element.value ?? '').trim());
    if (missing) { setMessage(authCopy.required, true); missing.focus(); return; }
    const emailInput = form.elements.email;
    const email = emailInput?.value.trim() ?? '';
    if (emailInput && !isValidEmail(email)) { setMessage(authCopy.invalidEmail, true); emailInput.focus(); return; }
    if (kind === 'signup') {
      const firstName = form.elements['first-name'].value.trim();
      const lastName = form.elements['last-name'].value.trim();
      if (!firstName || !lastName) { setMessage(authCopy.required, true); return; }
      if (firstName.length > 80 || lastName.length > 80) { setMessage(authCopy.nameTooLong, true); return; }
      if (!isValidPassword(form.elements.password.value)) { setMessage(authCopy.invalidPassword, true); return; }
      if (form.elements.password.value !== form.elements['confirm-password'].value) { setMessage(authCopy.passwordMismatch, true); return; }
    }
    if (kind === 'reset') {
      const recoveryPending = hasRecoveryFlag();
      if (!recoveryPending) { setMessage(authCopy.recoveryInvalid, true); return; }
      if (!isValidPassword(form.elements.password.value)) { setMessage(authCopy.invalidPassword, true); return; }
      if (form.elements.password.value !== form.elements['confirm-password'].value) { setMessage(authCopy.passwordMismatch, true); return; }
    }
    if (!configured) { setMessage(authCopy.unavailableHelp, true); return; }

    setBusy(form, true, authCopy);
    try {
      if (kind === 'login') {
        const { data, error } = await signIn({ email, password: form.elements.password.value });
        if (error || !data?.session) throw error || new Error('SIGN_IN_FAILED');
        location.assign(safeReturnTo(returnTo) || accountUrl(copy.lang, 'profile'));
      } else if (kind === 'signup') {
        const { data, error } = await signUp({
          firstName: form.elements['first-name'].value, lastName: form.elements['last-name'].value,
          email, password: form.elements.password.value, locale: copy.lang,
          redirectTo: accountUrl(copy.lang, 'callback', returnTo),
        });
        if (error) throw error;
        if (data?.session) location.assign(safeReturnTo(returnTo) || accountUrl(copy.lang, 'profile'));
        else { form.reset(); setMessage(authCopy.signupSubmitted); }
      } else if (kind === 'forgot') {
        const { error } = await requestPasswordReset(email, accountUrl(copy.lang, 'reset'));
        if (error) throw error;
        form.reset(); setMessage(authCopy.resetSubmitted);
      } else if (kind === 'reset') {
        const { error } = await updatePassword(form.elements.password.value);
        if (error) throw error;
        try { sessionStorage.removeItem(recoveryKey); } catch { /* Storage may be disabled. */ }
        try { await signOut(); } catch { /* Password update succeeded; a later token refresh will expire the old session. */ }
        location.assign(accountUrl(copy.lang, 'login'));
      }
    } catch (error) {
      const fallback = kind === 'login' ? authCopy.loginFailed : kind === 'forgot' ? authCopy.serviceError : authCopy.serviceError;
      setMessage(formMessage(error, copy, authCopy, fallback), true);
    } finally { setBusy(form, false, authCopy); }
  });
}

export async function updateProfileBadge(copy) {
  const profileLinks = document.querySelectorAll('[data-profile-link]');
  if (!profileLinks.length) return;
  const { configured, session } = await readSession();
  for (const link of profileLinks) {
    link.href = accountUrl(copy.lang, session ? 'profile' : 'login');
    if (session) {
      link.dataset.signedIn = 'true';
      link.setAttribute('aria-label', copy.accountLabel);
      link.title = copy.accountLabel;
      const label = link.querySelector('span');
      if (label) label.textContent = copy.accountLabel;
    }
    if (!configured) link.dataset.authUnavailable = 'true';
  }
}

export async function renderAccount(app, copy, view, returnTo = null) {
  const { default: authCopy } = await import(`./i18n/${copy.lang}.js`);
  const safeReturn = safeReturnTo(returnTo);
  const allowedViews = ['login', 'signup', 'forgot', 'reset', 'callback', 'profile'];
  if (!allowedViews.includes(view)) view = 'login';

  let recoveryEvent = false;
  const unsubscribe = await subscribeToAuthChanges((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryEvent = true;
      try { sessionStorage.setItem(recoveryKey, 'true'); } catch { /* The hash/query callback remains the recovery proof. */ }
    }
  });
  const state = await readSession();
  const client = await getAuthClient();
  let session = state.session;
  let profile = null;
  let profileError = false;
  if (view === 'profile' && session?.user) {
    const result = await readProfile(session.user.id);
    profile = result.data ?? null;
    profileError = Boolean(result.error || !profile);
  }
  if (session && ['login', 'signup', 'forgot'].includes(view)) {
    location.replace(safeReturn || accountUrl(copy.lang, 'profile'));
    unsubscribe();
    return () => {};
  }
  if (view === 'callback' && session) {
    location.replace(safeReturn || accountUrl(copy.lang, 'profile'));
    unsubscribe();
    return () => {};
  }

  const callbackError = view === 'callback' && ['error', 'error_description'].some((key) =>
    new URLSearchParams(location.search).has(key) || new URLSearchParams(location.hash.slice(1)).has(key));

  const configured = Boolean(client);
  const googleEnabled = await (await import('./client.js')).isGoogleAuthEnabled();
  if (view === 'profile' && (!session?.user || profileError)) view = 'login';
  const displaySession = view === 'profile' && session?.user ? { ...session, profile } : session;
  const alert = !configured ? `<p class="account-unavailable" role="status">${escapeHtml(authCopy.unavailableHelp)}</p>` : '';
  const sessionAlert = state.error ? `<div class="account-unavailable" role="alert">${escapeHtml(authCopy.serviceError)}</div>` : '';
  const profileAlert = profileError ? `<div class="account-unavailable" role="alert">${escapeHtml(authCopy.profileUnavailable)}</div>` : '';
  const legalLinks = copy.legal.map((item) => {
    const url = new URL(`${copy.lang}/`, document.baseURI);
    url.search = new URLSearchParams({ page: 'legal', doc: item.id });
    return `<li><a href="${escapeHtml(url.href)}">${escapeHtml(item.label)}</a></li>`;
  }).join('');
  const photo = photoForSession(view);
  app.insertAdjacentHTML('afterbegin', photoMarkup(copy, authCopy, photo));
  const backdrop = app.querySelector('.account-backdrop');
  const image = backdrop?.querySelector('img');
  const usePhotoFallback = () => {
    backdrop?.classList.add('is-fallback');
    app.querySelector('.account-photo-caption')?.setAttribute('hidden', '');
  };
  image?.addEventListener('error', usePhotoFallback, { once: true });
  if (image?.complete && !image.naturalWidth) usePhotoFallback();
  app.insertAdjacentHTML('beforeend', `<main id="main-content" class="account-page" tabindex="-1"><div class="account-layout"><div class="account-content">${sessionAlert}${profileAlert}${alert}${viewMarkup(copy, authCopy, view, configured, displaySession, googleEnabled)}</div></div></main><footer class="site-footer account-footer"><nav class="footer-nav" aria-label="${escapeHtml(copy.footerLabel)}"><h2>${escapeHtml(copy.legalHeading)}</h2><ul>${legalLinks}</ul></nav><div class="footer-meta"><a href="${escapeHtml(new URL(`${copy.lang}/`, document.baseURI).href)}">${escapeHtml(authCopy.backHome)}</a><span>© ${new Date().getFullYear()} VoyageGo</span></div></footer>`);
  if (callbackError) setMessage(authCopy.googleError, true);
  await bindForm(app, copy, authCopy, view, configured, displaySession, safeReturn);

  const passwordInput = app.querySelector('#password');
  if (passwordInput) criteria(passwordInput.value, authCopy);
  if (view === 'reset') {
    const hasRecoveryProof = recoveryEvent || hasRecoveryFlag();
    if (!hasRecoveryProof) {
      const form = app.querySelector('#account-form');
      form?.querySelectorAll('[type="submit"]').forEach((button) => { button.disabled = true; });
      setMessage(authCopy.recoveryInvalid, true);
      const requestLink = document.createElement('a');
      requestLink.className = 'account-switch';
      requestLink.href = accountUrl(copy.lang, 'forgot');
      requestLink.textContent = authCopy.forgot;
      form?.append(requestLink);
    }
  }
  const onAuthChange = (event, nextSession) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryEvent = true;
      try { sessionStorage.setItem(recoveryKey, 'true'); } catch { /* The in-memory event remains available. */ }
      if (view === 'reset') {
        session = nextSession;
        app.querySelector('#account-form')?.querySelectorAll('[type="submit"]').forEach((button) => { button.disabled = !configured; });
        setMessage('');
      }
    }
  };
  const unsubscribeAfterInit = await subscribeToAuthChanges(onAuthChange);
  return () => { unsubscribe(); unsubscribeAfterInit(); };
}
