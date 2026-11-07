import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { focusDistance } from '../src/features/grove/focus-camera.js';
import { buildCrops } from '../src/features/grove/crops3d.js';

test('focus keeps balcony pots, rotated long beds and tall buildings inside the perspective frame', () => {
  for (const [w, h, d] of [[.5, 1.8, .5], [1.2, 2.4, 10], [10, 2.4, 1.2], [8, 7, 5]]) {
    const bounds = new THREE.Box3(new THREE.Vector3(4, 0, 3), new THREE.Vector3(4 + w, h, 3 + d));
    const target = bounds.getCenter(new THREE.Vector3()); target.y = 0;
    for (const aspect of [375 / 812, 812 / 375, 1200 / 700]) {
      for (const az of [-90, -22, 45, 180]) {
        for (const el of [26, 60, 82]) {
          const theta = az * Math.PI / 180, phi = el * Math.PI / 180;
          const dist = focusDistance(bounds, { target, theta, phi, fov: 28, aspect });
          assert.ok(Number.isFinite(dist) && dist > 1);
          const camera = new THREE.PerspectiveCamera(28, aspect, 1, 4000);
          camera.position.set(target.x + Math.sin(theta) * Math.cos(phi) * dist,
            Math.sin(phi) * dist, target.z + Math.cos(theta) * Math.cos(phi) * dist);
          camera.lookAt(target); camera.updateMatrixWorld();
          for (const x of [bounds.min.x, bounds.max.x]) for (const y of [0, h]) for (const z of [bounds.min.z, bounds.max.z]) {
            const p = new THREE.Vector3(x, y, z).project(camera);
            assert.ok(Math.abs(p.x) <= .780001, `horizontal fit at ${aspect}, ${az}, ${el}`);
            assert.ok(Math.abs(p.y) <= .680001, `vertical fit at ${aspect}, ${az}, ${el}`);
            assert.ok(p.z > -1 && p.z < 1, 'in front of the near clipping plane');
          }
        }
      }
    }
  }
});

test('focus bounds include rendered crop instances without growing neighbouring hit boxes', () => {
  const original = new THREE.Box3(new THREE.Vector3(2, 0, 3), new THREE.Vector3(3, .4, 4));
  const focus = new Map([['pots', original.clone()], ['empty', original.clone()]]);
  const world = new THREE.Group();
  buildCrops(world, [
    { zoneId: 'pots', name: 'Tomato', stage: 5, x: 2.5, y: .3, z: 3.5, s: 1.3, ry: 1.2 },
    { zoneId: 'pots', name: 'Lettuce', stage: 5, x: 2.2, y: .3, z: 3.3, s: .7, ry: -.4 },
  ], { value: 0 }, focus);
  assert.ok(focus.get('pots').max.y > original.max.y + .5);
  assert.ok(focus.get('empty').equals(original));
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
  for (const mesh of world.children) {
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      const positions = mesh.geometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        point.fromBufferAttribute(positions, j).applyMatrix4(matrix);
        assert.ok(focus.get('pots').clone().expandByScalar(1e-6).containsPoint(point));
      }
    }
    mesh.dispose();
  }
});
