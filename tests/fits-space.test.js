import test from 'node:test';
import assert from 'node:assert/strict';
import { growsHere, keepsAnimals, suggestCrops } from '../src/lib/suggest.js';
import { cropFitsZone } from '../src/features/quiet/planting-plan.js';
import { monthPlan, monthTip } from '../src/lib/month-plan.js';
import { CROP_MAP } from '../src/data/crops.js';

const balcony = { profile: { environment: 'balcony' }, zones: [{ id: 'c', type: 'container' }, { id: 'r', type: 'raised' }], garden: { plots: [] } };
const garden = { profile: { environment: 'backyard' }, zones: [{ id: 'v', type: 'veg' }, { id: 'c', type: 'container' }], garden: { plots: [] } };

test('fits: a balcony is never offered a tree, or a crop that needs open ground', () => {
  for (const name of ['Fig', 'Lemon', 'Olive', 'Apple', 'Pumpkin', 'Corn', 'Wheat']) assert.equal(growsHere(name, balcony), false, name);
  assert.equal(growsHere('Fig', balcony, balcony.zones[1]), false); // not in a balcony planter box either
  for (const name of ['Tomato', 'Basil', 'Lettuce', 'Strawberry', 'Cress']) assert.equal(growsHere(name, balcony), true, name);
});

test('fits: a garden grows anything in the ground, and a patio tree in a pot', () => {
  assert.equal(growsHere('Apple', garden), true);
  assert.equal(growsHere('Pumpkin', garden, garden.zones[0]), true);
  assert.equal(growsHere('Fig', garden, garden.zones[1]), true);
  assert.equal(growsHere('Apple', garden, garden.zones[1]), false);
  assert.equal(growsHere('Pumpkin', garden, garden.zones[1]), false);
});

test('fits: only patio trees go in a container area', () => {
  assert.equal(cropFitsZone(CROP_MAP.get('Fig'), { type: 'container' }), true);
  assert.equal(cropFitsZone(CROP_MAP.get('Apple'), { type: 'container' }), false);
  assert.equal(cropFitsZone(CROP_MAP.get('Apple'), { type: 'orchard' }), true);
});

test('fits: the balcony calendar and suggestions hold no tree in any month', () => {
  const trees = new Set(['Fig', 'Lemon', 'Orange', 'Olive', 'Apple', 'Pear', 'Plum', 'Cherry', 'Peach', 'Apricot', 'Walnut', 'Pomegranate', 'Grape']);
  for (let m = 0; m < 12; m++) {
    const plan = monthPlan(balcony, m, '2026-11-12');
    for (const k of ['indoors', 'outside', 'plantOut', 'plant', 'harvest']) plan[k].forEach((it) => assert.ok(!trees.has(it.name) && growsHere(it.name, balcony), `${it.name} in month ${m} (${k})`));
    suggestCrops(balcony.profile, 'western_europe', { month: m, limit: 30 }).forEach((c) => assert.ok(growsHere(c.name, balcony), `${c.name} suggested in month ${m}`));
  }
  assert.ok(!/tree/i.test(monthTip(balcony, 0)));
});

test('fits: what is already growing stays on the calendar, and a balcony keeps no animals', () => {
  const mine = { ...balcony, garden: { plots: [{ id: 'p', crop: 'Fig', status: 'planted', plantDate: '2026-04-01', zone: 'c' }] } };
  const all = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].flatMap((m) => monthPlan(mine, m, '2026-11-12').harvest.map((it) => it.name));
  assert.ok(all.includes('Fig'));
  assert.equal(keepsAnimals(balcony), false);
  assert.equal(keepsAnimals(garden), true);
  assert.equal(keepsAnimals({}), true);
});
