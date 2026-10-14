import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { africaCountries } from '../data/africa-countries.js';

const root = resolve(import.meta.dirname, '..');
const geojson = JSON.parse(await readFile(resolve(root, 'geography/world-countries.geojson'), 'utf8'));
const byIso3 = new Map(geojson.features.map((feature) => [feature.properties.iso3, feature]));
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

function geometryCenter(feature) {
  const points = [];
  const visit = (value) => {
    if (Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') points.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
  };
  visit(feature.geometry.coordinates);
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  return {
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  };
}

const rows = africaCountries.map((country) => {
  const feature = byIso3.get(country.iso3);
  if (!feature) throw new Error(`Missing GeoJSON feature for ${country.iso3}`);
  const center = geometryCenter(feature);
  const capabilities = { ...country.capabilities, countryInterface: true };
  return `(${[
    quote(country.iso2), quote(country.iso3), quote(JSON.stringify(country.names)), quote('{}'),
    center.latitude.toFixed(6), center.longitude.toFixed(6),
    quote(country.contentStatus === 'published' ? 'published' : 'preparing'), quote(country.serviceStatus),
    quote(JSON.stringify(capabilities)), quote(country.palette.primary), 'unixepoch()',
    quote(country.group), quote(country.currency), quote(JSON.stringify(country.timeZones)),
    quote(JSON.stringify(country.palette)), quote(country.validationStatus), quote(JSON.stringify(country.sources)),
  ].join(',')})`;
});

const migration = `-- Generated from data/africa-countries.js. Do not hand-edit registry rows.\n` +
`ALTER TABLE "destination" ADD COLUMN "regionGroup" TEXT;\n` +
`ALTER TABLE "destination" ADD COLUMN "currencyCode" TEXT;\n` +
`ALTER TABLE "destination" ADD COLUMN "timeZones" TEXT NOT NULL DEFAULT '[]';\n` +
`ALTER TABLE "destination" ADD COLUMN "palette" TEXT NOT NULL DEFAULT '{}';\n` +
`ALTER TABLE "destination" ADD COLUMN "validationStatus" TEXT NOT NULL DEFAULT 'unverified';\n` +
`ALTER TABLE "destination" ADD COLUMN "sourceRefs" TEXT NOT NULL DEFAULT '{}';\n\n` +
`INSERT INTO "destination" ("iso2","iso3","names","summary","latitude","longitude","contentStatus","serviceStatus","capabilities","accent","updatedAt","regionGroup","currencyCode","timeZones","palette","validationStatus","sourceRefs") VALUES\n${rows.join(',\n')}\n` +
`ON CONFLICT("iso2") DO UPDATE SET\n` +
`  "iso3"=excluded."iso3", "names"=excluded."names", "latitude"=excluded."latitude", "longitude"=excluded."longitude",\n` +
`  "contentStatus"=excluded."contentStatus", "serviceStatus"=excluded."serviceStatus", "capabilities"=excluded."capabilities",\n` +
`  "accent"=excluded."accent", "updatedAt"=excluded."updatedAt", "regionGroup"=excluded."regionGroup",\n` +
`  "currencyCode"=excluded."currencyCode", "timeZones"=excluded."timeZones", "palette"=excluded."palette",\n` +
`  "validationStatus"=excluded."validationStatus", "sourceRefs"=excluded."sourceRefs";\n`;

await writeFile(resolve(root, 'migrations/0003_africa_registry.sql'), migration);
console.log(`Generated D1 migration for ${rows.length} African countries.`);
