import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { africaCountries, africaLocales, africaRegions, getAfricaCountry, voyageGoSilver } from '../data/africa-countries.js';

test('Africa registry covers exactly the 54 requested sovereign states', () => {
  assert.equal(africaCountries.length, 54);
  assert.equal(new Set(africaCountries.map(({ iso2 }) => iso2)).size, 54);
  assert.equal(new Set(africaCountries.map(({ iso3 }) => iso3)).size, 54);
  assert.deepEqual(Object.fromEntries(Object.keys(africaRegions).map((group) => [group, africaCountries.filter((country) => country.group === group).length])), africaRegions);
});

test('every country has complete localized, geographic and visual metadata', () => {
  for (const country of africaCountries) {
    assert.match(country.iso2, /^[A-Z]{2}$/u);
    assert.match(country.iso3, /^[A-Z]{3}$/u);
    assert.match(country.currency, /^[A-Z]{3}$/u);
    assert.ok(country.timeZones.length >= 1);
    assert.equal(country.serviceStatus, 'inactive');
    assert.equal(country.palette.silver, voyageGoSilver);
    assert.ok(Object.values(country.palette).every((color) => /^#[0-9A-F]{6}$/iu.test(color)));
    for (const locale of africaLocales) assert.ok(country.names[locale]?.trim(), `${country.iso2} is missing ${locale}`);
  }
  assert.equal(getAfricaCountry('MAR').iso2, 'MA');
  assert.equal(getAfricaCountry('CD').timeZones.length, 2);
  assert.equal(getAfricaCountry('ZW').currency, 'ZWG');
});

test('production build contains all 270 country and language entry points', async () => {
  for (const country of africaCountries) {
    for (const locale of africaLocales) await access(resolve('dist', country.id, locale, 'index.html'));
  }
  const moroccoFrench = await readFile(resolve('dist', 'ma', 'fr', 'index.html'), 'utf8');
  assert.match(moroccoFrench, /<base href="\.\.\/\.\.\/">/u);
  assert.match(moroccoFrench, /\/ma\/fr\//u);
});
