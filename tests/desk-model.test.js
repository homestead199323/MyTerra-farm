import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_CARDS, CARD_IDS, cardValue, allCards, suggestedIds, shownIds, addCard, removeCard, moveCard, plantingRows, animalRows } from '../src/features/home/desk-model.js';
import { DEF } from '../src/app/state.js';
import { CROP_MAP } from '../src/data/crops.js';
import { fixture } from './fixture.js';
import { todayLocalKey, addDaysToLocalKey } from '../src/lib/utils.js';

const today = todayLocalKey();
const ctxOf = (data, extra = {}) => ({ data, tasks: [], forecast: null, progress: { done: 0, total: 0, left: 0 }, todayKey: today, crops: CROP_MAP, ...extra });
const week = { ok: true, days: [1, 2, 3, 4, 5, 6, 7].map((mm, i) => ({ date: addDaysToLocalKey(today, i), rainMm: mm, tMin: 5 - i, tMax: 12 })) };
const town = { ...fixture, city: 'Ghent' };

test('desk cards: eleven kinds, four at most', () => {
  assert.equal(MAX_CARDS, 4);
  assert.deepEqual(CARD_IDS, ['jobs', 'harvest', 'rain', 'picked', 'eggs', 'growing', 'money', 'cold', 'pantry', 'time', 'space']);
});

test('desk cards: suggestions only hold what this farm can show', () => {
  assert.deepEqual(suggestedIds(ctxOf(fixture)), ['jobs', 'harvest', 'eggs']); // no forecast: no rain card
  assert.deepEqual(suggestedIds(ctxOf(town, { forecast: week })), ['jobs', 'harvest', 'rain', 'eggs']);
  const noBirds = { ...town, livestock: { animals: [] } };
  assert.deepEqual(suggestedIds(ctxOf(noBirds, { forecast: week })), ['jobs', 'harvest', 'rain', 'growing']); // nothing harvested yet
});

test('desk cards: an empty farm gets the jobs card and nothing broken', () => {
  const ctx = ctxOf({ ...DEF });
  assert.deepEqual(shownIds({ ...DEF }, ctx), ['jobs']);
  allCards(ctx).forEach((c) => {
    assert.equal(typeof c.big, 'string', c.id);
    assert.doesNotMatch(`${c.big} ${c.unit} ${c.sub}`, /NaN|undefined|null/, c.id);
    if (!['jobs', 'time'].includes(c.id)) assert.equal(c.available, false, c.id);
  });
});

test('desk cards: a stored choice is cleaned, never trusted', () => {
  const ctx = ctxOf(fixture);
  assert.deepEqual(shownIds({ ...fixture, deskCards: ['nope', 'jobs', 'jobs', 'harvest', 'eggs', 'time', 'space'] }, ctx), ['jobs', 'harvest', 'eggs', 'time']);
  assert.deepEqual(shownIds({ ...fixture, deskCards: [] }, ctx), []); // no cards is a choice
  assert.deepEqual(shownIds({ ...fixture, deskCards: 'jobs' }, ctx), ['jobs', 'harvest', 'eggs']); // not a list: as if never edited
  assert.deepEqual(shownIds({ ...fixture, deskCards: ['rain', 'jobs'] }, ctx), ['jobs']); // rain waits for its forecast
});

test('desk cards: rain and the coldest night come from the forecast', () => {
  const ctx = ctxOf(town, { forecast: week });
  const rain = cardValue('rain', ctx), cold = cardValue('cold', ctx);
  assert.equal(rain.available, true); assert.equal(rain.big, '28'); assert.equal(rain.unit, 'mm');
  assert.deepEqual(rain.visual.values, [1, 2, 3, 4, 5, 6, 7]); assert.equal(rain.target.type, 'week');
  assert.equal(cold.big, '-1°'); assert.equal(cold.visual.hi, 6);
  assert.equal(cardValue('rain', ctxOf(town)).available, false); // still loading, or it failed
  assert.equal(cardValue('rain', ctxOf(fixture, { forecast: week })).available, false); // no town set
});

test('desk cards: a harvest that is due says Ready, not minus one day', () => {
  const h = cardValue('harvest', ctxOf(fixture));
  assert.equal(h.big, 'Ready'); assert.equal(h.unit, '');
  assert.deepEqual(h.target, { type: 'plot', plotId: 'lettuce', zoneId: 'bed2' });
  assert.match(h.sub, /Lettuce · Salad bed/);
  const later = { ...fixture, garden: { plots: fixture.garden.plots.filter((p) => p.id !== 'lettuce') } };
  const t = cardValue('harvest', ctxOf(later));
  assert.equal(t.big, '15'); assert.equal(t.unit, 'days'); assert.equal(t.target.plotId, 'tom');
});

test('desk cards: jobs, eggs, money and space read the farm', () => {
  const jobs = cardValue('jobs', ctxOf(fixture, { progress: { done: 3, total: 5, left: 2 } }));
  assert.equal(jobs.big, '3'); assert.equal(jobs.unit, 'of 5 done'); assert.equal(jobs.visual.pct, .6); assert.deepEqual(jobs.target, { type: 'tab', tab: 'jobs' });
  const laid = { ...fixture, pantry: { items: [], moves: [
    { kind: 'in', source: 'livestock', name: 'Eggs', unit: 'pcs', qty: 4, date: today },
    { kind: 'in', source: 'livestock', name: 'Eggs', unit: 'pcs', qty: 3, date: addDaysToLocalKey(today, -6) },
    { kind: 'in', source: 'livestock', name: 'Eggs', unit: 'pcs', qty: 9, date: addDaysToLocalKey(today, -7) }, // a week and a day ago: not counted
  ] } };
  const eggs = cardValue('eggs', ctxOf(laid));
  assert.equal(eggs.big, '7'); assert.deepEqual(eggs.visual.values, [3, 0, 0, 0, 0, 0, 4]); assert.deepEqual(eggs.target, { type: 'zone', zoneId: 'coop' });
  assert.equal(cardValue('eggs', ctxOf({ ...fixture, livestock: { animals: [{ id: 'b', type: 'Bee', count: 1 }] } })).available, false);
  const year = today.slice(0, 4);
  const paid = { ...fixture, costs: { items: [{ type: 'income', amount: 50, date: `${year}-01-05` }, { type: 'expense', amount: 20, date: `${year}-01-06` }, { type: 'income', amount: 999, date: `${Number(year) - 1}-06-01` }] } };
  const money = cardValue('money', ctxOf(paid));
  assert.equal(money.available, true); assert.match(money.big, /^\+.?30$/); assert.equal(money.target.page, 'fin');
  const space = cardValue('space', ctxOf(fixture));
  assert.equal(space.available, true); assert.equal(space.unit, '%'); assert.ok(Number(space.big) > 0 && Number(space.big) <= 100);
});

test('desk table: plantings soonest first, animals with where they live', () => {
  const rows = plantingRows(fixture, CROP_MAP, today);
  assert.deepEqual(rows.map((r) => r.id), ['lettuce', 'tom', 'basil']);
  assert.equal(rows[0].ready, true); assert.equal(rows[0].stageLabel, 'Ready'); assert.equal(rows[0].where, 'Salad bed');
  assert.equal(rows[1].left, 15); assert.equal(rows[1].name, 'Tomatoes');
  const lost = { ...fixture, garden: { plots: [{ id: 'x', crop: 'Kale', zone: 'gone', status: 'planted', plantDate: addDaysToLocalKey(today, -10) }, { id: 'h', crop: 'Kale', zone: 'bed1', status: 'harvested' }] } };
  assert.deepEqual(plantingRows(lost, CROP_MAP, today).map((r) => [r.id, r.where, r.left]), [['x', '', null]]);
  assert.deepEqual(animalRows(fixture).map((a) => [a.id, a.name, a.count, a.zoneId, a.where]), [['hens', 'The hens', 3, 'coop', 'Chicken coop'], ['bees', 'Bee', 1, 'hive', 'Beehive']]);
  assert.deepEqual(animalRows({ ...DEF }), []);
});

test('desk cards: add, remove and move never go past four or repeat', () => {
  assert.deepEqual(addCard(['jobs'], 'rain'), ['jobs', 'rain']);
  assert.deepEqual(addCard(['jobs'], 'jobs'), ['jobs']);
  assert.deepEqual(addCard(['jobs'], 'nope'), ['jobs']);
  assert.deepEqual(addCard(['jobs', 'rain', 'eggs', 'time'], 'space'), ['jobs', 'rain', 'eggs', 'time']);
  assert.deepEqual(removeCard(['jobs', 'rain'], 'jobs'), ['rain']);
  assert.deepEqual(moveCard(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(moveCard(['a', 'b', 'c'], 2, 9), ['a', 'b', 'c']);
});
