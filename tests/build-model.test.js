import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTypes, defaultSize, clampGeom, dropGeom, freeSpot, placeZone, setZoneGeom, resizeZone, turnZone, zoneUse, removeZone } from '../src/features/home/build-model.js';

const farm = () => ({
  farmW: 20, farmH: 10,
  zones: [{ id: 'a', type: 'veg', name: 'Vegetable Bed', xM: 2, yM: 2, wM: 4, hM: 2 }],
  garden: { plots: [{ id: 'p', zone: 'a', crop: 'Tomato', status: 'planted' }, { id: 'q', zone: 'a', crop: 'Basil', status: 'harvested' }] },
  livestock: { animals: [{ id: 'h', zone: 'a' }] },
});

test('build: the tray suits the space', () => {
  assert.ok(buildTypes('farm').some((t) => t.id === 'barn'));
  assert.ok(!buildTypes('balcony').some((t) => t.id === 'barn'));
  assert.ok(buildTypes('balcony').some((t) => t.id === 'container'));
  assert.equal(buildTypes('nowhere').length, buildTypes('farm').length);
});

test('build: a piece is never bigger than half the space', () => {
  assert.deepEqual(defaultSize('barn', 100, 60), { wM: 8, hM: 6 });
  assert.deepEqual(defaultSize('barn', 6, 4), { wM: 3, hM: 2 });
});

test('build: areas stay inside the space', () => {
  assert.deepEqual(clampGeom({ xM: 19, yM: -3, wM: 4, hM: 2 }, 20, 10), { xM: 16, yM: 0, wM: 4, hM: 2 });
});

test('build: a drop snaps to the grid and lines up with a neighbour', () => {
  const g = dropGeom(farm(), { wM: 2, hM: 2 }, 7.1, 3.1); // left edge 6.1 → the bed's right edge at 6
  assert.deepEqual(g, { xM: 6, yM: 2, wM: 2, hM: 2 });
});

test('build: a tapped piece lands in free ground near the middle of the view', () => {
  const g = freeSpot(farm(), { wM: 4, hM: 2 }, 4, 3);
  const bed = farm().zones[0];
  assert.ok(g.xM >= bed.xM + bed.wM || g.xM + g.wM <= bed.xM || g.yM >= bed.yM + bed.hM || g.yM + g.hM <= bed.yM);
  assert.ok(g.xM >= 0 && g.xM + g.wM <= 20 && g.yM >= 0 && g.yM + g.hM <= 10);
});

test('build: placing numbers a second area of the same kind and writes the percent fields', () => {
  const out = placeZone(farm(), 'veg', { xM: 10, yM: 5, wM: 4, hM: 2 }, 'n1');
  const z = out.data.zones.find((q) => q.id === 'n1');
  assert.equal(z.name, 'Vegetable Bed 2');
  assert.equal(z.x, 50); assert.equal(z.w, 20);
  assert.equal(placeZone(farm(), 'nope', { xM: 0, yM: 0, wM: 1, hM: 1 }, 'x').id, null);
});

test('build: move, resize and turn', () => {
  let d = setZoneGeom(farm(), 'a', { xM: 30, yM: 1 });
  assert.equal(d.zones[0].xM, 16); // kept inside
  d = resizeZone(farm(), 'a', 1, -1); // grid is 0.5 m on a 20 m space
  assert.equal(d.zones[0].wM, 4.5); assert.equal(d.zones[0].hM, 1.5);
  d = turnZone(farm(), 'a');
  assert.equal(d.zones[0].wM, 2); assert.equal(d.zones[0].hM, 4); assert.equal(d.zones[0].rowAxis, 'vertical');
});

test('build: removing an area keeps its crops and animals, without a place', () => {
  assert.deepEqual(zoneUse(farm(), 'a'), { crops: 1, animals: 1 });
  const d = removeZone(farm(), 'a');
  assert.equal(d.zones.length, 0);
  assert.equal(d.garden.plots[0].zone, '');
  assert.equal(d.livestock.animals[0].zone, '');
});
