import test from 'node:test';
import assert from 'node:assert/strict';
import { growsHere, keepsAnimals, suggestCrops, sowTiming, startsAsYoungPlant } from '../src/lib/suggest.js';
import { cropFitsZone, planPlanting } from '../src/features/quiet/planting-plan.js';
import { monthPlan, monthTip } from '../src/lib/month-plan.js';
import { CROP_MAP } from '../src/data/crops.js';

const balcony = { profile: { environment: 'balcony' }, zones: [{ id: 'c', type: 'container' }, { id: 'r', type: 'raised' }], garden: { plots: [] } };
const garden = { profile: { environment: 'backyard' }, zones: [{ id: 'v', type: 'veg' }, { id: 'c', type: 'container' }], garden: { plots: [] } };

test('fits: a balcony is never offered a tree, or a crop that needs open ground', () => {
  for (const name of ['Fig', 'Lemon', 'Olive', 'Apple', 'Pumpkin', 'Corn', 'Wheat']) assert.equal(growsHere(name, balcony), false, name);
  assert.equal(growsHere('Fig', balcony, balcony.zones[1]), false); // not in a balcony planter box either
  for (const name of ['Tomato', 'Basil', 'Lettuce', 'Strawberry', 'Pepper (Hot)']) assert.equal(growsHere(name, balcony), true, name);
});

test('fits: a balcony is offered what people really grow there, nothing else', () => {
  for (const name of ['Potato', 'Onion', 'Turnip', 'Cabbage', 'Cress', 'Microgreens', 'Pea Shoots']) assert.equal(growsHere(name, balcony), false, name);
  for (const name of ['Pepper (Sweet)', 'Eggplant', 'Cucumber', 'Rosemary', 'Thyme', 'Parsley', 'Mint', 'Radish']) assert.equal(growsHere(name, balcony), true, name);
  const may = suggestCrops({ environment: 'balcony', experience: 'beginner' }, 'western_europe', { date: new Date(2026, 4, 20), limit: 3 }).map((c) => c.name);
  assert.deepEqual(may, ['Tomato', 'Pepper (Sweet)', 'Basil']); // the balcony classics lead, even for a beginner
});

test('fits: a back garden gets no field crops, forest trees or windowsill trays', () => {
  for (const name of ['Wheat', 'Lentil', 'Chickpea', 'Walnut', 'Chestnut', 'Cress']) assert.equal(growsHere(name, garden), false, name);
  for (const name of ['Apple', 'Potato', 'Pumpkin', 'Corn', 'Rhubarb']) assert.equal(growsHere(name, garden), true, name);
  for (let m = 0; m < 12; m++) suggestCrops(garden.profile, 'western_europe', { month: m, limit: 30 }).forEach((c) => assert.ok(growsHere(c.name, garden), `${c.name} in month ${m}`));
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

test('young plants: tomatoes, peppers and potted herbs go in after the last frost, not in their seed months', () => {
  const tomato = CROP_MAP.get('Tomato');
  const at = (m, d) => sowTiming(tomato, 'western_europe', new Date(2026, m, d));
  assert.equal(at(2, 10).status, 'later'); // March: seed time indoors, far too cold for a plant outside
  assert.equal(at(2, 10).month, 4);
  assert.equal(at(4, 5).status, 'soon'); // early May: two weeks before the plant-out date
  assert.equal(at(5, 10).status, 'now'); // June
  assert.equal(at(5, 10).verb, 'Plant');
  assert.equal(at(5, 10).young, true);
  assert.equal(at(8, 10).status, 'later'); // September: too late for a fruiting crop
  assert.equal(sowTiming(tomato, 'mediterranean', new Date(2026, 3, 10)).status, 'now'); // April in the south
  assert.equal(sowTiming(CROP_MAP.get('Thyme'), 'western_europe', new Date(2026, 2, 10)).status, 'now'); // hardy herb: its spring months too
  assert.equal(startsAsYoungPlant(CROP_MAP.get('Onion')), false); // onion sets keep their listed months
  assert.equal(startsAsYoungPlant(CROP_MAP.get('Lettuce')), false); // sown, not planted
});

test('balcony pots: a tomato goes in a pot on a narrow trough, plants still keep their spacing along it', () => {
  const tomato = CROP_MAP.get('Tomato');
  const trough = { id: 't', type: 'container', wM: 1.5, hM: 0.5, xM: 0, yM: 0, rowAxis: 'horizontal' };
  const two = planPlanting(trough, [], { plantCount: 2 }, tomato);
  assert.equal(two.error, '', two.error);
  assert.equal(two.count, 2);
  assert.ok(two.layout.widthM <= 0.3 + 1e-9, 'the pots use the trough, not a 50 cm strip');
  assert.ok(planPlanting(trough, [], { plantCount: 4 }, tomato).error, 'four tomatoes need more than 1.5 m');
  // a bed is still a bed: the same row in a raised bed needs its full width
  assert.ok(planPlanting({ ...trough, type: 'raised' }, [], { plantCount: 2 }, tomato).error);
});
