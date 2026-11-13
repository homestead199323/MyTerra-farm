import test from 'node:test';
import assert from 'node:assert/strict';
import { dueToday, trackDay, jobsProgress, showDayDone, rowNote, hasProduce, fanTarget } from '../src/features/home/home-model.js';
import { useHomeV2 } from '../src/lib/home-v2.js';

const T = (key, daysOut = 0, type = 'water') => ({ key, daysOut, type, title: key, loc: 'Bed 1' });

test('home: due today leaves out later days and the forecast rows', () => {
  const due = dueToday([T('a'), T('b', 1), T('c', 0, 'forecast'), T('d', 0, 'upcoming'), T('e', 0, 'harvest')]);
  assert.deepEqual(due.map((t) => t.key), ['a', 'e']);
  assert.deepEqual(dueToday(null), []);
});

test('home: the day total is the most jobs seen, so ticking goes 0/8 → 3/8 → 8/8', () => {
  let day = trackDay(null, '2026-11-12', 8, 0);
  assert.deepEqual(jobsProgress(day, 8), { left: 8, done: 0, total: 8 });
  day = trackDay(day, '2026-11-12', 5, 3); // three ticked: completions grow as the queue shrinks
  assert.deepEqual(jobsProgress(day, 5), { left: 5, done: 3, total: 8 });
  day = trackDay(day, '2026-11-12', 4, 3); // a crop step ticked: it leaves the queue but is not in the completions map
  assert.deepEqual(jobsProgress(day, 4), { left: 4, done: 4, total: 8 });
  day = trackDay(day, '2026-11-12', 0, 3);
  assert.deepEqual(jobsProgress(day, 0), { left: 0, done: 8, total: 8 });
});

test('home: reopening the app mid-day rebuilds the total from what was ticked', () => {
  const day = trackDay(null, '2026-11-12', 5, 3);
  assert.equal(day.total, 8);
});

test('home: a new day starts a new count, and a job added during the day raises the total', () => {
  let day = trackDay({ day: '2026-11-11', total: 9 }, '2026-11-12', 2, 0);
  assert.deepEqual(day, { day: '2026-11-12', total: 2 });
  day = trackDay(day, '2026-11-12', 3, 0);
  assert.equal(day.total, 3);
  assert.equal(trackDay(day, '2026-11-12', 3, 0), day, 'unchanged → same object, no re-render loop');
});

test('home: yesterday\'s record is not used for today\'s chip', () => {
  assert.deepEqual(jobsProgress(null, 4), { left: 4, done: 0, total: 4 });
  assert.deepEqual(jobsProgress(null, 0), { left: 0, done: 0, total: 0 });
});

test('home: day-done shows once, only when something was done and nothing is left', () => {
  assert.equal(showDayDone({ left: 0, done: 8, total: 8 }, null, '2026-11-12'), true);
  assert.equal(showDayDone({ left: 0, done: 8, total: 8 }, '2026-11-12', '2026-11-12'), false, 'already shown today');
  assert.equal(showDayDone({ left: 0, done: 8, total: 8 }, '2026-11-11', '2026-11-12'), true, 'shown yesterday');
  assert.equal(showDayDone({ left: 2, done: 6, total: 8 }, null, '2026-11-12'), false);
  assert.equal(showDayDone({ left: 0, done: 0, total: 0 }, null, '2026-11-12'), false, 'an empty day is not a win');
});

test('home: job row note — place, ready to pick, minutes', () => {
  assert.match(rowNote({ ...T('h', 0, 'harvest'), loc: 'Orchard' }), /^Orchard · Ready to pick · ~\d+ min$/);
  assert.match(rowNote({ type: 'water', title: 'Water', loc: '' }), /^~\d+ min$/);
});

test('home: a marker is gold when the area has produce to collect', () => {
  assert.equal(hasProduce([T('a'), T('b', 0, 'eggs')]), true);
  assert.equal(hasProduce([T('a')]), false);
  assert.equal(hasProduce(undefined), false);
});

test('home: + fan targets; Plant builds a bed first when there is nowhere to plant', () => {
  assert.deepEqual(fanTarget('plant', true), ['crops', { add: true }]);
  assert.deepEqual(fanTarget('plant', false), ['map', { edit: true }]);
  assert.deepEqual(fanTarget('animal', true), ['live', { add: true }]);
  assert.deepEqual(fanTarget('build', true), ['map', { edit: true }]);
  assert.deepEqual(fanTarget('job', true), ['tasks', { addJob: true }]);
  assert.deepEqual(fanTarget('harvest', true), ['pantry', { harvest: true }]);
});

test('the game home is the only home: always on, the old switch is ignored', () => {
  assert.equal(useHomeV2(), true);
});
