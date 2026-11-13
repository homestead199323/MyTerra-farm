import test from 'node:test';
import assert from 'node:assert/strict';
import { startRatio, nextRatio, createPace, storedRatio, KEEP_MS, SLOW_MS } from '../src/features/grove/quality.js';

const frames = (n, ms) => Array.from({ length: n }, () => ms);

test('map quality: starts at what the device can show, or what it was stepped down to', () => {
  assert.equal(startRatio(1.5, null), 1.5);
  assert.equal(startRatio(1.5, 1.25), 1.25);
  assert.equal(startRatio(1.5, 2), 1.5); // never above the device
  assert.equal(startRatio(2, 'x'), 2);
  assert.equal(startRatio(.75, null), 1);
});

test('map quality: a slow gesture steps the sharpness down one notch, a smooth or short one changes nothing', () => {
  assert.equal(nextRatio(1.5, frames(40, 16.7)), 1.5);
  assert.equal(nextRatio(1.5, frames(40, SLOW_MS + 8)), 1.25);
  assert.equal(nextRatio(1.25, frames(40, 40)), 1);
  assert.equal(nextRatio(1, frames(40, 60)), 1); // never below 1
  assert.equal(nextRatio(1.5, frames(6, 60)), 1.5); // too few frames to judge
  assert.equal(nextRatio(1.5, frames(12, 30)), 1.5); // too short a movement to judge
  assert.equal(nextRatio(1.5, frames(9, 300)), 1.25); // a very slow device makes few frames: still judged
  // a few hitches in an otherwise smooth drag do not count (median)
  assert.equal(nextRatio(1.5, frames(30, 16.7).concat(frames(8, 90))), 1.5);
});

test('map quality: frames are sampled only while the map is moving, and pauses are not frames', () => {
  const pace = createPace();
  let t = 0;
  for (let i = 0; i < 40; i++) { t += 40; pace.frame(t, false); } // idle: not sampled
  assert.equal(pace.settle(1.5), 1.5);
  for (let i = 0; i < 40; i++) { t += 40; pace.frame(t, true); }
  assert.equal(pace.settle(1.5), 1.25);
  // the next gesture starts clean
  for (let i = 0; i < 40; i++) { t += 16; pace.frame(t, true); }
  t += 5000; pace.frame(t, true); // a long gap between two gestures is dropped
  assert.equal(pace.settle(1.25), 1.25);
});

test('map quality: a remembered step-down lasts a week', () => {
  const now = 1e12;
  assert.equal(storedRatio(JSON.stringify({ r: 1.25, t: now - 1000 }), now), 1.25);
  assert.equal(storedRatio(JSON.stringify({ r: 1.25, t: now - KEEP_MS - 1 }), now), null);
  assert.equal(storedRatio('1.25', now), null);
  assert.equal(storedRatio('{bad', now), null);
  assert.equal(storedRatio(null, now), null);
});

import { keepLocalEdits, retryDelay } from '../src/lib/unsynced.js';
test('sync: edits the cloud never got are kept when the app opens, unless another device saved later', () => {
  const cloud = 1_800_000_000_000;
  assert.equal(keepLocalEdits({ unsyncedAt: cloud + 5000, cloudUpdatedAt: cloud, hasLocal: true }), true);
  assert.equal(keepLocalEdits({ unsyncedAt: cloud - 5000, cloudUpdatedAt: cloud, hasLocal: true }), false); // another device saved after
  assert.equal(keepLocalEdits({ unsyncedAt: 0, cloudUpdatedAt: cloud, hasLocal: true }), false); // nothing waiting
  assert.equal(keepLocalEdits({ unsyncedAt: cloud + 5000, cloudUpdatedAt: cloud, hasLocal: false }), false); // no cached farm to keep
  assert.equal(keepLocalEdits({ unsyncedAt: 'x', cloudUpdatedAt: undefined, hasLocal: true }), false);
});
test('sync: a failed upload is retried with a growing pause, capped at a minute', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 9].map(retryDelay), [5000, 10000, 20000, 40000, 60000, 60000]);
});
