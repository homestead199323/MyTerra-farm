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
