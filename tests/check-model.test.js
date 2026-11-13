import test from 'node:test';
import assert from 'node:assert/strict';
import { startCheck, canResume, openJobs, tickJob, nextStop, jumpTo, minutesTaken, plantAreas, placePlot, unplacedPlot, JOB_POINTS, CLEAR_BONUS } from '../src/features/home/check-model.js';
import { tasksByZone } from '../src/features/grove/zone-tasks.js';
import { fixture } from './fixture.js';

const job = (key, extra) => ({ key, daysOut: 0, type: 'water', title: key, ...extra });
const tasks = [
  job('w-tom', { plotId: 'tom' }),
  job('h-lettuce', { plotId: 'lettuce', type: 'harvest' }),
  job('feed', { type: 'feed', speciesType: 'Chicken' }),
  job('later', { plotId: 'basil', daysOut: 2 }),
];

test('farm check: one stop per planting or area with jobs today, nothing for later days', () => {
  const s = startCheck(tasks, fixture, '2026-11-13', 'c1', '2026-11-13T08:00:00Z');
  assert.equal(s.status, 'active');
  assert.equal(s.stops.length, 3);
  assert.deepEqual(new Set(s.stops.map((x) => x.zoneId)), new Set(['bed1', 'bed2', 'coop']));
  assert.ok(!s.stops.some((x) => x.tasks.some((t) => t.key === 'later')));
  assert.equal(startCheck([], fixture, '2026-11-13', 'c2', ''), null);
});

test('farm check: ticking earns points once, clearing a stop earns the bonus, the last stop finishes', () => {
  let s = startCheck(tasks, fixture, '2026-11-13', 'c1', '2026-11-13T08:00:00Z');
  const first = s.stops[0].tasks[0];
  s = tickJob(s, first, '+3 kg');
  s = tickJob(s, first, '+3 kg');
  assert.equal(s.points, JOB_POINTS);
  assert.equal(s.jobs, 1);
  assert.equal(openJobs(s.stops[0], s, []).length, s.stops[0].tasks.length - 1);
  s = nextStop(s, { cleared: true });
  assert.equal(s.points, JOB_POINTS + CLEAR_BONUS);
  assert.equal(s.visited.length, 1);
  s = nextStop(s); // nothing ticked: skipped
  assert.equal(s.deferred.length, 1);
  s = nextStop(s, { nowIso: '2026-11-13T08:12:00Z' });
  assert.equal(s.status, 'complete');
  assert.equal(minutesTaken(s.startedAt, s.finishedAt), 12);
  assert.equal(canResume(s, '2026-11-13'), false);
});

test('farm check: a job done elsewhere today is not open at its stop', () => {
  const s = startCheck(tasks, fixture, '2026-11-13', 'c1', '');
  const stop = s.stops.find((x) => x.zoneId === 'coop');
  assert.equal(openJobs(stop, s, ['feed']).length, 0);
});

test('farm check: resumes only today, and jumping moves the picked stop into the current place', () => {
  const s = startCheck(tasks, fixture, '2026-11-13', 'c1', '');
  assert.equal(canResume(s, '2026-11-13'), true);
  assert.equal(canResume(s, '2026-11-14'), false);
  const j = jumpTo(s, 2);
  assert.equal(j.stops[0].id, s.stops[2].id);
  assert.equal(j.stops.length, s.stops.length);
});

test('farm check: a planting whose bed was deleted has no marker until it is placed again', () => {
  const data = { ...fixture, garden: { plots: fixture.garden.plots.map((p) => (p.id === 'tom' ? { ...p, zone: '' } : p)) } };
  const t = job('w-tom', { plotId: 'tom' });
  assert.equal(unplacedPlot(t, data).id, 'tom');
  assert.equal(Object.values(tasksByZone([t], data)).flat().length, 0);
  assert.ok(plantAreas(data).every((z) => !['house', 'barn', 'beehive'].includes(z.type)));
  const placed = placePlot(data, 'tom', 'bed2');
  assert.equal(unplacedPlot(t, placed), null);
  assert.deepEqual(tasksByZone([t], placed).bed2.map((x) => x.key), ['w-tom']);
  assert.equal(placePlot(data, 'tom', 'nowhere'), data);
  assert.equal(placed.garden.plots.find((p) => p.id === 'basil').zone, 'bed1');
});
