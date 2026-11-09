import test from 'node:test';
import assert from 'node:assert/strict';
import { coverInset, mergeInset, sheetMode, setCover, getCover, onCover } from '../src/features/grove/cover.js';
import { fitView } from '../src/features/grove/home-view.js';

const phone = { left: 0, top: 0, right: 390, bottom: 844 };

test('cover: a half-height bottom sheet hides the lower part of a phone map', () => {
  const i = coverInset(phone, { left: 0, right: 390, top: 405, bottom: 844 });
  assert.ok(Math.abs(i.bottom - 439 / 844) < 1e-9); assert.equal(i.top, 0); assert.equal(i.left, 0); assert.equal(i.right, 0);
});
test('cover: a sheet pulled up over nearly the whole map does not reframe it', () => {
  assert.equal(coverInset(phone, { left: 0, right: 390, top: 64, bottom: 844 }), null);
});
test('cover: a desktop side panel hides the right of an inline map', () => {
  const canvas = { left: 171, top: 106, right: 1109, bottom: 688 };
  const i = coverInset(canvas, { left: 864, right: 1264, top: 16, bottom: 884 });
  assert.ok(Math.abs(i.right - (1109 - 864) / 938) < 1e-9); assert.equal(i.bottom, 0);
});
test('cover: a card that misses the map, or only floats over it, changes nothing', () => {
  assert.equal(coverInset(phone, null), null);
  assert.equal(coverInset({ left: 0, top: 0, right: 600, bottom: 400 }, { left: 700, right: 1100, top: 0, bottom: 800 }), null);
  assert.equal(coverInset(phone, { left: 100, right: 300, top: 300, bottom: 500 }), null);
});
test('cover: phone bars are added on the edges the card leaves free', () => {
  const size = { w: 390, h: 844 }, bars = { top: 92, bottom: 108 };
  assert.deepEqual(mergeInset(null, null, size), null);
  const onlyBars = mergeInset(null, bars, size);
  assert.ok(Math.abs(onlyBars.top - 92 / 844) < 1e-9 && Math.abs(onlyBars.bottom - 108 / 844) < 1e-9);
  const withSheet = mergeInset({ top: 0, bottom: .52, left: 0, right: 0 }, bars, size);
  assert.equal(withSheet.bottom, .52); assert.ok(Math.abs(withSheet.top - 92 / 844) < 1e-9);
});
test('cover: the selected bed is framed inside what the sheet leaves free', () => {
  const pts = []; for (const x of [2, 4.4]) for (const z of [3, 3.9]) for (const y of [0, .6]) pts.push([x, y, z]);
  const inset = mergeInset(coverInset(phone, { left: 0, right: 390, top: 405, bottom: 844 }), { top: 92, bottom: 108 }, { w: 390, h: 844 });
  const v = fitView(pts, { theta: -58 * Math.PI / 180, phi: 60 * Math.PI / 180, fov: 28, aspect: 390 / 844, fill: .8, inset });
  assert.ok(v.box.y0 >= -1 + 2 * inset.bottom - .01, 'the bed stays above the sheet');
  assert.ok(v.box.y1 <= 1 - 2 * inset.top + .01, 'and below the top bar');
  assert.ok(v.box.x0 >= -1 && v.box.x1 <= 1);
});
test('cover: phones and narrow windows get a sheet, wide windows a side panel', () => {
  assert.equal(sheetMode(390, true), 'sheet'); assert.equal(sheetMode(1280, true), 'sheet');
  assert.equal(sheetMode(700, false), 'sheet'); assert.equal(sheetMode(1280, false), 'panel');
});
test('cover: subscribers hear every change and can leave', () => {
  const seen = [], off = onCover((r) => seen.push(r));
  setCover({ left: 0, top: 400, right: 390, bottom: 844 }); assert.equal(getCover().top, 400);
  setCover(null); off(); setCover({ left: 0, top: 1, right: 2, bottom: 3 });
  assert.equal(seen.length, 2); assert.equal(seen[1], null); setCover(null);
});
