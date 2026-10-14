import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { cartesianToGeographic, featureAtGeographicPoint, geographicToCartesian } from '../geography/spherical.js';
import { applyTerritoryPolicy } from '../geography/territory-policy.js';

const world = JSON.parse(await readFile(new URL('../geography/world-countries.geojson', import.meta.url), 'utf8'));
const features = world.features;
const productFeatures = applyTerritoryPolicy(features);
const tolerance = 1e-9;

function assertNear(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${message}: expected ${expected}, received ${actual}`);
}

test('cardinal geographic points use east-positive Three.js coordinates', () => {
  const greenwich = geographicToCartesian(0, 0);
  assertNear(greenwich.x, 0, 'Greenwich x');
  assertNear(greenwich.y, 0, 'Greenwich y');
  assertNear(greenwich.z, 1, 'Greenwich z');

  const east = geographicToCartesian(90, 0);
  assertNear(east.x, 1, '90°E x');
  assertNear(east.z, 0, '90°E z');

  const west = geographicToCartesian(-90, 0);
  assertNear(west.x, -1, '90°W x');
  assertNear(west.z, 0, '90°W z');

  const north = geographicToCartesian(0, 90);
  assertNear(north.y, 1, 'North pole y');
});

test('cartesian conversion round-trips global reference coordinates', () => {
  for (const [longitude, latitude] of [[-6, 32], [17, 27], [2.35, 48.86], [139.69, 35.68], [151.21, -33.87], [-46.63, -23.55], [179.5, -17.7], [-179.5, 65]]) {
    const point = geographicToCartesian(longitude, latitude, 2.4);
    const result = cartesianToGeographic(point.x, point.y, point.z);
    assertNear(result.longitude, longitude, `longitude ${longitude},${latitude}`);
    assertNear(result.latitude, latitude, `latitude ${longitude},${latitude}`);
  }
});

test('Three.js sphere UVs align with a standard equirectangular texture', () => {
  for (const longitude of [-179, -90, -6, 0, 17, 90, 179]) {
    const point = geographicToCartesian(longitude, 0);
    let phi = Math.atan2(point.z, -point.x);
    if (phi < 0) phi += Math.PI * 2;
    const sphereU = phi / (Math.PI * 2);
    const sampledU = (sphereU + .25) % 1;
    const expectedU = (longitude + 180) / 360;
    assertNear(sampledU, expectedU, `texture U at ${longitude}°`);
  }
});

test('known inland coordinates select the expected countries', () => {
  const references = [
    ['MAR', -6, 32], ['DZA', 2, 28], ['TUN', 9, 34], ['LBY', 17, 27], ['EGY', 30, 27],
    ['ZAF', 24, -29], ['MDG', 47, -19], ['FRA', 2, 47], ['ESP', -4, 40], ['PRT', -8, 39],
    ['ITA', 12, 42], ['DEU', 10, 51], ['GBR', -2, 54], ['CHN', 104, 35], ['IND', 79, 22],
    ['THA', 101, 15], ['JPN', 138, 36], ['IDN', 114, -2], ['CAN', -106, 56], ['USA', -100, 39],
    ['MEX', -102, 23], ['BRA', -52, -10], ['ARG', -64, -34], ['AUS', 134, -25], ['NZL', 172, -42],
  ];
  for (const [iso3, longitude, latitude] of references) {
    const feature = featureAtGeographicPoint(features, longitude, latitude);
    assert.equal(feature?.properties.iso3, iso3, `${longitude},${latitude} should select ${iso3}`);
  }
});

test('ocean points do not select distant countries and antimeridian islands remain selectable', () => {
  for (const [longitude, latitude] of [[-30, 0], [-140, 0], [70, -45], [-160, 45]]) {
    assert.equal(featureAtGeographicPoint(features, longitude, latitude), undefined, `${longitude},${latitude} should be ocean`);
  }
  assert.equal(featureAtGeographicPoint(features, 178.1, -17.8)?.properties.iso3, 'FJI');
});

test('VoyageGo map policy renders and selects Western Sahara as part of Morocco', () => {
  assert.equal(productFeatures.some((feature) => feature.properties.iso3 === 'ESH'), false);
  for (const [longitude, latitude] of [[-13.2, 24.3],[-15.5,23.5],[-12.8,26.4]]) {
    assert.equal(featureAtGeographicPoint(productFeatures,longitude,latitude)?.properties.iso3,'MAR',`${longitude},${latitude} should select Morocco`);
  }
  const morocco=productFeatures.find((feature)=>feature.properties.iso3==='MAR');
  assert.equal(morocco.geometry.type,'Polygon');
  assert.ok(morocco.geometry.coordinates[0].some(([longitude,latitude])=>longitude < -16 && latitude < 22));
});
