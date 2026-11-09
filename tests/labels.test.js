import test from 'node:test';
import assert from 'node:assert/strict';
import { placeLabels } from '../src/features/grove/labels.js';

// one label item: anchor (x, y) is the midpoint of the zone's front edge on screen; the pill hangs above it
const it = (id, o = {}) => ({ id, x: 100, y: 100, w: 60, h: 20, badge: 0, px: 80, area: 10, sel: 0, jobs: 0, on: true, ...o });
const opt = { W: 400, H: 800, far: false, mobile: false };
const by = (r, id) => r.find((q) => q.id === id);

test('labels: jobs beat area for the same spot', () => {
  const r = placeLabels([it('big', { area: 100 }), it('busy', { jobs: 2 })], opt);
  assert.equal(by(r, 'busy').show, true); assert.equal(by(r, 'big').show, false);
});
test('labels: selected always wins and ignores thresholds', () => {
  const r = placeLabels([it('a', { area: 100 }), it('s', { sel: 1, px: 5 })], opt);
  assert.equal(by(r, 's').show, true);
});
test('labels: far on phones needs 64 px, elsewhere 28 px', () => {
  assert.equal(placeLabels([it('a', { px: 50 })], { ...opt, far: true, mobile: true })[0].show, false);
  assert.equal(placeLabels([it('a', { px: 70 })], { ...opt, far: true, mobile: true })[0].show, true);
  assert.equal(placeLabels([it('a', { px: 50 })], { ...opt, far: true, mobile: false })[0].show, true);
  assert.equal(placeLabels([it('a', { px: 20 })], opt)[0].show, false);
});
test('labels: jobs ignore the px threshold', () => assert.equal(placeLabels([it('a', { px: 10, jobs: 1 })], { ...opt, far: true, mobile: true })[0].show, true));
test('labels: non-overlapping labels are all shown', () => {
  const r = placeLabels([it('a', { x: 60 }), it('b', { x: 200 })], opt);
  assert.ok(r.every((q) => q.show));
});
test('labels: side-by-side beds all placed', () => {
  const r = placeLabels([it('b1', { x: 50, w: 40 }), it('b2', { x: 100, w: 40 }), it('b3', { x: 150, w: 40 })], opt);
  assert.equal(r.filter((q) => q.show).length, 3);
});
test('labels: dense farms keep a screen-sized budget and prioritise jobs', () => {
  const items = Array.from({length: 20}, (_, i) => it(`bed-${i}`, { x: 25 + (i % 5) * 75, y: 40 + Math.floor(i / 5) * 80, w: 32, area: 20 - i }));
  items[19].jobs = 1;
  const r = placeLabels(items, { W: 400, H: 400 });
  assert.equal(r.filter((entry) => entry.show).length, 5);
  assert.equal(by(r, 'bed-19').show, true);
});
test('labels: neighbouring labels shift rather than overlap', () => {
  const r = placeLabels([it('a', { x: 100, area: 50 }), it('b', { x: 110, area: 10 })], opt);
  assert.equal(by(r, 'a').show, true); assert.equal(by(r, 'b').show, true);
  assert.ok(Math.abs(by(r, 'a').y - by(r, 'b').y) >= 20);
});
test('labels: clamped to the viewport', () => {
  const [r] = placeLabels([it('a', { x: -20, y: 5 })], opt);
  assert.ok(r.x >= 60 / 2 + 4); assert.ok(r.y >= 20 + 4);
});
test('labels: off-screen anchor is hidden', () => assert.equal(placeLabels([it('a', { x: 900 })], opt)[0].show, false));
test('labels: not on (behind camera) is hidden', () => assert.equal(placeLabels([it('a', { on: false })], opt)[0].show, false));
test('labels: result keeps input order', () => {
  const r = placeLabels([it('z', { x: 60 }), it('a', { x: 200, sel: 1 })], opt);
  assert.deepEqual(r.map((q) => q.id), ['z', 'a']);
});
test('labels: a zone whose centre is on screen keeps its name when its front edge leaves the bottom', () => {
  const [r] = placeLabels([it('a', { x: 200, y: 900, cx: 200, cy: 600 })], opt);
  assert.equal(r.show, true); assert.ok(r.y <= 800 - 4);
});
test('labels: a zone whose centre has left the screen is hidden even if its front edge is on it', () => {
  assert.equal(placeLabels([it('a', { x: 200, y: 700, cx: 200, cy: -40 })], opt)[0].show, false);
});

// small areas: the pill hangs in front of the bed (below it on screen) instead of covering its plants
test('labels: a small bed gets its pill in front of it, clear of the plants', () => {
  const bed = it('bed', { x: 200, y: 300, box: { x0: 150, y0: 240, x1: 250, y1: 300 }, below: { x: 200, y: 326 } });
  const r = placeLabels([bed], opt)[0];
  assert.equal(r.show, true); assert.equal(r.y, 326);
  assert.ok(r.y - 20 >= 300, 'the pill starts below the bed');
});
test('labels: when another area lies right in front, the pill stays on its own bed', () => {
  const back = it('back', { x: 200, y: 300, box: { x0: 150, y0: 240, x1: 250, y1: 300 }, below: { x: 200, y: 326 } });
  const front = it('front', { x: 200, y: 400, area: 30, box: { x0: 140, y0: 304, x1: 260, y1: 400 } });
  const r = placeLabels([back, front], opt);
  assert.equal(by(r, 'back').y, 300); assert.equal(by(r, 'back').show, true);
});
test('labels: a thin strip always hangs its pill in front', () => {
  const strip = it('strip', { x: 200, y: 300, thin: true, box: { x0: 100, y0: 290, x1: 300, y1: 300 }, below: { x: 200, y: 326 } });
  const front = it('front', { x: 200, y: 420, area: 30, box: { x0: 140, y0: 304, x1: 260, y1: 420 } });
  assert.equal(by(placeLabels([strip, front], opt), 'strip').y, 326);
});
