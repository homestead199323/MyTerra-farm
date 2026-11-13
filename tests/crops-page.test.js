import test from 'node:test';
import assert from 'node:assert/strict';
import { cropSections, sectionOpen, sectionOfPlot, rowStatus, isReady, OPEN_ALL_UP_TO } from '../src/features/farm/crops-model.js';
import { CROP_MAP } from '../src/data/crops.js';

const TODAY = '2026-11-13';
const plot = (id, crop, zone, harvestDate, extra = {}) => ({ id, crop, zone, status: 'planted', plantDate: '2026-09-01', harvestDate, plantCount: 4, expectedYieldKg: 2, ...extra });
const data = {
  zones: [{ id: 'veg', type: 'veg', name: 'Bed' }, { id: 'herbs', type: 'herbs', name: 'Herb bed' }, { id: 'orch', type: 'orchard', name: 'Orchard' }],
  garden: { plots: [
    plot('late', 'Carrot', 'veg', '2027-01-10'),
    plot('ready', 'Lettuce', 'veg', '2026-11-10'),
    plot('basil', 'Basil', 'herbs', '2026-12-01'),
    plot('apple', 'Apple', 'orch', '2027-09-01'),
    plot('gone', 'Radish', 'veg', '2026-10-01', { status: 'harvested' }),
  ] },
};

test('crops page: groups by kind, soonest harvest first, harvested plantings left out', () => {
  const secs = cropSections(data, CROP_MAP, TODAY);
  assert.deepEqual(secs.map((s) => s.key), ['beds', 'herbs', 'orchard']);
  assert.deepEqual(secs[0].plots.map((p) => p.id), ['ready', 'late']);
  assert.equal(secs[0].ready, 1);
  assert.equal(secs[2].unit, 'trees');
});

test('crops page: a balcony calls its beds pots and planters; empty groups are not listed', () => {
  const secs = cropSections({ ...data, garden: { plots: [data.garden.plots[0]] } }, CROP_MAP, TODAY, 'balcony');
  assert.deepEqual(secs.map((s) => s.title), ['Pots and planters']);
});

test('crops page: a short list shows everything, a long one starts closed except the picked crop\'s group', () => {
  assert.equal(sectionOpen('beds', { choice: {}, total: OPEN_ALL_UP_TO, selectedKey: null }), true);
  assert.equal(sectionOpen('beds', { choice: {}, total: OPEN_ALL_UP_TO + 1, selectedKey: null }), false);
  assert.equal(sectionOpen('seedlings', { choice: {}, total: 20, selectedKey: 'beds' }), false);
  assert.equal(sectionOpen('beds', { choice: {}, total: 20, selectedKey: 'beds' }), true);
  // what the user chose wins either way
  assert.equal(sectionOpen('beds', { choice: { beds: false }, total: 2, selectedKey: 'beds' }), false);
  assert.equal(sectionOpen('herbs', { choice: { herbs: true }, total: 20, selectedKey: null }), true);
});

test('crops page: finds the group of a planting', () => {
  const secs = cropSections(data, CROP_MAP, TODAY);
  assert.equal(sectionOfPlot(secs, 'basil'), 'herbs');
  assert.equal(sectionOfPlot(secs, 'gone'), null);
});

test('crops page: a row says the one thing worth knowing', () => {
  const g = { label: 'Growing' };
  assert.deepEqual(rowStatus(plot('a', 'Lettuce', 'veg', '2026-11-10'), g, TODAY), { text: 'Ready to pick', tone: 'ready' });
  assert.equal(rowStatus(plot('a', 'Lettuce', 'veg', '2026-11-14'), g, TODAY).text, '1 day to harvest');
  assert.equal(rowStatus(plot('a', 'Lettuce', 'veg', '2026-12-25'), g, TODAY).text, '6 weeks to harvest');
  assert.equal(rowStatus(plot('a', 'Apple', 'orch', '2027-09-01'), g, TODAY).text, '10 months to harvest');
  assert.deepEqual(rowStatus(plot('a', 'Lettuce', 'veg', '', { status: 'planned', plantDate: '' }), g, TODAY), { text: 'Planned', tone: 'wait' });
  assert.deepEqual(rowStatus(plot('a', 'Lettuce', 'veg', ''), { label: 'Sow in March', waiting: true }, TODAY), { text: 'Sow in March', tone: 'wait' });
  // a plan is never "ready", even with an old date on it
  assert.equal(isReady(plot('a', 'Lettuce', 'veg', '2026-11-01', { status: 'planned' }), TODAY), false);
});

import { stepsAlreadyPlanted } from '../src/lib/sowing.js';
test('planting saved as already in the ground: preparing and planting are ticked, later steps stay open', () => {
  const steps = [{ l: 'Chit', d: -21 }, { l: 'Plant', d: 0 }, { l: 'Earth up', d: 21 }, { l: 'Harvest', d: 90 }];
  assert.deepEqual(stepsAlreadyPlanted(steps).map((s) => s.done), [true, true, false, false]);
  assert.deepEqual(stepsAlreadyPlanted([{ l: 'Sow', d: 0 }, { l: 'Thin', d: 14 }]).map((s) => s.done), [true, false]);
  assert.equal(stepsAlreadyPlanted(undefined), undefined);
});
