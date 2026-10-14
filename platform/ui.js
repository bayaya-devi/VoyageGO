import { readSession, resendEmailOtp, setOptionalPassword, verifyEmailOtp } from '../auth/client.js';
import { destinations as legacyDestinations } from '../data/countries.js';
import { platformRequest, readHealth } from './api.js';
import { countryMarkup } from './country-ui.js';
import { getAfricaCountry } from '../data/africa-countries.js';

const draftKey = 'voyagego-trip-draft-v1';
const onboardingKey = 'voyagego-onboarding-v1';
const favoriteIso = ['MA','FR','TH','JP','BR','CA','IT','PT'];
const interestIds = ['nature','mountains','beaches','adventure','food','culture','heritage','cities','relax','road_trips','family','sports','local','budget','premium'];

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }
function countryContext() {
  const segments = location.pathname.split('/').filter(Boolean);
  const localeIndex = segments.findIndex((segment) => ['fr','ar','en','es','pt'].includes(segment));
  return localeIndex > 0 ? getAfricaCountry(segments[localeIndex - 1]) : null;
}
function countryRootUrl(locale) {
  const country = countryContext();
  return new URL(country ? `${country.id}/${locale}/` : `${locale}/`, document.baseURI);
}
function pageUrl(locale, page, extra = {}) {
  const url = countryRootUrl(locale);
  url.search = new URLSearchParams({ page, ...extra });
  return url.href;
}
function icon(path) { return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`; }
const icons = {
  home: icon('<path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4Z"/>'),
  prepare: icon('<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h2a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3"/>'),
  explore: icon('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z"/>'),
  profile: icon('<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
};

function platformNav(locale, t, active) {
  return `<nav class="platform-nav" aria-label="${escapeHtml(t.nav.home)}"><a href="${pageUrl(locale,'home')}" data-platform-home>${icons.home}<span>${escapeHtml(t.nav.home)}</span></a>${['prepare','explore','profile'].map((key)=>`<a href="${pageUrl(locale,key)}" ${key===active?'aria-current="page"':''}>${icons[key]}<span>${escapeHtml(t.nav[key])}</span></a>`).join('')}</nav>`;
}
function frame(locale, t, page, body) {
  return `<main id="main-content" class="platform-page platform-${page}" tabindex="-1">${body}</main>${platformNav(locale,t,page)}`;
}
function loadLocal(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
function saveLocal(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function statusPanel(text, kind='info') { return `<p class="platform-status is-${kind}" role="status">${escapeHtml(text)}</p>`; }
function optionsMarkup(values, labels, selected = '') {
  return values.map((value)=>`<option value="${value}" ${value===selected?'selected':''}>${escapeHtml(labels[value])}</option>`).join('');
}

function prepareMarkup(locale,t){
  const draft=loadLocal(draftKey,{mode:'guided',title:'',destination:'',notes:''});
  return frame(locale,t,'prepare',`<section class="platform-hero"><p class="eyebrow">${escapeHtml(t.prepare.eyebrow)}</p><h1>${escapeHtml(t.prepare.title)}</h1><p>${escapeHtml(t.prepare.intro)}</p></section>
  <section class="journey-composer" aria-labelledby="prepare-mode"><div class="mode-switch" id="prepare-mode"><button type="button" data-mode="guided" aria-pressed="${draft.mode!=='free'}">${escapeHtml(t.prepare.guided)}</button><button type="button" data-mode="free" aria-pressed="${draft.mode==='free'}">${escapeHtml(t.prepare.free)}</button></div>
  <form id="trip-draft" class="platform-form"><label>${escapeHtml(t.prepare.name)}<input name="title" maxlength="120" value="${escapeHtml(draft.title)}" required></label><label>${escapeHtml(t.prepare.destination)}<input name="destination" maxlength="80" value="${escapeHtml(draft.destination)}"></label><label>${escapeHtml(t.prepare.notes)}<textarea name="notes" maxlength="3000">${escapeHtml(draft.notes)}</textarea></label><button class="platform-primary" type="submit">${escapeHtml(t.prepare.save)}</button><p id="draft-status" role="status"></p></form></section>
  <section class="service-ribbon" aria-labelledby="services-title"><div><p class="eyebrow">${escapeHtml(t.prepare.services)}</p><h2 id="services-title">${escapeHtml(t.prepare.pending)}</h2></div><ul>${t.prepare.servicesList.map((service)=>`<li><span>${escapeHtml(service)}</span><small>${escapeHtml(t.prepare.pending)}</small></li>`).join('')}</ul><p>${escapeHtml(t.prepare.offline)}</p></section>`);
}

async function exploreMarkup(locale,t){
  let data=[];
  try { data=await platformRequest(`destinations?locale=${locale}&limit=100`); } catch {
    data=legacyDestinations.map((item)=>({iso2:item.iso2,iso3:item.iso3,name:item.names[locale],description:'',contentStatus:item.iso3==='MAR'||item.iso3==='FRA'?'published':'preparing',serviceStatus:'inactive',capabilities:{information:item.iso3==='MAR'}}));
  }
  return frame(locale,t,'explore',`<section class="platform-hero"><p class="eyebrow">${escapeHtml(t.explore.eyebrow)}</p><h1>${escapeHtml(t.explore.title)}</h1><p>${escapeHtml(t.explore.intro)}</p><label class="world-search"><span class="sr-only">${escapeHtml(t.explore.search)}</span><input id="destination-search" type="search" placeholder="${escapeHtml(t.explore.search)}" autocomplete="off"></label></section>
  <p class="world-note">${escapeHtml(t.explore.world)}</p><section class="destination-editorial" id="destination-results">${data.map((item)=>`<article data-search="${escapeHtml(`${item.name} ${item.iso2}`.toLowerCase())}"><div class="destination-orbit" aria-hidden="true"><span></span></div><div><p class="eyebrow">${escapeHtml(item.iso2)}</p><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.description||'')}</p><ul class="capability-list"><li>${escapeHtml(item.contentStatus==='published'?t.explore.content:t.explore.preparing)}</li><li>${escapeHtml(item.serviceStatus==='request_enabled'?t.explore.services:t.explore.noServices)}</li></ul></div></article>`).join('')}</section>`);
}

async function profileMarkup(locale,t){
  const state=await readSession();
  if(!state.session?.user) return frame(locale,t,'profile',`<section class="platform-hero"><p class="eyebrow">${escapeHtml(t.profile.eyebrow)}</p><h1>${escapeHtml(t.profile.title)}</h1><p>${escapeHtml(t.profile.intro)}</p><div class="platform-actions"><a class="platform-primary" href="${pageUrl(locale,'account',{view:'login'})}">${escapeHtml(t.signIn)}</a><a class="platform-secondary" href="${pageUrl(locale,'account',{view:'signup'})}">${escapeHtml(t.createAccount)}</a></div></section>${statusPanel(t.unavailable)}`);
  let profile=null;
  try{profile=await platformRequest('me/profile');}catch{/* Profile is created on first save. */}
  return frame(locale,t,'profile',`<section class="platform-hero"><p class="eyebrow">${escapeHtml(t.profile.eyebrow)}</p><h1>${escapeHtml(state.session.user.first_name||state.session.user.name||t.profile.title)}</h1><p>${escapeHtml(state.session.user.email)}</p></section>
  <section class="profile-constellation"><a href="${pageUrl(locale,'prepare')}"><strong>${escapeHtml(t.profile.trips)}</strong><span>→</span></a><a href="${pageUrl(locale,'bookings')}"><strong>${escapeHtml(t.profile.bookings)}</strong><span>→</span></a><a href="${pageUrl(locale,'provider')}"><strong>${escapeHtml(t.profile.provider)}</strong><span>→</span></a><a href="${pageUrl(locale,'onboarding',{step:'4'})}"><strong>${escapeHtml(t.profile.onboarding)}</strong><span>→</span></a></section>
  <section class="preference-panel"><h2>${escapeHtml(t.profile.preferences)}</h2><form id="profile-preferences" class="platform-form"><label>${escapeHtml(t.profile.language)}<select name="locale">${['fr','ar','en','es','pt'].map((code)=>`<option value="${code}" ${code===(profile?.locale||locale)?'selected':''}>${code.toUpperCase()}</option>`).join('')}</select></label><label>${escapeHtml(t.profile.currency)}<select name="currency">${['EUR','USD','MAD','GBP','CAD','AUD','JPY','CHF'].map((code)=>`<option ${code===(profile?.currency||'EUR')?'selected':''}>${code}</option>`).join('')}</select></label><label>${escapeHtml(t.profile.style)}<select name="travelStyle">${optionsMarkup(['balanced','slow','intense','spontaneous'],t.options.travelStyle,profile?.travelStyle||'balanced')}</select></label><button class="platform-primary" type="submit">${escapeHtml(t.profile.save)}</button><p id="profile-status" role="status"></p></form></section>`);
}

function onboardingState(){return loadLocal(onboardingKey,{favoriteCountries:[],interests:[],locale:null,currency:'EUR',travelStyle:'balanced'});}
function onboardingMarkup(locale,t,step,health,session){
  const state=onboardingState(); const progress=t.onboarding.progress.replace('{current}',String(step));
  let content='';
  if(step===2){content=`<h1>${escapeHtml(t.onboarding.verifyTitle)}</h1><p>${escapeHtml(t.onboarding.verifyIntro)}</p><form id="otp-form" class="platform-form"><label>${escapeHtml(t.onboarding.email)}<input name="email" type="email" value="${escapeHtml(sessionStorage.getItem('voyagego-signup-email')||'')}" autocomplete="email" required></label><label>${escapeHtml(t.onboarding.code)}<input name="otp" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required></label><button class="platform-primary" type="submit" ${health.emailEnabled?'':'disabled'}>${escapeHtml(t.onboarding.verify)}</button><button class="platform-secondary" type="button" id="otp-resend" ${health.emailEnabled?'':'disabled'}>${escapeHtml(t.onboarding.resend)}</button><p id="onboarding-status" role="status">${health.emailEnabled?'':escapeHtml(t.common.emailRequired)}</p></form>`;}
  else if(step===3){content=`<h1>${escapeHtml(t.onboarding.welcomeTitle)}</h1><p>${escapeHtml(t.onboarding.welcomeIntro)}</p><a class="platform-primary" href="${pageUrl(locale,'onboarding',{step:'4'})}">${escapeHtml(t.onboarding.continue)}</a>`;}
  else if(step===4){content=`<h1>${escapeHtml(t.onboarding.countriesTitle)}</h1><p>${escapeHtml(t.onboarding.countriesIntro)}</p><p id="country-count">${escapeHtml(t.onboarding.selected.replace('{count}',String(state.favoriteCountries.length)))}</p><div class="choice-cloud" id="country-choices">${favoriteIso.map((iso,index)=>`<button type="button" data-country="${iso}" aria-pressed="${state.favoriteCountries.includes(iso)}">${escapeHtml(t.onboarding.countries[index])}</button>`).join('')}</div><button class="platform-primary" id="countries-next" type="button" ${state.favoriteCountries.length===3?'':'disabled'}>${escapeHtml(t.onboarding.continue)}</button>`;}
  else if(step===5){content=`<h1>${escapeHtml(t.onboarding.interestsTitle)}</h1><div class="choice-cloud" id="interest-choices">${interestIds.map((id,index)=>`<button type="button" data-interest="${id}" aria-pressed="${state.interests.includes(id)}">${escapeHtml(t.onboarding.interests[index])}</button>`).join('')}</div><button class="platform-primary" id="interests-next" type="button">${escapeHtml(t.onboarding.continue)}</button>`;}
  else if(step===6){content=`<h1>${escapeHtml(t.onboarding.preferencesTitle)}</h1><form id="onboarding-preferences" class="platform-form"><label>${escapeHtml(t.profile.language)}<select name="locale">${['fr','ar','en','es','pt'].map((code)=>`<option value="${code}" ${code===(state.locale||locale)?'selected':''}>${code.toUpperCase()}</option>`).join('')}</select></label><label>${escapeHtml(t.profile.currency)}<select name="currency">${['EUR','USD','MAD','GBP','CAD','AUD','JPY','CHF'].map((code)=>`<option ${code===state.currency?'selected':''}>${code}</option>`).join('')}</select></label><label>${escapeHtml(t.profile.style)}<select name="travelStyle">${optionsMarkup(['balanced','slow','intense','spontaneous'],t.options.travelStyle,state.travelStyle)}</select></label><button class="platform-primary" type="submit">${escapeHtml(t.onboarding.continue)}</button></form>`;}
  else if(step===7){content=`<h1>${escapeHtml(t.onboarding.optionalPassword)}</h1><p>${escapeHtml(t.onboarding.optionalPasswordIntro)}</p><form id="optional-password" class="platform-form"><label>${escapeHtml(t.onboarding.password)}<input type="password" name="password" minlength="15" maxlength="128" autocomplete="new-password"></label><button class="platform-primary" type="submit" ${session?'':'disabled'}>${escapeHtml(t.onboarding.continue)}</button><a class="platform-secondary" href="${pageUrl(locale,'onboarding',{step:'8'})}">${escapeHtml(t.onboarding.skip)}</a><p id="onboarding-status" role="status"></p></form>`;}
  else {content=`<div class="welcome-orbit" aria-hidden="true"><span></span></div><h1>${escapeHtml(t.onboarding.finalTitle)}</h1><p>${escapeHtml(t.onboarding.finalIntro)}</p><button class="platform-primary" id="finish-onboarding" type="button">${escapeHtml(t.onboarding.finish)}</button>`;}
  return frame(locale,t,'onboarding',`<section class="onboarding-shell"><div class="onboarding-progress"><span>${escapeHtml(t.onboarding.eyebrow)}</span><strong>${escapeHtml(progress)}</strong><i style="--progress:${step/8}"></i></div><div class="onboarding-card">${content}</div></section>`);
}

async function providerMarkup(locale,t){
  const state=await readSession();
  if(!state.session?.user) return frame(locale,t,'provider',`<section class="platform-hero"><p class="eyebrow">${escapeHtml(t.provider.eyebrow)}</p><h1>${escapeHtml(t.provider.title)}</h1><p>${escapeHtml(t.provider.intro)}</p><a class="platform-primary" href="${pageUrl(locale,'account',{view:'login'})}">${escapeHtml(t.signIn)}</a></section>`);
  let provider=null; try{provider=await platformRequest('provider/profile');}catch{/* Not activated. */}
  if(!provider) return frame(locale,t,'provider',`<section class="platform-hero"><p class="eyebrow">${escapeHtml(t.provider.eyebrow)}</p><h1>${escapeHtml(t.provider.activate)}</h1><p>${escapeHtml(t.provider.intro)}</p></section><form id="provider-form" class="platform-form provider-form"><label>${escapeHtml(t.provider.activity)}<select name="activityType">${optionsMarkup(['private_lodging','hotel','guide','activity','transport','vehicle_rental','other'],t.options.activity)}</select></label><label>${escapeHtml(t.provider.country)}<input name="countryCode" maxlength="2" required></label><label>${escapeHtml(t.provider.publicName)}<input name="publicName" maxlength="120" required></label><label>${escapeHtml(t.provider.description)}<textarea name="description" maxlength="2000"></textarea></label><div class="platform-actions"><button class="platform-secondary" type="submit" name="intent" value="draft">${escapeHtml(t.provider.saveDraft)}</button><button class="platform-primary" type="submit" name="intent" value="submit">${escapeHtml(t.provider.submit)}</button></div><p id="provider-status" role="status"></p></form>${statusPanel(t.provider.notVerified)}`);
  const statusLabel=t.provider[provider.status==='pending_verification'?'pending':provider.status]||provider.status;
  return frame(locale,t,'provider',`<section class="platform-hero"><p class="eyebrow">${escapeHtml(t.provider.eyebrow)}</p><h1>${escapeHtml(provider.publicName)}</h1><p>${escapeHtml(t.provider.status)} · ${escapeHtml(statusLabel)}</p>${provider.status==='draft'?`<button class="platform-primary" id="provider-submit" type="button">${escapeHtml(t.provider.submit)}</button>`:''}<p id="provider-status" role="status"></p></section><section class="profile-constellation"><a href="${pageUrl(locale,'listing')}"><strong>${escapeHtml(t.provider.newListing)}</strong><span>→</span></a><a href="${pageUrl(locale,'bookings',{scope:'provider'})}"><strong>${escapeHtml(t.provider.requests)}</strong><span>→</span></a></section>${statusPanel(t.provider.notVerified)}`);
}

async function listingMarkup(locale,t){
  return frame(locale,t,'listing',`<section class="platform-hero"><h1>${escapeHtml(t.listing.title)}</h1><p>${escapeHtml(t.listing.honesty)}</p></section><form id="listing-form" class="platform-form"><label>${escapeHtml(t.listing.type)}<select name="type">${optionsMarkup(['lodging','hotel','guide','activity','transport','vehicle_rental','other'],t.options.listing)}</select></label><label>${escapeHtml(t.listing.country)}<input name="destinationIso2" maxlength="2" required></label><label>${escapeHtml(t.listing.name)}<input name="title" maxlength="140" required></label><label>${escapeHtml(t.listing.description)}<textarea name="description" maxlength="5000"></textarea></label><label>${escapeHtml(t.listing.capacity)}<input name="capacity" type="number" min="1" max="1000"></label><label>${escapeHtml(t.listing.price)}<input name="priceAmount" type="number" min="0"></label><label>${escapeHtml(t.listing.currency)}<select name="currency"><option>EUR</option><option>USD</option><option>MAD</option></select></label><button class="platform-primary" type="submit">${escapeHtml(t.listing.save)}</button><p id="listing-status" role="status"></p></form>`);
}

async function bookingsMarkup(locale,t){
  const providerMode=new URL(location.href).searchParams.get('scope')==='provider'; let bookings=[];
  try{bookings=await platformRequest(providerMode?'provider/booking-requests':'booking-requests');}catch{/* unavailable */}
  return frame(locale,t,'bookings',`<section class="platform-hero"><h1>${escapeHtml(t.bookings.title)}</h1><p>${escapeHtml(t.bookings.clarity)}</p></section><section class="booking-stream">${bookings.length?bookings.map((booking)=>`<article><div><p class="eyebrow">${escapeHtml(booking.status)}</p><h2>${escapeHtml(booking.listingTitle||booking.id)}</h2><p>${escapeHtml(booking.startsAt)} → ${escapeHtml(booking.endsAt)}</p><small>${escapeHtml(t.bookings.payment)} · ${escapeHtml(t.bookings.notPaid)}</small></div>${providerMode&&booking.status==='pending'?`<div class="platform-actions"><button data-booking="${escapeHtml(booking.id)}" data-decision="accepted">${escapeHtml(t.bookings.accept)}</button><button data-booking="${escapeHtml(booking.id)}" data-decision="rejected">${escapeHtml(t.bookings.reject)}</button></div>`:''}</article>`).join(''):`<p>${escapeHtml(t.bookings.empty)}</p>`}</section>`);
}

function bindPrepare(t){
  let mode=loadLocal(draftKey,{mode:'guided'}).mode||'guided';
  document.querySelectorAll('[data-mode]').forEach((button)=>button.addEventListener('click',()=>{mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach((item)=>item.setAttribute('aria-pressed',String(item===button)));}));
  document.querySelector('#trip-draft')?.addEventListener('submit',async(event)=>{event.preventDefault();const form=event.currentTarget;const existing=loadLocal(draftKey,{});const draft={...existing,mode,title:form.elements.title.value.trim(),destination:form.elements.destination.value.trim(),notes:form.elements.notes.value.trim()};saveLocal(draftKey,draft);const status=document.querySelector('#draft-status');status.textContent=t.prepare.saved;const {session}=await readSession();if(!session?.user)return;try{const result=await platformRequest(draft.remoteId?`trips/${draft.remoteId}`:'trips',{method:draft.remoteId?'PATCH':'POST',body:JSON.stringify({title:draft.title,notes:draft.notes,mode:draft.mode})});if(!draft.remoteId){draft.remoteId=result.id;saveLocal(draftKey,draft);}status.textContent=t.prepare.synced;}catch{status.textContent=t.prepare.saved;}});
}
function bindExplore(){document.querySelector('#destination-search')?.addEventListener('input',(event)=>{const query=event.currentTarget.value.trim().toLowerCase();document.querySelectorAll('[data-search]').forEach((card)=>{card.hidden=query&&!card.dataset.search.includes(query);});});}
async function bindProfile(t){document.querySelector('#profile-preferences')?.addEventListener('submit',async(event)=>{event.preventDefault();const form=event.currentTarget;const status=document.querySelector('#profile-status');try{await platformRequest('me/profile',{method:'PATCH',body:JSON.stringify({locale:form.elements.locale.value,currency:form.elements.currency.value,travelStyle:form.elements.travelStyle.value})});status.textContent=t.profile.saved;}catch{status.textContent=t.common.error;}});}
function saveOnboarding(state){saveLocal(onboardingKey,state);}
async function bindOnboarding(locale,t,step){
  const state=onboardingState();
  document.querySelector('#otp-form')?.addEventListener('submit',async(event)=>{event.preventDefault();const status=document.querySelector('#onboarding-status');const email=event.currentTarget.elements.email.value.trim();sessionStorage.setItem('voyagego-signup-email',email);try{const result=await verifyEmailOtp(email,event.currentTarget.elements.otp.value);if(result.error)throw result.error;location.assign(pageUrl(locale,'onboarding',{step:'3'}));}catch{status.textContent=t.common.error;}});
  document.querySelector('#otp-resend')?.addEventListener('click',async()=>{const status=document.querySelector('#onboarding-status');const email=document.querySelector('#otp-form')?.elements.email.value.trim()||'';sessionStorage.setItem('voyagego-signup-email',email);try{await resendEmailOtp(email);status.textContent=t.onboarding.verifyIntro;}catch{status.textContent=t.common.error;}});
  document.querySelectorAll('[data-country]').forEach((button)=>button.addEventListener('click',()=>{const iso=button.dataset.country;const selected=new Set(state.favoriteCountries);if(selected.has(iso))selected.delete(iso);else if(selected.size<3)selected.add(iso);state.favoriteCountries=[...selected];saveOnboarding(state);document.querySelectorAll('[data-country]').forEach((item)=>item.setAttribute('aria-pressed',String(selected.has(item.dataset.country))));document.querySelector('#country-count').textContent=t.onboarding.selected.replace('{count}',String(selected.size));document.querySelector('#countries-next').disabled=selected.size!==3;}));
  document.querySelector('#countries-next')?.addEventListener('click',()=>location.assign(pageUrl(locale,'onboarding',{step:'5'})));
  document.querySelectorAll('[data-interest]').forEach((button)=>button.addEventListener('click',()=>{const id=button.dataset.interest;const selected=new Set(state.interests);selected.has(id)?selected.delete(id):selected.add(id);state.interests=[...selected];saveOnboarding(state);button.setAttribute('aria-pressed',String(selected.has(id)));}));
  document.querySelector('#interests-next')?.addEventListener('click',()=>location.assign(pageUrl(locale,'onboarding',{step:'6'})));
  document.querySelector('#onboarding-preferences')?.addEventListener('submit',(event)=>{event.preventDefault();const form=event.currentTarget;state.locale=form.elements.locale.value;state.currency=form.elements.currency.value;state.travelStyle=form.elements.travelStyle.value;saveOnboarding(state);location.assign(pageUrl(locale,'onboarding',{step:'7'}));});
  document.querySelector('#optional-password')?.addEventListener('submit',async(event)=>{event.preventDefault();const status=document.querySelector('#onboarding-status');try{await setOptionalPassword(event.currentTarget.elements.password.value);location.assign(pageUrl(locale,'onboarding',{step:'8'}));}catch{status.textContent=t.common.error;}});
  document.querySelector('#finish-onboarding')?.addEventListener('click',async()=>{try{await platformRequest('me/profile',{method:'PATCH',body:JSON.stringify({...state,onboardingStep:8,completeOnboarding:true})});}catch{/* The local profile remains available if synchronization fails. */}location.assign(pageUrl(locale,'profile'));});
}
async function bindProvider(t){document.querySelector('#provider-form')?.addEventListener('submit',async(event)=>{event.preventDefault();const f=event.currentTarget;const status=document.querySelector('#provider-status');try{await platformRequest('provider/profile',{method:'POST',body:JSON.stringify({activityType:f.elements.activityType.value,countryCode:f.elements.countryCode.value,publicName:f.elements.publicName.value,description:f.elements.description.value,submitForVerification:event.submitter?.value==='submit'})});location.reload();}catch{status.textContent=t.common.error;}});document.querySelector('#provider-submit')?.addEventListener('click',async()=>{const status=document.querySelector('#provider-status');try{await platformRequest('provider/profile',{method:'PATCH',body:JSON.stringify({submitForVerification:true})});location.reload();}catch{status.textContent=t.common.error;}});}
async function bindListing(t){document.querySelector('#listing-form')?.addEventListener('submit',async(event)=>{event.preventDefault();const f=event.currentTarget;const status=document.querySelector('#listing-status');try{await platformRequest('provider/listings',{method:'POST',body:JSON.stringify({type:f.elements.type.value,destinationIso2:f.elements.destinationIso2.value,title:f.elements.title.value,description:f.elements.description.value,capacity:f.elements.capacity.value?Number(f.elements.capacity.value):null,priceAmount:f.elements.priceAmount.value?Number(f.elements.priceAmount.value):null,currency:f.elements.currency.value})});status.textContent=t.provider.draft;f.reset();}catch{status.textContent=t.common.error;}});}
function bindBookings(t){document.querySelectorAll('[data-booking][data-decision]').forEach((button)=>button.addEventListener('click',async()=>{button.disabled=true;try{await platformRequest(`provider/booking-requests/${button.dataset.booking}/decision`,{method:'POST',body:JSON.stringify({decision:button.dataset.decision})});location.reload();}catch{button.disabled=false;button.closest('article').insertAdjacentHTML('beforeend',statusPanel(t.common.error,'error'));}}));}

export async function renderPlatform(app, copy, route) {
  const { default:t }=await import(`./i18n/${copy.lang}.js`);
  const page=route.type;
  if(page==='country')app.insertAdjacentHTML('beforeend',countryMarkup(route.country,copy.lang,(target)=>pageUrl(copy.lang,target)));
  else if(page==='prepare')app.insertAdjacentHTML('beforeend',prepareMarkup(copy.lang,t));
  else if(page==='explore')app.insertAdjacentHTML('beforeend',await exploreMarkup(copy.lang,t));
  else if(page==='profile')app.insertAdjacentHTML('beforeend',await profileMarkup(copy.lang,t));
  else if(page==='onboarding'){const health=await readHealth();const {session}=await readSession();const step=Math.min(8,Math.max(2,Number(route.step)||3));app.insertAdjacentHTML('beforeend',onboardingMarkup(copy.lang,t,step,health,session));await bindOnboarding(copy.lang,t,step);}
  else if(page==='provider')app.insertAdjacentHTML('beforeend',await providerMarkup(copy.lang,t));
  else if(page==='listing')app.insertAdjacentHTML('beforeend',await listingMarkup(copy.lang,t));
  else if(page==='bookings')app.insertAdjacentHTML('beforeend',await bookingsMarkup(copy.lang,t));
  document.querySelector('[data-platform-home]')?.addEventListener('click',(event)=>{event.preventDefault();location.assign(countryRootUrl(copy.lang));});
  if(page==='prepare')bindPrepare(t); if(page==='explore')bindExplore(); if(page==='profile')await bindProfile(t); if(page==='provider')await bindProvider(t); if(page==='listing')await bindListing(t); if(page==='bookings')bindBookings(t);
  document.querySelector('#main-content')?.focus({preventScroll:true});
  return ()=>{};
}
