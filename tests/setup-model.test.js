import test from 'node:test';
import assert from 'node:assert/strict';
import { SIZES, guessRegion, buildSetup, cueState, endCues } from '../src/features/home/setup-model.js';
import { DEF } from '../src/app/state.js';

test('setup: region guessed from the time zone, Western Europe when unknown', () => {
  assert.equal(guessRegion('Europe/London'), 'western_europe');
  assert.equal(guessRegion('Europe/Amsterdam'), 'western_europe');
  assert.equal(guessRegion('Europe/Berlin'), 'northern_europe');
  assert.equal(guessRegion('Europe/Stockholm'), 'northern_europe');
  assert.equal(guessRegion('Europe/Tirane'), 'mediterranean');
  assert.equal(guessRegion('Europe/Rome'), 'mediterranean');
  assert.equal(guessRegion('America/New_York'), 'us_cold');
  assert.equal(guessRegion('America/Toronto'), 'us_cold');
  assert.equal(guessRegion('America/Los_Angeles'), 'us_warm');
  assert.equal(guessRegion('Asia/Tokyo'), 'western_europe');
  assert.equal(guessRegion(undefined), 'western_europe');
});

for (const env of Object.keys(SIZES)) {
  for (const size of Object.keys(SIZES[env])) {
    test(`setup: ${env} / ${size} gives one starter bed that fits inside the space`, () => {
      const u = buildSetup({ environment: env, size, region: 'western_europe', zoneId: 'z1' });
      assert.equal(u.setupDone, true);
      assert.equal(u.zones.length, 1);
      const z = u.zones[0];
      assert.equal(z.id, 'z1');
      assert.ok(z.wM > 0 && z.hM > 0, 'bed has a size');
      assert.ok(z.xM >= 0 && z.yM >= 0 && z.xM + z.wM <= u.farmW + 1e-9 && z.yM + z.hM <= u.farmH + 1e-9, `bed inside ${u.farmW} × ${u.farmH}`);
      assert.equal(u.profile.environment, env);
      assert.equal(u.profile.onboardingVersion, 3);
      assert.deepEqual(u.profile.firstRun, { skipped: false });
      assert.deepEqual(u.profile.household, DEF.profile.household, 'unasked answers keep their defaults');
    });
  }
}

test('setup: an unknown space or size falls back to a medium backyard', () => {
  const u = buildSetup({ environment: 'moon', size: 'huge', region: '', zoneId: 'z' });
  assert.equal(u.profile.environment, 'backyard');
  assert.equal(u.region, 'western_europe');
  assert.deepEqual([u.profile.dimensions.lengthM, u.profile.dimensions.widthM], SIZES.backyard.medium);
});

const base = (env, extra = {}) => ({ ...DEF, ...buildSetup({ environment: env, size: 'medium', region: 'western_europe', zoneId: 'z1' }), garden: { plots: [] }, ...extra });

test('cues: balcony goes plant → job (no animal step); farm adds the animal step', () => {
  let d = base('balcony');
  assert.deepEqual(cueState(d), { steps: [{ id: 'plant', done: false }, { id: 'job', done: false }], current: 'plant', index: 1, total: 2 });
  d = { ...d, garden: { plots: [{ id: 'p', zone: 'z1', crop: 'Basil', steps: [] }] } };
  assert.equal(cueState(d).current, 'job');
  assert.equal(cueState(d).index, 2);
  d = { ...d, completions: { '2026-11-12': ['water-p'] } };
  assert.equal(cueState(d), null, 'all done → no cue');

  let f = base('farm');
  assert.equal(cueState(f).total, 3);
  f = { ...f, garden: { plots: [{ id: 'p', zone: 'z1', crop: 'Leek', steps: [] }] } };
  assert.equal(cueState(f).current, 'animal');
  f = { ...f, livestock: { ...DEF.livestock, animals: [{ id: 'a', type: 'Chicken' }] } };
  assert.equal(cueState(f).current, 'job');
});

test('cues: a ticked crop step counts as the first job; skipping ends them; old accounts never see them', () => {
  const d = base('backyard', { garden: { plots: [{ id: 'p', zone: 'z1', crop: 'Basil', steps: [{ done: true }] }] } });
  assert.equal(cueState(d), null);
  const fresh = base('backyard');
  assert.equal(cueState(endCues(fresh)), null);
  assert.equal(endCues(fresh).profile.environment, 'backyard', 'skip keeps the rest of the profile');
  assert.equal(cueState({ ...DEF, setupDone: true }), null);
  assert.equal(cueState(null), null);
});
