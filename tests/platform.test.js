import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const localeCodes = ['fr','ar','en','es','pt'];
const translations = await Promise.all(localeCodes.map((code)=>import(`../platform/i18n/${code}.js`).then((module)=>module.default)));

function keyShape(value, prefix='') {
  return Object.entries(value).flatMap(([key,entry])=>{
    const path=prefix?`${prefix}.${key}`:key;
    return entry && typeof entry==='object' && !Array.isArray(entry) ? keyShape(entry,path) : [path];
  }).sort();
}

test('all five platform locales expose the same translation contract',()=>{
  const reference=keyShape(translations[0]);
  for(let index=1;index<translations.length;index+=1) assert.deepEqual(keyShape(translations[index]),reference,localeCodes[index]);
});

test('world platform migration stays compact and enforces the booking state model',async()=>{
  const sql=await readFile(new URL('../migrations/0002_world_platform.sql',import.meta.url),'utf8');
  const tables=[...sql.matchAll(/CREATE TABLE IF NOT EXISTS "([^"]+)"/gu)].map((match)=>match[1]);
  assert.deepEqual(tables,['profile','destination','trip','tripItem','providerProfile','listing','availability','bookingRequest','bookingEvent','notification','favorite']);
  assert.match(sql,/pending','accepted','rejected','cancelled','expired','completed/);
  assert.match(sql,/booking_accepted_slot_idx/);
  assert.match(sql,/paymentStatus/);
});

test('commercial services are disabled in every proposed launch destination',async()=>{
  const sql=await readFile(new URL('../migrations/0002_world_platform.sql',import.meta.url),'utf8');
  assert.equal((sql.match(/'published','inactive'/gu)||[]).length,3);
  assert.equal((sql.match(/'request_enabled'/gu)||[]).length,1); // CHECK constraint only.
});

test('versioned API keeps ownership guards and complete personal-resource routes',async()=>{
  const source=await readFile(new URL('../functions/api/v1/[[path]].js',import.meta.url),'utf8');
  assert.match(source,/assertOrigin\(request\)/);
  assert.match(source,/requireSession\(env,request\)/);
  assert.match(source,/WHERE id = \? AND userId = \?/);
  assert.match(source,/FRESH_SESSION_REQUIRED/);
  assert.match(source,/parts\[0\]==='favorites'/);
  assert.match(source,/parts\[0\]==='notifications'/);
  assert.match(source,/idempotency-key/);
});
