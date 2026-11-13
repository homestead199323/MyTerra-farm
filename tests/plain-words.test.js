import test from 'node:test';
import assert from 'node:assert/strict';
import { stepText, guideStepNote, waterJobText, THIN_NOTE, SOW_THIN_NOTE } from '../src/lib/plain-words.js';

test('plain words: thinning is explained in jobs and once per guide', () => {
  assert.ok(stepText({ l: 'Thin', t: '12cm apart.' }).endsWith(THIN_NOTE));
  assert.equal(stepText({ l: 'Harvest', t: 'Pick young.' }), 'Pick young.');
  const steps = [{ l: 'Sow thin', t: 'a' }, { l: 'Germinate', t: 'b' }, { l: 'Thin', t: 'c' }, { l: 'Thin again', t: 'd' }];
  assert.equal(guideStepNote(steps, 0), SOW_THIN_NOTE);
  assert.equal(guideStepNote(steps, 2), THIN_NOTE);
  assert.equal(guideStepNote(steps, 3), '');
});

test('plain words: a water job says how often, and leaves out notes that are not about water', () => {
  assert.equal(waterJobText({ waterFreq: 'Every 2-3 days', waterNote: 'Succession sow every 2-3 weeks.' }), 'Every 2-3 days');
  assert.equal(waterJobText({ waterFreq: 'Daily', waterNote: 'Keep moist.' }), 'Daily. Keep moist.');
});
