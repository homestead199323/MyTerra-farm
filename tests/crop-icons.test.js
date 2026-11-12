import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CROPS } from '../src/data/crops.js';

/* Every crop has its own drawn icon: none falls back to a device emoji, and no two crops share one.
   Read from the source text so the test needs no JSX loader. */
const table = (file, start) => {
  const src = readFileSync(file, 'utf8'); // paths from the repo root, where `npm test` runs
  const out = [];
  let i = src.indexOf(start);
  while (i !== -1) {
    const body = src.slice(src.indexOf('{', i) + 1, src.indexOf('}', i));
    body.split(',').map((s) => s.replace(/\/\/.*$/gm, '').trim()).filter((s) => s && !s.startsWith('...')).forEach((entry) => {
      const [key, value] = entry.includes(':') ? entry.split(':').map((s) => s.trim()) : [entry, entry];
      out.push([key.replace(/^"|"$/g, ''), value]);
    });
    i = src.indexOf(start, i + start.length);
  }
  return out;
};
const icons = [
  ...table('src/components/FarmIcon.jsx', 'export const FARM_SVG = '),
  ...table('src/components/farm-icons-produce.jsx', 'export const PRODUCE_SVG = '),
  ...table('src/components/farm-icons-produce.jsx', 'Object.assign(PRODUCE_SVG, '),
];

test('icons: every crop has a drawn icon of its own', () => {
  const byName = new Map(icons);
  const missing = CROPS.map((c) => c.name).filter((n) => !byName.has(n));
  assert.deepEqual(missing, []);
  const used = CROPS.map((c) => byName.get(c.name));
  assert.equal(new Set(used).size, used.length, 'two crops share an icon component');
  assert.equal(new Set(icons.map((e) => e[0])).size, icons.length, 'an icon name is listed twice');
});
