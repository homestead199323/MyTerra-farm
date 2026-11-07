import test from 'node:test';
import assert from 'node:assert/strict';
import { cropGeometry } from '../src/features/grove/crops3d.js';

test('detailed crops stay finite and bounded at every growth stage and detail tier', () => {
  for (const crop of ['Tomato', 'Lettuce', 'Radish', 'Strawberry']) {
    for (let stage = 1; stage <= 5; stage++) {
      let previousCount = Infinity;
      for (let lod = 0; lod <= 2; lod++) {
        const geometry = cropGeometry(crop, stage, lod);
        const positions = geometry.attributes.position;
        assert.ok(Array.from(positions.array).every(Number.isFinite), `${crop}: finite vertices`);
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        assert.ok(box.max.y < 4 && box.min.y > -.5, `${crop}: plausible height`);
        assert.ok(box.max.x - box.min.x < 2 && box.max.z - box.min.z < 2, `${crop}: bounded footprint`);
        assert.ok(positions.count <= previousCount, `${crop}: lower detail never adds vertices`);
        assert.ok(positions.count < 30000, `${crop}: geometry budget`);
        previousCount = positions.count;
      }
    }
  }
});
