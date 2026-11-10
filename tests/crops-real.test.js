import test from 'node:test';
import assert from 'node:assert/strict';
import { cropGeometry, cropKey, cropTier } from '../src/features/grove/crops3d.js';
import { realCrop } from '../src/features/grove/crops-real.js';
import { PlantKit, SURF } from '../src/features/grove/plantkit.js';
import { CONTAINER_FRIENDLY } from '../src/lib/suggest.js';
import { CROP_MAP } from '../src/data/crops.js';
import { treeKey } from '../src/features/grove/crop-families.js';

const CROPS = [...CROP_MAP.keys()].filter((n) => !treeKey(n));

const tris = (g) => g.index.count / 3;
// triangles one plant may cost at each level of detail (docs/MAP_STYLE.md §9)
const BUDGET = [8000, 2300, 950, 650, 650];

test('every crop has a true-to-life model of its own', () => {
  const greens = realCrop('Some Unknown Leaf').idx;
  for (const name of [...CONTAINER_FRIENDLY, ...CROPS]) assert.notEqual(realCrop(name).idx, greens, `${name} has its own entry in crops-real.js`);
  assert.notEqual(realCrop('Sweet Potato').idx, realCrop('Potato').idx); assert.notEqual(realCrop('Watermelon').idx, realCrop('Melon').idx); assert.notEqual(realCrop('Broad Bean').idx, realCrop('Bean (Dry)').idx);
  assert.notEqual(realCrop('Pepper (Hot)').idx, realCrop('Pepper (Sweet)').idx, 'hot and sweet peppers are different plants');
});

test('true-to-life crops stay inside their triangle budget at every stage and level of detail', () => {
  const over = [];
  for (const name of [...new Set([...CROPS, 'Sage', 'Rocket', 'Chive', 'Some Unknown Leaf'])]) {
    for (let stage = 2; stage <= 5; stage++) {
      let last = Infinity;
      for (let tier = 0; tier <= 4; tier++) {
        const g = cropGeometry(name, stage, tier), n = tris(g);
        if (n > BUDGET[tier]) over.push(`${name} s${stage} t${tier}: ${n} > ${BUDGET[tier]}`);
        assert.ok(n <= last, `${name} stage ${stage}: tier ${tier} is not heavier than tier ${tier - 1}`);
        assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite), `${name}: finite vertices`);
        last = n;
      }
    }
    // stage 4, not 5: onions and garlic flop over when they are ready
    const young = cropGeometry(name, 2, 0), grown = cropGeometry(name, 4, 0); young.computeBoundingBox(); grown.computeBoundingBox();
    assert.ok(grown.boundingBox.max.y > young.boundingBox.max.y, `${name} grows taller between stage 2 and stage 4`);
  }
  assert.deepEqual(over, [], 'models over their triangle budget');
});

test('a plant model splits into solid parts and leaf blades, each carrying its surface kind', () => {
  const g = cropGeometry('Tomato', 5, 0), s = g.attributes.g3s;
  assert.equal(g.groups.length, 2); assert.equal(g.groups[0].materialIndex, 0); assert.equal(g.groups[1].materialIndex, 1);
  assert.equal(g.groups[0].count + g.groups[1].count, g.index.count);
  const kindAt = (i) => s.getX(g.index.getX(i));
  for (let i = 0; i < g.groups[0].count; i += 7) assert.notEqual(kindAt(i), SURF.leaf, 'no leaf blade among the solid parts');
  let leafy = 0; for (let i = g.groups[1].start; i < g.index.count; i++) if (kindAt(i) === SURF.leaf) leafy++;
  assert.ok(leafy > g.groups[1].count * .6, 'the second group is mostly leaf blade (plus petals and calyx lobes)');
  let fruit = 0; for (let i = 0; i < s.count; i++) if (s.getX(i) === SURF.fruit) fruit++;
  assert.ok(fruit > 100, 'ripe tomatoes carry the fruit-skin surface');
  const seed = cropGeometry('Carrot', 1, 0); assert.equal(seed.groups.length, 0); assert.ok(seed.attributes.g3s, 'the seedling joins the same material with a plain surface');
});

test('a leaf blade is a pointed sheet along +z with veins mapped across it', () => {
  const P = new PlantKit(1); P.blade(1, .5, 0x3f8f47, { fold: 0, droop: 0, rise: 0, rows: 4 }); const g = P.build(), p = g.attributes.position, s = g.attributes.g3s;
  g.computeBoundingBox(); assert.ok(Math.abs(g.boundingBox.max.z - 1) < 1e-6 && Math.abs(g.boundingBox.min.z) < 1e-6);
  assert.ok(g.boundingBox.max.x <= .2501 && g.boundingBox.max.x > .2, 'half the width either side of the midrib');
  assert.equal(p.count, 15); assert.equal(g.index.count / 3, 16);
  const us = new Set(), vs = new Set(); for (let i = 0; i < s.count; i++) { us.add(Math.round(s.getZ(i))); vs.add(s.getW(i)); }
  assert.deepEqual([...us].sort(), [-1, 0, 1]); assert.equal(vs.size, 5);
  const lite = new PlantKit(.12); lite.blade(1, .5, 0x3f8f47, { rows: 4 }); const gl = lite.build(); gl.computeBoundingBox();
  assert.ok(gl.boundingBox.max.x > .5, 'a lighter model carries larger leaves, so the plant keeps its volume');
});

test('level of detail follows how many plants share the map', () => {
  assert.equal(cropTier(8, false), 0); assert.equal(cropTier(24, false), 0); assert.equal(cropTier(25, false), 1);
  assert.equal(cropTier(90, false), 1); assert.equal(cropTier(91, false), 2); assert.equal(cropTier(301, false), 3); assert.equal(cropTier(5000, false), 4);
  assert.equal(cropTier(8, true), 1, 'the phone farm tier is one step lighter'); assert.equal(cropTier(5000, true), 4);
  assert.notEqual(cropKey('Tomato', 5, 0), cropKey('Tomato', 5, 1)); assert.notEqual(cropKey('Tomato', 5, 0), cropKey('Carrot', 5, 0));
  assert.equal(cropKey('Tomato', 1, 0), cropKey('Lettuce', 1, 0), 'every crop shares the sprout');
});
