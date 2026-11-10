import test from 'node:test';
import assert from 'node:assert/strict';
import { usesSeedling } from '../src/features/quiet/planting-mode.js';
import { plantingInput, planPlanting } from '../src/features/quiet/planting-plan.js';
import { axisOf } from '../src/features/quiet/farm-model.js';

const tomato = { name: 'Tomato', cat: 'Vegetable', spacing: 50 };
const nursery = [{ id: 'n1', type: 'nursery' }];

test('Seedling section stays closed by default, even for transplant crops', () => {
  assert.equal(usesSeedling({ canNursery: true, nurseries: nursery, form: {} }), false);
  assert.equal(usesSeedling({ canNursery: true, nurseries: nursery, form: { fromSeed: false } }), false);
});

test('Seedling section opens only when asked, and only if a nursery exists', () => {
  assert.equal(usesSeedling({ canNursery: true, nurseries: nursery, form: { fromSeed: true } }), true);
  assert.equal(usesSeedling({ canNursery: true, nurseries: [], form: { fromSeed: true } }), false);
  assert.equal(usesSeedling({ canNursery: false, nurseries: nursery, form: { fromSeed: true } }), false);
});

test('A planting with no chosen direction follows the bed, horizontal or rotated', () => {
  for (const [bed, want] of [
    [{ id: 'b', type: 'veg', wM: 4, hM: 2.4 }, 'horizontal'],
    [{ id: 'b', type: 'veg', wM: 2.4, hM: 4, rowAxis: 'vertical' }, 'vertical'],
  ]) {
    const input = plantingInput({ plantCount: 20, mode: 'plants' }, tomato, bed);
    const plan = planPlanting(bed, [], input, tomato);
    assert.equal(plan.error, '');
    assert.notEqual(plan.layout.across, true);
    assert.equal(axisOf(bed, plan.layout), want);
  }
});

test('Hexagonal (offset) spacing makes rows sqrt(3)/2 of the plant spacing', () => {
  const bed = { id: 'b', type: 'veg', wM: 4, hM: 2.4 };
  const input = plantingInput({ plantCount: 20, mode: 'plants', pattern: 'offset', spacingCM: 30 }, tomato, bed);
  assert.equal(input.rowSpacingCM, 26);
});

test('Only plants and spacing are entered: the row length comes from the plants, capped by the bed', () => {
  const bed = { id: 'b', type: 'veg', wM: 9, hM: 1.2 };
  const leek = { name: 'Leek', cat: 'Vegetable', spacing: 15 };
  // hexagonal: one spacing; rows sit sqrt(3)/2 of it apart so every neighbour is 15 cm away
  const hex = planPlanting(bed, [], plantingInput({ plantCount: 18, mode: 'plants', pattern: 'offset', spacingCM: 15 }, leek, bed), leek);
  assert.equal(hex.error, '');
  assert.equal(hex.count, 18);
  assert.equal(hex.layout.rowSpacingCM, 13);
  assert(hex.layout.lengthM < bed.wM, 'a small planting leaves the rest of the bed free');
  // grid: plant spacing and row spacing are separate
  const grid = planPlanting(bed, [], plantingInput({ plantCount: 40, mode: 'plants', pattern: 'rows', spacingCM: 20, rowSpacingCM: 30 }, leek, bed), leek);
  assert.equal(grid.error, '');
  assert.equal(grid.layout.spacingCM, 20);
  assert.equal(grid.layout.rowSpacingCM, 30);
  // more plants than one bed-length row holds wrap onto more rows; rows never exceed the bed
  const full = planPlanting(bed, [], plantingInput({ plantCount: 100, mode: 'plants', pattern: 'rows', spacingCM: 15, rowSpacingCM: 20 }, leek, bed), leek);
  assert.equal(full.error, '');
  assert(full.layout.lengthM <= bed.wM);
  assert(full.rows >= 2);
});

import { editablePlanting } from '../src/features/quiet/planting-plan.js';
test('A planting in a bed can be edited from its detail; harvested or bed-less ones cannot', () => {
  const bed = { id: 'b', type: 'veg', wM: 9, hM: 1.2 };
  const leek = { name: 'Leek', cat: 'Vegetable', spacing: 15 };
  const plan = planPlanting(bed, [], plantingInput({ plantCount: 18, mode: 'plants', spacingCM: 15 }, leek, bed), leek);
  const plot = { id: 'p', zone: 'b', crop: 'Leek', plantCount: 18, status: 'planted', layout: plan.layout };
  const data = { farmW: 50, farmH: 50, zones: [bed], garden: { plots: [plot] } };
  const e = editablePlanting(data, plot);
  assert.equal(e.plot.id, 'p');
  assert.equal(e.zone.wM, 9);
  assert.equal(editablePlanting(data, { ...plot, status: 'harvested' }), null);
  assert.equal(editablePlanting(data, { ...plot, zone: 'gone' }), null);
});
