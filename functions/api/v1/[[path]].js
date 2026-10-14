import {
  HttpError, assertId, assertOrigin, consumeRateLimit, enumField, errorResponse, integerField,
  isoDateTime, json, pageLimit, parseJsonColumns, readJson, requireSession, stringField,
} from '../../_shared/api.js';
import { createAuth } from '../../_shared/auth.js';

const LOCALES = ['fr', 'ar', 'en', 'es', 'pt'];
const CURRENCIES = ['EUR', 'USD', 'MAD', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'];
const INTERESTS = ['nature','mountains','beaches','adventure','food','culture','heritage','cities','relax','road_trips','family','sports','local','budget','premium'];
const ACTIVITY_TYPES = ['private_lodging','hotel','guide','activity','transport','vehicle_rental','other'];
const LISTING_TYPES = ['lodging','hotel','guide','activity','transport','vehicle_rental','other'];

function segments(request) {
  const path = new URL(request.url).pathname.replace(/^\/api\/v1\/?/u, '');
  return path.split('/').filter(Boolean).map(decodeURIComponent);
}

function now() { return Date.now(); }
function newId(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function cleanArray(value, allowed, max = 20) {
  if (!Array.isArray(value) || value.length > max) throw new HttpError(400, 'INVALID_FIELD');
  return [...new Set(value.filter((entry) => typeof entry === 'string' && allowed.includes(entry)))];
}
function countryArray(value) {
  if (!Array.isArray(value) || value.length > 3) throw new HttpError(400, 'INVALID_FAVORITE_COUNTRIES');
  const countries = [...new Set(value.map((entry) => String(entry).toUpperCase()))];
  if (countries.some((entry) => !/^[A-Z]{2}$/u.test(entry))) throw new HttpError(400, 'INVALID_FAVORITE_COUNTRIES');
  return countries;
}
function profileResult(row) {
  return parseJsonColumns(row, ['favoriteCountries','interests','accommodationPreferences']);
}

async function listDestinations(env, request) {
  const url = new URL(request.url);
  const locale = LOCALES.includes(url.searchParams.get('locale')) ? url.searchParams.get('locale') : 'fr';
  const result = await env.DB.prepare(`SELECT iso2, iso3, names, summary, latitude, longitude, contentStatus, serviceStatus, capabilities, accent, updatedAt
    FROM destination ORDER BY CASE contentStatus WHEN 'published' THEN 0 ELSE 1 END, iso2 LIMIT ?`).bind(pageLimit(url)).all();
  return json({ data: result.results.map((row) => {
    const item = parseJsonColumns(row, ['names','summary','capabilities']);
    return { ...item, name: item.names?.[locale] || item.names?.en || item.iso2, description: item.summary?.[locale] || '' };
  }) }, 200, { 'cache-control': 'public, max-age=300' });
}

async function getProfile(env, userId) {
  const row = await env.DB.prepare('SELECT * FROM profile WHERE userId = ?').bind(userId).first();
  return profileResult(row);
}

async function patchProfile(env, request, userId) {
  const body = await readJson(request);
  const existing = await getProfile(env, userId);
  const favoriteCountries = body.favoriteCountries === undefined ? existing?.favoriteCountries || [] : countryArray(body.favoriteCountries);
  const interests = body.interests === undefined ? existing?.interests || [] : cleanArray(body.interests, INTERESTS, 15);
  const accommodation = body.accommodationPreferences === undefined ? existing?.accommodationPreferences || [] : cleanArray(body.accommodationPreferences, ['hotel','apartment','guesthouse','hostel','camping','resort'], 6);
  const locale = enumField(body.locale, 'locale', LOCALES, existing?.locale || 'fr');
  const currency = enumField(String(body.currency || existing?.currency || 'EUR').toUpperCase(), 'currency', CURRENCIES);
  const travelStyle = body.travelStyle == null ? existing?.travelStyle || null : enumField(body.travelStyle, 'travelStyle', ['balanced','slow','intense','spontaneous']);
  const budgetBand = body.budgetBand == null ? existing?.budgetBand || null : enumField(body.budgetBand, 'budgetBand', ['economy','balanced','comfort','premium']);
  const onboardingStep = body.onboardingStep == null ? existing?.onboardingStep || 0 : integerField(body.onboardingStep, 'onboardingStep', { min: 0, max: 8 });
  const completed = body.completeOnboarding === true ? now() : existing?.onboardingCompletedAt || null;
  const tutorial = body.completeTutorial === true ? now() : existing?.tutorialCompletedAt || null;
  const timestamp = now();
  await env.DB.prepare(`INSERT INTO profile (userId,locale,currency,favoriteCountries,interests,travelStyle,budgetBand,accommodationPreferences,onboardingStep,onboardingCompletedAt,tutorialCompletedAt,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(userId) DO UPDATE SET locale=excluded.locale,currency=excluded.currency,favoriteCountries=excluded.favoriteCountries,
    interests=excluded.interests,travelStyle=excluded.travelStyle,budgetBand=excluded.budgetBand,accommodationPreferences=excluded.accommodationPreferences,
    onboardingStep=excluded.onboardingStep,onboardingCompletedAt=excluded.onboardingCompletedAt,tutorialCompletedAt=excluded.tutorialCompletedAt,updatedAt=excluded.updatedAt`)
    .bind(userId, locale, currency, JSON.stringify(favoriteCountries), JSON.stringify(interests), travelStyle, budgetBand, JSON.stringify(accommodation), onboardingStep, completed, tutorial, timestamp, timestamp).run();
  return json({ data: await getProfile(env, userId) });
}

async function listTrips(env, request, userId) {
  const url = new URL(request.url);
  const result = await env.DB.prepare('SELECT * FROM trip WHERE userId = ? ORDER BY updatedAt DESC LIMIT ?').bind(userId, pageLimit(url)).all();
  return json({ data: result.results });
}
async function createTrip(env, request, userId) {
  const body = await readJson(request);
  const id = newId('trip');
  const timestamp = now();
  const title = stringField(body.title, 'title', { required: true, min: 1, max: 120 });
  const mode = enumField(body.mode, 'mode', ['guided','free'], 'guided');
  const currency = enumField(String(body.currency || 'EUR').toUpperCase(), 'currency', CURRENCIES);
  const destination = body.destinationIso2 ? String(body.destinationIso2).toUpperCase() : null;
  if (destination && !/^[A-Z]{2}$/u.test(destination)) throw new HttpError(400, 'INVALID_FIELD', { field: 'destinationIso2' });
  await env.DB.prepare(`INSERT INTO trip (id,userId,title,destinationIso2,startDate,endDate,mode,status,visibility,currency,notes,budgetAmount,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,userId,title,destination,body.startDate || null,body.endDate || null,mode,'draft','private',currency,stringField(body.notes,'notes',{max:4000}) || '',integerField(body.budgetAmount,'budgetAmount',{min:0,max:100000000,optional:true}),timestamp,timestamp).run();
  return json({ data: await env.DB.prepare('SELECT * FROM trip WHERE id = ?').bind(id).first() }, 201);
}
async function tripDetail(env, request, userId, tripId) {
  assertId(tripId);
  const trip = await env.DB.prepare('SELECT * FROM trip WHERE id = ? AND userId = ?').bind(tripId,userId).first();
  if (!trip) throw new HttpError(404, 'TRIP_NOT_FOUND');
  if (request.method === 'GET') {
    const items = await env.DB.prepare('SELECT * FROM tripItem WHERE tripId = ? ORDER BY dayIndex, position, createdAt').bind(tripId).all();
    return json({ data: { ...trip, items: items.results } });
  }
  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM trip WHERE id = ? AND userId = ?').bind(tripId,userId).run();
    return new Response(null, { status: 204 });
  }
  const body = await readJson(request);
  const title = body.title === undefined ? trip.title : stringField(body.title,'title',{required:true,max:120});
  const status = body.status === undefined ? trip.status : enumField(body.status,'status',['draft','active','past','archived']);
  const notes = body.notes === undefined ? trip.notes : stringField(body.notes,'notes',{max:4000}) || '';
  await env.DB.prepare('UPDATE trip SET title=?, status=?, notes=?, updatedAt=? WHERE id=? AND userId=?').bind(title,status,notes,now(),tripId,userId).run();
  return json({ data: await env.DB.prepare('SELECT * FROM trip WHERE id = ?').bind(tripId).first() });
}
async function createTripItem(env, request, userId, tripId) {
  assertId(tripId);
  const owner = await env.DB.prepare('SELECT id FROM trip WHERE id=? AND userId=?').bind(tripId,userId).first();
  if (!owner) throw new HttpError(404,'TRIP_NOT_FOUND');
  const body = await readJson(request);
  const id = newId('step');
  const timestamp = now();
  await env.DB.prepare(`INSERT INTO tripItem (id,tripId,dayIndex,position,type,title,startsAt,address,latitude,longitude,notes,sourceRef,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,tripId,integerField(body.dayIndex,'dayIndex',{min:0,max:365}),integerField(body.position,'position',{min:0,max:1000}),enumField(body.type,'type',['place','note','booking','transport','activity']),stringField(body.title,'title',{required:true,max:160}),body.startsAt||null,stringField(body.address,'address',{max:300}),body.latitude??null,body.longitude??null,stringField(body.notes,'notes',{max:3000})||'',stringField(body.sourceRef,'sourceRef',{max:160}),timestamp,timestamp).run();
  await env.DB.prepare('UPDATE trip SET updatedAt=? WHERE id=?').bind(timestamp,tripId).run();
  return json({ data: await env.DB.prepare('SELECT * FROM tripItem WHERE id=?').bind(id).first() },201);
}

async function getProvider(env, userId) {
  return env.DB.prepare('SELECT * FROM providerProfile WHERE userId=?').bind(userId).first();
}
async function providerProfile(env, request, userId) {
  if (request.method === 'GET') return json({ data: await getProvider(env,userId) });
  const body = await readJson(request);
  const existing = await getProvider(env,userId);
  const id = existing?.id || newId('provider');
  const activityType = enumField(body.activityType,'activityType',ACTIVITY_TYPES,existing?.activityType);
  const countryCode = String(body.countryCode || existing?.countryCode || '').toUpperCase();
  if (!/^[A-Z]{2}$/u.test(countryCode)) throw new HttpError(400,'INVALID_FIELD',{field:'countryCode'});
  const publicName = stringField(body.publicName ?? existing?.publicName,'publicName',{required:true,max:120});
  const description = stringField(body.description ?? existing?.description,'description',{max:2000}) || '';
  const targetStatus = body.submitForVerification === true ? 'pending_verification' : existing?.status || 'draft';
  const timestamp = now();
  await env.DB.prepare(`INSERT INTO providerProfile (id,userId,activityType,status,countryCode,publicName,description,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(userId) DO UPDATE SET activityType=excluded.activityType,countryCode=excluded.countryCode,publicName=excluded.publicName,description=excluded.description,status=CASE WHEN providerProfile.status IN ('active','suspended') THEN providerProfile.status ELSE excluded.status END,updatedAt=excluded.updatedAt`)
    .bind(id,userId,activityType,targetStatus,countryCode,publicName,description,timestamp,timestamp).run();
  return json({ data: await getProvider(env,userId) },existing?200:201);
}
async function listings(env, request, userId) {
  const provider = await getProvider(env,userId);
  if (!provider) throw new HttpError(403,'PROVIDER_REQUIRED');
  if (request.method === 'GET') {
    const result = await env.DB.prepare('SELECT * FROM listing WHERE providerId=? ORDER BY updatedAt DESC LIMIT ?').bind(provider.id,pageLimit(new URL(request.url))).all();
    return json({ data: result.results.map((row)=>parseJsonColumns(row,['conditions'])) });
  }
  const body = await readJson(request);
  const id = newId('listing');
  const timestamp = now();
  const country = String(body.destinationIso2 || '').toUpperCase();
  if (!/^[A-Z]{2}$/u.test(country)) throw new HttpError(400,'INVALID_FIELD',{field:'destinationIso2'});
  await env.DB.prepare(`INSERT INTO listing (id,providerId,destinationIso2,type,title,description,capacity,priceAmount,currency,conditions,status,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,provider.id,country,enumField(body.type,'type',LISTING_TYPES),stringField(body.title,'title',{required:true,max:140}),stringField(body.description,'description',{max:5000})||'',integerField(body.capacity,'capacity',{min:1,max:1000,optional:true}),integerField(body.priceAmount,'priceAmount',{min:0,max:100000000,optional:true}),body.currency?enumField(String(body.currency).toUpperCase(),'currency',CURRENCIES):null,JSON.stringify(body.conditions && typeof body.conditions==='object'?body.conditions:{}),'draft',timestamp,timestamp).run();
  return json({ data: parseJsonColumns(await env.DB.prepare('SELECT * FROM listing WHERE id=?').bind(id).first(),['conditions']) },201);
}
async function createAvailability(env, request, userId, listingId) {
  const provider = await getProvider(env,userId);
  const listing = provider && await env.DB.prepare('SELECT id FROM listing WHERE id=? AND providerId=?').bind(assertId(listingId),provider.id).first();
  if (!listing) throw new HttpError(404,'LISTING_NOT_FOUND');
  const body = await readJson(request);
  const startsAt = isoDateTime(body.startsAt,'startsAt');
  const endsAt = isoDateTime(body.endsAt,'endsAt');
  if (endsAt <= startsAt) throw new HttpError(400,'INVALID_DATE_RANGE');
  const id = newId('slot'); const timestamp=now();
  await env.DB.prepare('INSERT INTO availability (id,listingId,startsAt,endsAt,capacity,status,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?)').bind(id,listingId,startsAt,endsAt,integerField(body.capacity,'capacity',{min:1,max:1000}),'available',timestamp,timestamp).run();
  return json({ data: await env.DB.prepare('SELECT * FROM availability WHERE id=?').bind(id).first() },201);
}
async function createBooking(env, request, userId) {
  const body = await readJson(request);
  const listingId = assertId(body.listingId,'listingId');
  const listing = await env.DB.prepare(`SELECT l.*, p.userId AS providerUserId FROM listing l JOIN providerProfile p ON p.id=l.providerId WHERE l.id=? AND l.status='active' AND p.status='active'`).bind(listingId).first();
  if (!listing) throw new HttpError(409,'LISTING_NOT_BOOKABLE');
  if (listing.providerUserId === userId) throw new HttpError(409,'OWN_LISTING_NOT_BOOKABLE');
  const startsAt=isoDateTime(body.startsAt,'startsAt'); const endsAt=isoDateTime(body.endsAt,'endsAt');
  if(endsAt<=startsAt) throw new HttpError(400,'INVALID_DATE_RANGE');
  const availabilityId=body.availabilityId?assertId(body.availabilityId,'availabilityId'):null;
  if(availabilityId){const slot=await env.DB.prepare("SELECT id FROM availability WHERE id=? AND listingId=? AND status='available' AND startsAt<=? AND endsAt>=?").bind(availabilityId,listingId,startsAt,endsAt).first(); if(!slot) throw new HttpError(409,'AVAILABILITY_CONFLICT');}
  const key=stringField(request.headers.get('idempotency-key'),'idempotencyKey',{required:true,max:96});
  const existing=await env.DB.prepare('SELECT * FROM bookingRequest WHERE travelerId=? AND idempotencyKey=?').bind(userId,key).first();
  if(existing) return json({data:existing});
  const id=newId('request'); const timestamp=now();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO bookingRequest (id,listingId,availabilityId,travelerId,providerId,startsAt,endsAt,travelerCount,message,quotedAmount,currency,termsSnapshot,status,paymentStatus,idempotencyKey,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,listingId,availabilityId,userId,listing.providerId,startsAt,endsAt,integerField(body.travelerCount,'travelerCount',{min:1,max:Math.min(100,listing.capacity||100)}),stringField(body.message,'message',{max:1500})||'',listing.priceAmount,listing.currency,listing.conditions,'pending','not_configured',key,timestamp,timestamp),
    env.DB.prepare('INSERT INTO bookingEvent (id,bookingId,actorUserId,fromStatus,toStatus,createdAt) VALUES (?,?,?,?,?,?)').bind(newId('event'),id,userId,null,'pending',timestamp),
    env.DB.prepare('INSERT OR IGNORE INTO notification (id,userId,category,titleKey,payload,dedupKey,createdAt) VALUES (?,?,?,?,?,?,?)').bind(newId('notice'),listing.providerUserId,'booking','booking.request.received',JSON.stringify({bookingId:id}),`booking:${id}:pending`,timestamp),
  ]);
  return json({data:await env.DB.prepare('SELECT * FROM bookingRequest WHERE id=?').bind(id).first()},202);
}
async function listBookings(env, request, userId, providerMode=false){
  const limit=pageLimit(new URL(request.url));
  if(providerMode){const provider=await getProvider(env,userId); if(!provider) throw new HttpError(403,'PROVIDER_REQUIRED'); const rows=await env.DB.prepare('SELECT b.*,l.title AS listingTitle FROM bookingRequest b JOIN listing l ON l.id=b.listingId WHERE b.providerId=? ORDER BY b.updatedAt DESC LIMIT ?').bind(provider.id,limit).all(); return json({data:rows.results});}
  const rows=await env.DB.prepare('SELECT b.*,l.title AS listingTitle FROM bookingRequest b JOIN listing l ON l.id=b.listingId WHERE b.travelerId=? ORDER BY b.updatedAt DESC LIMIT ?').bind(userId,limit).all(); return json({data:rows.results});
}
async function decideBooking(env, request, userId, bookingId){
  const body=await readJson(request); const decision=enumField(body.decision,'decision',['accepted','rejected']);
  const provider=await getProvider(env,userId); if(!provider) throw new HttpError(403,'PROVIDER_REQUIRED');
  const booking=await env.DB.prepare('SELECT * FROM bookingRequest WHERE id=? AND providerId=?').bind(assertId(bookingId),provider.id).first();
  if(!booking) throw new HttpError(404,'BOOKING_NOT_FOUND'); if(booking.status!=='pending') throw new HttpError(409,'BOOKING_ALREADY_DECIDED');
  const timestamp=now();
  if(decision==='accepted'){
    const result=await env.DB.prepare(`UPDATE bookingRequest SET status='accepted',updatedAt=? WHERE id=? AND providerId=? AND status='pending' AND NOT EXISTS (
      SELECT 1 FROM bookingRequest other WHERE other.id<>bookingRequest.id AND other.listingId=bookingRequest.listingId AND other.status='accepted' AND other.startsAt<bookingRequest.endsAt AND other.endsAt>bookingRequest.startsAt)`).bind(timestamp,bookingId,provider.id).run();
    if(!result.meta.changes) throw new HttpError(409,'AVAILABILITY_CONFLICT');
  } else {
    const result=await env.DB.prepare("UPDATE bookingRequest SET status='rejected',updatedAt=? WHERE id=? AND providerId=? AND status='pending'").bind(timestamp,bookingId,provider.id).run();
    if(!result.meta.changes) throw new HttpError(409,'BOOKING_ALREADY_DECIDED');
  }
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO bookingEvent (id,bookingId,actorUserId,fromStatus,toStatus,createdAt) VALUES (?,?,?,?,?,?)').bind(newId('event'),bookingId,userId,'pending',decision,timestamp),
    env.DB.prepare('INSERT OR IGNORE INTO notification (id,userId,category,titleKey,payload,dedupKey,createdAt) VALUES (?,?,?,?,?,?,?)').bind(newId('notice'),booking.travelerId,'booking',`booking.request.${decision}`,JSON.stringify({bookingId}),`booking:${bookingId}:${decision}`,timestamp),
  ]);
  return json({data:await env.DB.prepare('SELECT * FROM bookingRequest WHERE id=?').bind(bookingId).first()});
}
async function cancelBooking(env, userId, bookingId){
  const timestamp=now();
  const existing=await env.DB.prepare("SELECT * FROM bookingRequest WHERE id=? AND travelerId=? AND status IN ('pending','accepted')").bind(assertId(bookingId),userId).first();
  if(!existing) throw new HttpError(404,'CANCELLABLE_BOOKING_NOT_FOUND');
  await env.DB.batch([
    env.DB.prepare("UPDATE bookingRequest SET status='cancelled',updatedAt=? WHERE id=? AND travelerId=? AND status IN ('pending','accepted')").bind(timestamp,bookingId,userId),
    env.DB.prepare('INSERT OR IGNORE INTO bookingEvent (id,bookingId,actorUserId,fromStatus,toStatus,createdAt) VALUES (?,?,?,?,?,?)').bind(newId('event'),bookingId,userId,existing.status,'cancelled',timestamp),
  ]);
  return json({data:await env.DB.prepare('SELECT * FROM bookingRequest WHERE id=?').bind(bookingId).first()});
}
async function notifications(env, request, userId){
  const url=new URL(request.url); const rows=await env.DB.prepare('SELECT * FROM notification WHERE userId=? ORDER BY createdAt DESC LIMIT ?').bind(userId,pageLimit(url)).all();
  return json({data:rows.results.map((row)=>parseJsonColumns(row,['payload']))});
}
async function readNotification(env,userId,notificationId){
  const result=await env.DB.prepare('UPDATE notification SET readAt=? WHERE id=? AND userId=?').bind(now(),assertId(notificationId),userId).run();
  if(!result.meta.changes) throw new HttpError(404,'NOTIFICATION_NOT_FOUND');
  return json({data:{read:true}});
}
async function favorites(env,request,userId,parts){
  if(request.method==='GET'){
    const rows=await env.DB.prepare('SELECT resourceType,resourceId,createdAt FROM favorite WHERE userId=? ORDER BY createdAt DESC LIMIT ?').bind(userId,pageLimit(new URL(request.url))).all();
    return json({data:rows.results});
  }
  if(request.method==='POST'){
    const body=await readJson(request); const resourceType=enumField(body.resourceType,'resourceType',['destination','listing','place']);
    const resourceId=stringField(body.resourceId,'resourceId',{required:true,max:160});
    await env.DB.prepare('INSERT OR IGNORE INTO favorite (userId,resourceType,resourceId,createdAt) VALUES (?,?,?,?)').bind(userId,resourceType,resourceId,now()).run();
    return json({data:{resourceType,resourceId}},201);
  }
  const resourceType=enumField(parts[1],'resourceType',['destination','listing','place']);
  const resourceId=stringField(parts[2],'resourceId',{required:true,max:160});
  await env.DB.prepare('DELETE FROM favorite WHERE userId=? AND resourceType=? AND resourceId=?').bind(userId,resourceType,resourceId).run();
  return new Response(null,{status:204});
}

export async function onRequest(context) {
  const { env, request } = context;
  try {
    assertOrigin(request);
    const parts = segments(request);
    if (request.method === 'GET' && parts[0] === 'destinations') return listDestinations(env,request);
    const session = await requireSession(env,request); const userId=session.user.id;
    await consumeRateLimit(env,`${userId}:${parts[0]||'root'}`,{max:120,windowSeconds:60});
    if(parts[0]==='me'&&parts[1]==='profile') return request.method==='GET'?json({data:await getProfile(env,userId)}):request.method==='PATCH'?patchProfile(env,request,userId):json({error:'METHOD_NOT_ALLOWED'},405);
    if(parts[0]==='me'&&parts[1]==='password'&&request.method==='POST'){
      const sessionCreatedAt = Date.parse(session.session?.createdAt || 0);
      if (!Number.isFinite(sessionCreatedAt) || Date.now() - sessionCreatedAt > 10 * 60 * 1000) throw new HttpError(401,'FRESH_SESSION_REQUIRED');
      const body=await readJson(request); const password=stringField(body.password,'password',{required:true,min:15,max:128});
      await createAuth(env,request).api.setPassword({headers:request.headers,body:{newPassword:password}});
      return json({data:{configured:true}});
    }
    if(parts[0]==='trips'&&!parts[1]) return request.method==='GET'?listTrips(env,request,userId):request.method==='POST'?createTrip(env,request,userId):json({error:'METHOD_NOT_ALLOWED'},405);
    if(parts[0]==='trips'&&parts[1]&&parts[2]==='items'&&request.method==='POST') return createTripItem(env,request,userId,parts[1]);
    if(parts[0]==='trips'&&parts[1]&&['GET','PATCH','DELETE'].includes(request.method)) return tripDetail(env,request,userId,parts[1]);
    if(parts[0]==='provider'&&parts[1]==='profile'&&['GET','POST','PATCH'].includes(request.method)) return providerProfile(env,request,userId);
    if(parts[0]==='provider'&&parts[1]==='listings'&&!parts[2]&&['GET','POST'].includes(request.method)) return listings(env,request,userId);
    if(parts[0]==='provider'&&parts[1]==='listings'&&parts[2]&&parts[3]==='availability'&&request.method==='POST') return createAvailability(env,request,userId,parts[2]);
    if(parts[0]==='provider'&&parts[1]==='booking-requests'&&!parts[2]&&request.method==='GET') return listBookings(env,request,userId,true);
    if(parts[0]==='provider'&&parts[1]==='booking-requests'&&parts[2]&&parts[3]==='decision'&&request.method==='POST') return decideBooking(env,request,userId,parts[2]);
    if(parts[0]==='booking-requests'&&!parts[1]) return request.method==='GET'?listBookings(env,request,userId):request.method==='POST'?createBooking(env,request,userId):json({error:'METHOD_NOT_ALLOWED'},405);
    if(parts[0]==='booking-requests'&&parts[1]&&parts[2]==='cancel'&&request.method==='POST') return cancelBooking(env,userId,parts[1]);
    if(parts[0]==='notifications'&&!parts[1]&&request.method==='GET') return notifications(env,request,userId);
    if(parts[0]==='notifications'&&parts[1]&&parts[2]==='read'&&request.method==='POST') return readNotification(env,userId,parts[1]);
    if(parts[0]==='favorites'&&!parts[1]&&['GET','POST'].includes(request.method)) return favorites(env,request,userId,parts);
    if(parts[0]==='favorites'&&parts[1]&&parts[2]&&request.method==='DELETE') return favorites(env,request,userId,parts);
    throw new HttpError(404,'NOT_FOUND');
  } catch (error) { return errorResponse(error); }
}
