import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLegs } from '../src/features/grove/animals3d.js';

test('animal turns continue smoothly when interrupted across the angle boundary', () => {
  const attribute = (values) => ({ array: new Float32Array(values), addUpdateRange() {}, needsUpdate: false });
  const rad = (degrees) => degrees * Math.PI / 180;
  const herd = {
    l1: attribute([0, 0, 0, 0]), l2: attribute([0, 2, 2, 0]),
    b: attribute([0, 1, rad(-170), rad(170)]), ranges: [{ start: 0, count: 1 }],
  };
  applyLegs(herd, [{ idx: 0, from: [1, 1], to: [1, 1], t0: .225, t1: 2, mode: 0, param: 0, heading: 0 }]);
  assert.ok(Math.abs(Math.abs(herd.b.array[3]) - Math.PI) < .001, 'turn resumes from the current heading');
  assert.equal(herd.b.array[2], 0);
  assert.equal(herd.b.needsUpdate, true);
});
