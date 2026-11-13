import test from 'node:test';
import assert from 'node:assert/strict';
import { waitingFields, isAwaitingSowing, sowWindowOpen, waitingLabel } from '../src/lib/sowing.js';
import { plannedFields, migratePlanned } from '../src/lib/planned.js';
import { buildTaskQueue } from '../src/lib/task-queue.js';
import { monthPlan } from '../src/lib/month-plan.js';
import { CROP_MAP } from '../src/data/crops.js';

// A planting saved from the form without a date (status "planned", nothing else).
const plan = (crop, extra = {}) => ({ id: 'p-' + crop, crop, name: crop, zone: 'bed', status: 'planned', plantDate: '', harvestDate: '', plantCount: 6,
  steps: CROP_MAP.get(crop).steps.map((s) => ({ ...s, done: false })), ...extra });
const farm = (plots, extra = {}) => ({ region: 'western_europe', zones: [{ id: 'bed', name: 'Raised Bed', type: 'raised' }], garden: { plots }, livestock: { animals: [] }, completions: {}, ...extra });
const NOV = '2026-11-11';
const on = (key) => new Date(key + 'T12:00:00');

test('A dateless plan waits: window open → job now, window later → the month it opens', () => {
  assert.deepEqual(waitingFields({ status: 'now', month: 10 }, NOV), { sowPending: true });
  assert.deepEqual(waitingFields({ status: 'soon', month: 11 }, NOV), { sowPending: true });
  assert.deepEqual(waitingFields({ status: 'later', month: 2 }, NOV), { sowFrom: '2027-03' });
  assert.deepEqual(waitingFields({ status: 'later', month: 11 }, '2026-10-02'), { sowFrom: '2026-12' });
  // garlic goes in Oct–Nov in Western Europe; tomato waits for late winter
  assert.deepEqual(plannedFields('Garlic', 'western_europe', NOV), { sowPending: true });
  assert.match(plannedFields('Tomato', 'western_europe', NOV).sowFrom, /^2027-0[1-4]$/);
});

test('A plan made in season puts its first job on Today; out of season it stays quiet until its month', () => {
  const garlic = { ...plan('Garlic'), ...plannedFields('Garlic', 'western_europe', NOV) };
  assert(isAwaitingSowing(garlic));
  const jobs = buildTaskQueue(farm([garlic]), { now: on(NOV) }).filter((t) => t.plotId === garlic.id);
  assert.equal(jobs.length, 1);
  assert.match(jobs[0].title, /Garlic: Plant cloves/);
  assert.equal(waitingLabel(garlic, NOV), 'Ready to plant');

  const tomato = { ...plan('Tomato'), ...plannedFields('Tomato', 'western_europe', NOV) };
  assert(isAwaitingSowing(tomato));
  assert.equal(sowWindowOpen(tomato, NOV), false);
  assert.equal(buildTaskQueue(farm([tomato]), { now: on(NOV) }).filter((t) => t.plotId === tomato.id).length, 0);
  assert.equal(buildTaskQueue(farm([tomato]), { now: on(tomato.sowFrom + '-10') }).filter((t) => t.plotId === tomato.id).length >= 1, true);
});

test('Plans saved before the fix get their flag on load; dated, waiting and nursery plantings are left alone', () => {
  const old = plan('Garlic'), dated = plan('Kale', { status: 'planted', plantDate: '2026-09-01' }),
    waiting = plan('Pea', { sowFrom: '2027-02' }), nursery = plan('Tomato', { plannedDate: '2027-05-20' }), batch = plan('Leek');
  assert.equal(buildTaskQueue(farm([old]), { now: on(NOV) }).length, 0); // the bug: a plan with no job
  const data = farm([old, dated, waiting, nursery, batch], { nursery: { batches: [{ id: 'b1', plotId: batch.id, crop: 'Leek', stage: 'sown' }] } });
  const next = migratePlanned(data, NOV), by = (id) => next.garden.plots.find((p) => p.id === id);
  assert.equal(by(old.id).sowPending, true);
  assert.equal(by(dated.id), dated);
  assert.equal(by(waiting.id), waiting);
  assert.equal(by(nursery.id), nursery);
  assert.equal(by(batch.id), batch);
  assert.equal(buildTaskQueue(next, { now: on(NOV) }).filter((t) => t.plotId === old.id).length, 1);
  assert.equal(migratePlanned(next, NOV), next); // nothing left to do: same object
  assert.equal(migratePlanned({ garden: { plots: [] } }, NOV).garden.plots.length, 0);
});

test('The calendar says Planned for a crop that is not in the ground yet, Growing once it is', () => {
  const tag = (plots) => monthPlan(farm(plots), 10, NOV).outside.find((i) => i.name === 'Garlic');
  assert.equal(tag([{ ...plan('Garlic'), sowPending: true }]).waiting, true);
  assert.equal(tag([plan('Garlic', { status: 'planted', plantDate: '2026-11-01' })]).waiting, false);
  assert.equal(tag([]).mine, false);
});

import { maxPlantCount, planPlanting, plantingInput } from '../src/features/quiet/planting-plan.js';
test('"Up to N" is the most plants the free space takes: N fits, N + 1 does not', () => {
  const garlic = CROP_MAP.get('Garlic');
  const planter = { id: 'pl', type: 'container', wM: 2.2, hM: 0.45 };
  const input = plantingInput({ mode: 'plants', plantCount: '' }, garlic, planter);
  const n = maxPlantCount(planter, [], input, garlic);
  assert(n >= 1);
  assert.equal(planPlanting(planter, [], { ...input, plantCount: n }, garlic).error, '');
  assert.notEqual(planPlanting(planter, [], { ...input, plantCount: n + 1 }, garlic).error, '');
  // a bed that is already full takes none
  const full = planPlanting(planter, [], { ...input, plantCount: n }, garlic);
  const taken = [{ id: 'a', zone: 'pl', crop: 'Garlic', status: 'planted', plantCount: n, layout: full.layout }];
  assert.equal(maxPlantCount(planter, taken, input, garlic), 0);
});

import { growsInPots, potGrower } from '../src/lib/suggest.js';
test('Pots: the picker and calendar know what crops in a pot, and who grows only in pots', () => {
  ['Lettuce', 'Garlic', 'Potato', 'Fig', 'Lemon'].forEach((n) => assert(growsInPots(n), n));
  ['Wheat', 'Walnut', 'Apple', 'Pumpkin', 'Asparagus'].forEach((n) => assert(!growsInPots(n), n));
  ['Garlic', 'Potato', 'Fig'].forEach((n) => assert(CROP_MAP.has(n)));
  assert(potGrower({ profile: { environment: 'balcony' }, zones: [] }));
  assert(potGrower({ zones: [{ type: 'container' }, { type: 'coop' }] }));
  assert(!potGrower({ zones: [{ type: 'container' }, { type: 'raised' }] }));
  assert(!potGrower({ zones: [] }));
});

import { suggestCrops, sowTiming } from '../src/lib/suggest.js';
import { cropFamily } from '../src/features/grove/crop-families.js';
import { getCropDifficulty } from '../src/lib/calendar.js';
test('Windowsill crops: still valid data, but no space offers them (decided 2026-11-13: nobody grows cress on a balcony)', () => {
  const trays = ['Cress', 'Pea Shoots', 'Microgreens'];
  for (const name of trays) {
    const crop = CROP_MAP.get(name);
    assert(crop && crop.tray, name);
    for (let m = 0; m < 12; m++) assert.equal(sowTiming(crop, 'western_europe', new Date(2026, m, 10)).status, 'now', name + ' ' + m);
    assert.equal(getCropDifficulty(name).l, 'Easy');
    assert.equal(cropFamily(name).family, 'leafy', name + ' is drawn as a carpet of leaves, not as a pea plant');
    assert.deepEqual(plannedFields(name, 'western_europe', NOV), { sowPending: true });
  }
  const nov = new Date(2026, 10, 11);
  for (const environment of ['balcony', 'backyard', 'farm']) {
    const picks = suggestCrops({ environment, sunlight: 'lt3', experience: 'beginner' }, 'western_europe', { date: nov }).map((c) => c.name);
    trays.forEach((n) => assert(!picks.includes(n), n + ' offered on a ' + environment + ': ' + picks.join(', ')));
    assert(picks.length >= 3, environment + ' still gets crops for the coming months: ' + picks.join(', '));
  }
  const jan = monthPlan(farm([]), 0, '2026-01-10');
  trays.forEach((n) => assert(!jan.indoors.some((i) => i.name === n) && !jan.outside.some((i) => i.name === n), n));
});
