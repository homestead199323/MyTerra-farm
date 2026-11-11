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
