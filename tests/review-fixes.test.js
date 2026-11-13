// Fixes from the 12 Nov 2026 usability review.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LDB as LIVESTOCK_DB } from '../src/data/livestock.js';
import { PRESERVATION } from '../src/data/preservation.js';
import { CROPS } from '../src/data/crops.js';
import { stockLines, currentStorageNote } from '../src/lib/inventory.js';

const all = (o) => JSON.stringify(o);

test('no egg advice recommends water glassing', () => {
  assert.doesNotMatch(all(LIVESTOCK_DB), /water.?glass/i);
  assert.doesNotMatch(all(PRESERVATION), /water.?glass/i);
});

test('existing pantry lots with the old egg note show the new advice', () => {
  const [line] = stockLines([{ name: 'Chicken Eggs', unit: 'pcs', category: 'Eggs', qty: 2, storageNote: 'Unwashed 2-3wk. Water glass 12+mo.' }]);
  assert.doesNotMatch(line.storageNote, /water/i);
  assert.match(line.storageNote, /Fridge/);
  assert.equal(currentStorageNote('Something water-glass related'), '');
  assert.equal(currentStorageNote('Fresh 3-5 days.'), 'Fresh 3-5 days.');
});

test('oil preservation never promises months for fresh or cooked garlic, herbs or vegetables', () => {
  const o = PRESERVATION.oil_preservation;
  assert.doesNotMatch(o.shelf, /month/i);
  assert.match(o.shelf, /4 days/);
  assert.doesNotMatch(o.tip, /weeks/i);
  assert.match(o.overview, /does not kill the spores/i);
  assert.ok(o.sources && /Home Food Preservation/.test(o.sources));
  assert.doesNotMatch(o.method, /1g per 100g/);
});

test('no crop storage hint keeps food in oil for months', () => {
  CROPS.forEach((c) => {
    if (c.storage && /\bin oil\b/i.test(c.storage) && !/freeze in oil/i.test(c.storage))
      assert.match(c.storage, /4 days/, c.name);
  });
});

test('storage notes fit the pantry card (70 chars)', () => {
  assert.ok(LIVESTOCK_DB.Chicken.out.Eggs.s.length <= 70);
  CROPS.forEach((c) => { if (c.storage && /\bin oil\b/i.test(c.storage)) assert.ok(c.storage.length <= 70, c.name); });
});
