import test from 'node:test';
import assert from 'node:assert/strict';
import { addDiary, removeDiary, diaryOf, diaryDate, entryLabel, openIssues, revisits, DIARY_CAP } from '../src/lib/diary.js';

const plot = { id: 'p1', crop: 'Garlic', zone: 'bed' };
const base = () => ({ observations: [], log: [] });
const at = (d, h = 9) => `2026-11-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00.000Z`;

test('Diary: an entry lands on the plant, newest first, with its name', () => {
  let d = addDiary(base(), plot, { kind: 'water' }, at(10), 'a');
  d = addDiary(d, plot, { kind: 'note', note: '  first shoots  ' }, at(11), 'b');
  d = addDiary(d, { id: 'p2', crop: 'Kale', zone: 'bed' }, { kind: 'feed' }, at(11, 10), 'c');
  const mine = diaryOf(d, 'p1');
  assert.deepEqual(mine.map((e) => e.id), ['b', 'a']);
  assert.equal(mine[0].note, 'first shoots');
  assert.deepEqual([entryLabel(mine[1]), entryLabel(mine[0])], ['Watered', 'Note']);
  assert.equal(entryLabel({ status: 'issue' }), 'Needs a closer look'); // a walk check keeps its verdict
  assert.equal(mine[0].zoneId, 'bed');
  // waterings and feeds stay out of the 200-line activity log; a note is in it
  assert.deepEqual(d.log.map((l) => l.text), ['Garlic: note — first shoots']);
  assert.equal(addDiary(base(), plot, { kind: 'nonsense' }, at(1), 'x').observations[0].kind, 'note');
});

test('Diary: a problem flags the area until it is sorted or walked; a watering does not clear it', () => {
  let d = addDiary(base(), plot, { kind: 'issue', note: 'yellow tips' }, at(10), 'i');
  assert.equal(openIssues(d.observations).length, 1);
  d = addDiary(d, plot, { kind: 'water' }, at(11), 'w');
  d = addDiary(d, plot, { kind: 'photo', photo: 'data:image/jpeg;base64,xx' }, at(11, 10), 'ph');
  assert.equal(openIssues(d.observations).length, 1);
  assert.equal(revisits({ kind: 'water' }), false);
  const sorted = addDiary(d, plot, { kind: 'ok' }, at(12), 's');
  assert.equal(openIssues(sorted.observations).length, 0);
  const walked = { ...d, observations: [...d.observations, { id: 'wk', at: at(12), zoneId: 'bed', status: 'healthy' }] };
  assert.equal(openIssues(walked.observations).length, 0);
});

test('Diary: removing takes diary entries only; the list is trimmed from the oldest waterings', () => {
  let d = addDiary(base(), plot, { kind: 'note', note: 'keep' }, at(1), 'n');
  d = { ...d, observations: [...d.observations, { id: 'walk', at: at(2), zoneId: 'bed', plotId: 'p1', status: 'healthy' }] };
  assert.equal(removeDiary(d, 'walk').observations.length, 2);
  assert.equal(removeDiary(d, 'n').observations.length, 1);
  for (let i = 0; i < DIARY_CAP + 20; i++) d = addDiary(d, plot, { kind: 'water' }, at(3), 'w' + i);
  assert.equal(d.observations.length, DIARY_CAP);
  assert(d.observations.some((e) => e.id === 'n') && d.observations.some((e) => e.id === 'walk'));
  assert.equal(d.observations.at(-1).id, 'w' + (DIARY_CAP + 19));
});

test('Diary dates read Today, Yesterday, then the day', () => {
  const now = new Date(2026, 10, 11, 15);
  assert.equal(diaryDate(new Date(2026, 10, 11, 8).toISOString(), now), 'Today');
  assert.equal(diaryDate(new Date(2026, 10, 10, 23).toISOString(), now), 'Yesterday');
  assert.match(diaryDate(new Date(2026, 9, 2, 8).toISOString(), now), /2/);
});
