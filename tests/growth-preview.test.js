import test from 'node:test';
import assert from 'node:assert/strict';
import { previewGrowthOf, growthSceneStages, growthTransitionStart, growthTransitionDelay, growthTransitionProgress, GROWTH_DURATION_MS, GROWTH_STAGGER_MS, rowAtDate } from '../src/features/grove/growth-preview.js';

const plots = [{ id: 'radish', zone: 'bed', crop: 'Radish', status: 'planted', plantDate: '2026-01-01', harvestDate: '2026-04-11' }];
const crops = new Map([['Radish', { days: 100 }]]);

test('growth preview rebuilds at a stage boundary, not on every date', () => {
  assert.deepEqual(growthSceneStages(plots, crops, '2026-02-05'), growthSceneStages(plots, crops, '2026-02-06'));
  assert.notDeepEqual(growthSceneStages(plots, crops, '2026-02-06'), growthSceneStages(plots, crops, '2026-04-11'));
});

test('growth preview refreshes selected row dates even without a stage change', () => {
  const row = { id: 'radish', stage: 1, left: 100, zone: 'Bed' };
  const first = rowAtDate(row, plots, crops, '2026-02-05');
  const next = rowAtDate(row, plots, crops, '2026-02-06');
  assert.equal(first.stage, next.stage);
  assert.equal(first.left - next.left, 1);
  assert.equal(row.left, 100);
});
test('growth transitions move in the direction of the selected time', () => {
  assert.ok(growthTransitionStart(2, 4) < 1);
  assert.ok(growthTransitionStart(4, 2) > 1);
  assert.ok(growthTransitionStart(undefined, 2) < 1);
});

test('growth animation offsets are stable and finish within the allotted time', () => {
  const first = growthTransitionDelay('Radish|1.000|0.000|2.000');
  const second = growthTransitionDelay('Radish|1.100|0.000|2.000');
  assert.equal(first, growthTransitionDelay('Radish|1.000|0.000|2.000'));
  assert.notEqual(first, second);
  assert.ok(first >= 0 && first <= GROWTH_STAGGER_MS);
  assert.equal(growthTransitionProgress(first - 1, first), 0);
  assert.equal(growthTransitionProgress(first + GROWTH_DURATION_MS / 2, first), .5);
  assert.equal(growthTransitionProgress(GROWTH_STAGGER_MS + GROWTH_DURATION_MS, first), 1);
});

test('a future preview projects an observation without changing today or claiming the future was observed', () => {
  const plot = { ...plots[0], observedStage: 1 };
  const today = previewGrowthOf(plot, crops.get('Radish'), '2026-02-05', '2026-02-05');
  const future = previewGrowthOf(plot, crops.get('Radish'), '2026-05-16', '2026-02-05');
  assert.equal(today.index, 1);
  assert.equal(today.estimated, false);
  assert.equal(future.index, 5);
  assert.equal(future.estimated, true);
  assert.equal(plot.observedStage, 1);
  assert.notDeepEqual(growthSceneStages([plot], crops, '2026-02-05', '2026-02-05'), growthSceneStages([plot], crops, '2026-05-16', '2026-02-05'));
  assert.equal(rowAtDate({ id: plot.id }, [plot], crops, '2026-05-16', '2026-02-05').stage, 5);
});
