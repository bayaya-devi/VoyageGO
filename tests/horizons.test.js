import test from 'node:test';
import assert from 'node:assert/strict';
import { horizons } from '../data/horizons.js';
import { chooseHorizon } from '../horizons.js';

test('the horizon registry contains six unique images in each curated family', () => {
  assert.equal(horizons.length, 18);
  assert.equal(new Set(horizons.map(({ id }) => id)).size, 18);
  assert.equal(new Set(horizons.map(({ image }) => image)).size, 18);
  for (const category of ['atmosphere', 'ocean', 'space']) {
    assert.equal(horizons.filter((horizon) => horizon.category === category).length, 6);
  }
});

test('a new page opening never immediately repeats the stored horizon', () => {
  for (const previous of horizons) {
    assert.notEqual(chooseHorizon(previous.id, () => 0).id, previous.id);
    assert.notEqual(chooseHorizon(previous.id, () => .999999).id, previous.id);
  }
});

