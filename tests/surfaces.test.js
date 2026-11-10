import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { texture, TEXTURES } from '../src/features/grove/toy.js';
import { TREE_SPECIES, DECO_TREES, treeGeometry } from '../src/features/grove/trees-real.js';
import { buildCrops } from '../src/features/grove/crops3d.js';

// what three hands onBeforeCompile, reduced to the chunks the patch looks for
const fakeShader = () => ({
  uniforms: {},
  vertexShader: 'A\n#include <common>\nB\nvoid main() {\n#include <project_vertex>\n}',
  fragmentShader: 'A\n#include <common>\nvoid main() {\n#include <color_fragment>\n#include <normal_fragment_maps>\n}',
});
const compile = (kind) => { const m = texture(new THREE.MeshLambertMaterial(), kind), sh = fakeShader(); m.onBeforeCompile(sh, null); return { m, sh }; };

test('every surface kind patches the shader: world position and uv out, colour and height in, normal tilted', () => {
  assert.ok(TEXTURES.length >= 16);
  for (const need of ['meadow', 'lawn', 'soil', 'gravel', 'roof', 'slate', 'plaster', 'wood', 'planks', 'stone', 'concrete', 'clay', 'metal', 'zinc', 'hay', 'hedge', 'tile']) assert.ok(TEXTURES.includes(need), need);
  for (const kind of TEXTURES) {
    const { m, sh } = compile(kind), f = sh.fragmentShader;
    assert.match(sh.vertexShader, /vG3W = \(modelMatrix \* g3p\)\.xyz; vG3U = uv;/, kind);
    assert.ok(f.includes('float g3H = 0.; float g3K = 0.;') && f.includes('vec3 g3bump(vec3 n)') && f.includes('if (g3K > 0.) normal = g3bump(normal);'), kind);
    assert.ok(f.indexOf('vec3 g3bump') < f.indexOf('void main() {'), `${kind}: the bump helper is declared before main`);
    assert.ok(m.customProgramCacheKey().endsWith(`|g3tex-c-${kind}`), `${kind}: its own program`);
    const body = f.slice(f.indexOf('#include <color_fragment>'), f.indexOf('#include <normal_fragment_maps>'));
    assert.equal((body.match(/{/g) || []).length, (body.match(/}/g) || []).length, `${kind}: braces balance`);
    assert.equal((body.match(/\(/g) || []).length, (body.match(/\)/g) || []).length, `${kind}: brackets balance`);
    assert.ok(!/\d\.\d*f\b/.test(body) && !/[^.\w]\d+\s*\*\s*fine/.test(body), `${kind}: float literals only`);
  }
});

test('fine surface detail is only computed near the camera', () => {
  for (const kind of TEXTURES.filter((k) => k !== 'tile')) {
    const body = compile(kind).sh.fragmentShader.split('#include <color_fragment>')[1];
    assert.ok(body.includes('if (fine > .02) {'), `${kind} gates its detail`);
    const far = body.slice(0, body.indexOf('if (fine > .02) {'));
    assert.ok((far.match(/g3n\(/g) || []).length <= 2, `${kind} costs at most two noise lookups far away`);
    assert.ok(!far.includes('g3face()') && !far.includes('g3member()'), `${kind} takes no derivatives far away`);
  }
});

test('a material is textured once, and the patch chains with an earlier one', () => {
  const m = new THREE.MeshLambertMaterial(); let called = 0; m.onBeforeCompile = () => { called++; }; m.customProgramCacheKey = () => 'first';
  assert.equal(texture(texture(m, 'wood'), 'stone'), m); assert.equal(m.userData.g3tex, 'wood');
  m.onBeforeCompile(fakeShader(), null); assert.equal(called, 1); assert.equal(m.customProgramCacheKey(), 'first|g3tex-c-wood');
});

test('decoration trees are true-to-life species without fruit', () => {
  assert.deepEqual(DECO_TREES, ['oak', 'lime', 'maple', 'birch', 'olive', 'citrus']);
  for (const key of DECO_TREES) assert.ok(TREE_SPECIES.includes(key), key);
  for (const key of ['oak', 'lime', 'maple', 'birch']) assert.equal(treeGeometry(key, true, 2).index.count, treeGeometry(key, false, 2).index.count, `${key} bears no fruit`);
  const tall = (key) => { const g = treeGeometry(key, false, 1); g.computeBoundingBox(); const b = g.boundingBox; return (b.max.y - b.min.y) / (b.max.x - b.min.x); };
  assert.ok(tall('birch') > tall('oak') * 1.25, 'a birch is narrow, an oak is broad');
});

test('trees standing on the property get their own level of detail and never change the orchard', () => {
  const orchard = (n) => Array.from({ length: n }, (_, i) => ({ name: 'apple', tree: true, stage: 4, x: i, y: 0, z: 0, s: 1, ry: 0 }));
  const deco = (n) => Array.from({ length: n }, (_, i) => ({ name: 'oak', tree: true, deco: true, stage: 4, x: i, y: 0, z: 9, s: 1, ry: 0 }));
  const tiers = (items) => { buildCrops(new THREE.Group(), items, { value: 0 }); return items.map((it) => it.tier); };
  assert.deepEqual(tiers(orchard(3)), [0, 0, 0]);
  const mixed = [...orchard(3), ...deco(30)]; tiers(mixed);
  assert.deepEqual(mixed.slice(0, 3).map((it) => it.tier), [0, 0, 0], 'thirty garden trees leave three apple trees at full detail');
  assert.equal(mixed[3].tier, 3);
  assert.ok(tiers(deco(2)).every((t) => t === 1), 'a decoration tree never gets the heaviest model');
});
