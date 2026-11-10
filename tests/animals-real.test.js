import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHerd, animalTier, ANIMAL_Q } from '../src/features/grove/animals3d.js';
import { LDB } from '../src/data/livestock.js';

const TYPES = [...Object.keys(LDB).filter((t) => t !== 'Bee'), 'Alpaca'];
const SMALL = new Set(['Chicken', 'Duck', 'Goose', 'Turkey', 'Quail', 'Guinea Fowl', 'Rabbit']);
const herd = (type, n, variant) => buildHerd(Array.from({ length: n }, (_, i) => ({ type, x: i, z: 0, heading: 0, seed: 3 + i, variant })), { value: 0 });
const N = [1, 7, 17, 41]; // herd sizes that land on levels of detail 0 to 3
// triangles one animal may cost at each level of detail (docs/MAP_STYLE.md §10)
const BUDGET = { big: [7000, 4000, 2900, 2200], small: [2200, 1500, 1150, 900] };

test('herds get lighter models as they grow, and a phone on a big farm drops one more level', () => {
  assert.deepEqual([1, 6, 7, 16, 17, 40, 41, 400].map((n) => animalTier(n, false)), [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.deepEqual([1, 7, 17, 41].map((n) => animalTier(n, true)), [1, 2, 3, 3]);
  assert.equal(ANIMAL_Q.length, 4);
});

test('every animal stays inside its triangle budget at every level of detail', () => {
  const over = [];
  for (const type of TYPES) {
    let last = Infinity;
    N.forEach((n, tier) => {
      for (const variant of tier ? [0] : [0, 1, 2, 3]) {
        const h = herd(type, n, variant), per = h.mesh.geometry.index.count / 3 / h.ranges.length, cap = BUDGET[SMALL.has(type) ? 'small' : 'big'][tier];
        if (per > cap) over.push(`${type} v${variant} level ${tier}: ${Math.round(per)} > ${cap}`);
        if (!variant) { if (per >= last) over.push(`${type} level ${tier} is not lighter than level ${tier - 1}`); last = per; }
      }
    });
  }
  assert.deepEqual(over, []);
});

test('animal models carry clean vertex data and the coat attributes the material reads', () => {
  for (const type of TYPES) for (const variant of [0, 1, 2, 3]) {
    const g = herd(type, 1, variant).mesh.geometry;
    for (const name of ['position', 'normal', 'color', 'g3p', 'g3s', 'g3k']) {
      const a = g.attributes[name]; assert.ok(a, `${type} has ${name}`); assert.equal(a.count, g.attributes.position.count);
      assert.ok(a.array.every(Number.isFinite), `${type} v${variant} ${name} has only finite numbers`); // a field function passed as a colour painter once turned a whole body black
    }
    const c = g.attributes.color.array, s = g.attributes.g3s; let coat = 0;
    assert.ok(c.every((v) => v >= 0 && v <= 1.001), `${type} colours stay in range`);
    for (let i = 0; i < s.count; i++) if (s.getX(i) > 3.5) coat++;
    assert.ok(coat / s.count > .5, `${type} is mostly coat or plumage`);
  }
});

test('breed patches are a field in the vertices: patched coats have vertices on both sides of the cut, plain coats have none', () => {
  const sides = (type, variant) => { const s = herd(type, 1, variant).mesh.geometry.attributes.g3s; let inP = 0, out = 0; for (let i = 0; i < s.count; i++) { const f = s.getZ(i); if (f > -8) (f > s.getW(i) ? inP++ : out++); } return [inP, out]; };
  const [a, b] = sides('Cow', 0); assert.ok(a > 100 && b > 100, `a black and white cow has both colours (${a}, ${b})`);
  assert.deepEqual(sides('Cow', 2), [0, 0]); // a plain brown cow
  assert.deepEqual(sides('Pig', 0), [0, 0]);
});
