import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fitView, homeView } from '../src/features/grove/home-view.js';

const DEG = Math.PI / 180;
const project = (v, points, aspect, fov = 28) => {
  const camera = new THREE.PerspectiveCamera(fov, aspect, 1, 4000);
  camera.position.set(v.target.x + Math.sin(v.theta) * Math.cos(v.phi) * v.dist, Math.sin(v.phi) * v.dist, v.target.z + Math.cos(v.theta) * Math.cos(v.phi) * v.dist);
  camera.lookAt(v.target.x, 0, v.target.z); camera.updateMatrixWorld();
  return points.map((p) => new THREE.Vector3(p[0], p[1], p[2]).project(camera));
};
const boxOf = (ps) => ({ x0: Math.min(...ps.map((p) => p.x)), x1: Math.max(...ps.map((p) => p.x)), y0: Math.min(...ps.map((p) => p.y)), y1: Math.max(...ps.map((p) => p.y)) });

test('fitView centres the projected points and touches the frame on one axis', () => {
  const pts = []; for (const x of [0, 8]) for (const z of [-2, 5]) for (const y of [0, 2.5]) pts.push([x, y, z]);
  for (const aspect of [390 / 844, 1280 / 720, 1]) for (const az of [-22, -58, -90]) {
    const v = fitView(pts, { theta: az * DEG, phi: 54 * DEG, fov: 28, aspect });
    const b = boxOf(project(v, pts, aspect));
    assert.ok(Math.abs(b.x0 + b.x1) < .02 && Math.abs(b.y0 + b.y1) < .02, `centred at ${aspect}, ${az}`);
    const m = Math.max(b.x1, b.y1);
    assert.ok(m <= .986 && m >= .96, `fills the frame at ${aspect}, ${az}: ${m}`);
  }
});

test('fitView keeps the points inside a safe area when bars cover the top and bottom', () => {
  const pts = []; for (const x of [0, 6]) for (const z of [0, 20]) for (const y of [0, 2.5]) pts.push([x, y, z]);
  const inset = { top: .12, bottom: .14, left: 0, right: 0 };
  const v = fitView(pts, { theta: -22 * DEG, phi: 54 * DEG, fov: 28, aspect: 390 / 844, inset });
  const b = boxOf(project(v, pts, 390 / 844));
  assert.ok(b.y1 <= 1 - 2 * inset.top + .01, 'clear of the top bar');
  assert.ok(b.y0 >= -1 + 2 * inset.bottom - .01, 'clear of the bottom bar');
});

test('a balcony on a portrait phone is seen along its length, so it spans far more of the screen', () => {
  const portrait = { aspect: 390 / 844, fov: 28 };
  for (const [fW, fH] of [[4, 1.5], [11, 4.5], [6, 2]]) {
    const head = homeView({ env: 'balcony', fW, fH, margin: .4, ...portrait, az: -22, el: 54, diagonal: false });
    const v = homeView({ env: 'balcony', fW, fH, margin: .4, ...portrait, az: -22, el: 54 });
    assert.ok(v.theta < -40 * DEG && v.theta >= -60 * DEG, `turned toward the long axis: ${v.theta / DEG}`);
    assert.ok(v.frac >= head.frac * 1.5, `${fW}x${fH}: ${head.frac.toFixed(2)} -> ${v.frac.toFixed(2)}`);
    assert.ok(v.frac >= .33, `${fW}x${fH} spans at least a third of the height: ${v.frac.toFixed(2)}`);
    assert.ok(v.dist <= head.dist * .9, `${fW}x${fH}: the camera stands closer, so plants are bigger`);
  }
  // a wide window keeps the usual three-quarter view: the balcony already fills it
  const wide = homeView({ env: 'balcony', fW: 4, fH: 1.5, margin: .4, aspect: 16 / 10, fov: 28, az: -22, el: 54 });
  assert.equal(wide.theta, -22 * DEG);
});

test('a back garden is centred on the garden itself, not on the house roofs', () => {
  const v = homeView({ env: 'backyard', fW: 8, fH: 5, margin: .4, aspect: 1280 / 720, fov: 28, az: -22, el: 54, patio: 1.8 });
  assert.equal(v.theta, -22 * DEG);
  // the frame is the garden plus its patio: the garden's centre sits within a metre of the view target
  assert.ok(Math.abs(v.target.z - (5 - 1.8) / 2) < 1.2, `target z ${v.target.z}`);
  const corners = [[0, 0, 0], [8, 0, 0], [8, 0, 5], [0, 0, 5]];
  const b = boxOf(project(v, corners, 1280 / 720));
  assert.ok((b.y1 - b.y0) / 2 >= .55, `the lawn spans over half the height: ${((b.y1 - b.y0) / 2).toFixed(2)}`);
});

test('a farm keeps its turn rule: the long axis runs up a portrait screen', () => {
  const p = homeView({ env: 'farm', fW: 46, fH: 26, margin: 3, aspect: 390 / 844, fov: 28, az: -22, el: 54 });
  assert.equal(p.turn, true); assert.equal(p.theta, -90 * DEG);
  const l = homeView({ env: 'farm', fW: 46, fH: 26, margin: 3, aspect: 1280 / 720, fov: 28, az: -22, el: 54 });
  assert.equal(l.turn, false); assert.equal(l.theta, -22 * DEG);
});
