import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { flat, ripple, detailFor, setDetail, sphereGeo, rboxGeo, bakeSource, mergeBaked, setEnvironment, fillLight, Parts } from '../src/features/grove/toy.js';

// a stand-in for three's shader parameters object handed to onBeforeCompile
const shaderStub = () => ({ uniforms: {}, vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>\n', fragmentShader: '#include <common>\n' });
const count = (s, needle) => s.split(needle).length - 1;

test('toy: flat() shares one material per option set', () => assert.equal(flat(0x123456), flat(0x123456)));
test('toy: flat() variant gives a distinct material for the same options', () => assert.notEqual(flat(0x123456, { variant: 'pond' }), flat(0x123456)));
test('toy: ripple() applied twice declares its uniforms once', () => {
  const mat = flat(0xabcdef, { variant: 'ripple-test' }), u = { time: { value: 0 }, ripple: { value: 1 } };
  ripple(mat, u); ripple(mat, u);
  const sh = shaderStub(); mat.onBeforeCompile(sh, null);
  assert.equal(count(sh.vertexShader, 'uniform float uRipple'), 1);
  assert.equal(count(sh.vertexShader, 'uniform float uTime'), 1);
  assert.equal(sh.uniforms.uRipple, u.ripple);
});
test('toy: ripple() keeps an earlier onBeforeCompile', () => {
  const mat = flat(0xabcdef, { variant: 'ripple-chain' }); let ran = 0; mat.onBeforeCompile = () => { ran++; };
  ripple(mat, { time: { value: 0 }, ripple: { value: 1 } });
  mat.onBeforeCompile(shaderStub(), null);
  assert.equal(ran, 1);
});

test('toy: a phone keeps full detail on a balcony or back garden; farms and packed gardens get the lighter tier', () => {
  assert.equal(detailFor({ mobile: false, env: 'farm', zones: 40, plants: 2000 }), 1);
  assert.equal(detailFor({ mobile: true, env: 'balcony', zones: 3, plants: 28 }), 1);
  assert.equal(detailFor({ mobile: true, env: 'backyard', zones: 4, plants: 60 }), 1);
  assert.equal(detailFor({ mobile: true, env: 'backyard', zones: 4, plants: 400 }), .45);
  assert.equal(detailFor({ mobile: true, env: 'farm', zones: 2, plants: 10 }), .45);
});
test('toy: tree crowns keep their roundness on the phone tier', () => {
  setDetail(.45);
  try {
    const small = sphereGeo(16, 12), crown = sphereGeo(16, 12, 10, 7);
    assert.equal(small.parameters.widthSegments, 7); assert.equal(small.parameters.heightSegments, 5);
    assert.equal(crown.parameters.widthSegments, 10); assert.equal(crown.parameters.heightSegments, 7);
  } finally { setDetail(1); }
  assert.equal(sphereGeo(16, 12, 10, 7).parameters.widthSegments, 16);
});

test('toy: baking keeps geometry indexed and returns a geometry the world owns', () => {
  const box = rboxGeo(1, .5, .4), ball = sphereGeo(14, 10);
  assert.equal(box.index, null, 'a rounded box starts without an index');
  const a = bakeSource(box), b = bakeSource(ball);
  assert.ok(a.index && b.index); assert.equal(bakeSource(box), a, 'cached per primitive');
  assert.ok(a.attributes.position.count < box.attributes.position.count / 2, 'welded: far fewer vertices than three per triangle');
  assert.equal(a.index.count, box.attributes.position.count, 'same triangles');
  assert.equal(box.userData.shared, true); assert.equal(box.index, null, 'the cached primitive itself is untouched');
  const move = new THREE.Matrix4().makeTranslation(10, 0, -3), turn = new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(0, 2, 0);
  const one = mergeBaked([{ geo: a, matrix: move }]);
  assert.notEqual(one, a); assert.equal(one.userData.shared, undefined, 'a lone primitive is not handed out with its shared flag (it leaked on every rebuild)');
  const g = mergeBaked([{ geo: a, matrix: move }, { geo: b, matrix: turn }]);
  assert.equal(g.attributes.position.count, a.attributes.position.count + b.attributes.position.count);
  assert.equal(g.index.count, a.index.count + b.index.count);
  g.computeBoundingBox();
  assert.ok(Math.abs(g.boundingBox.max.x - 10.5) < 1e-4 && Math.abs(g.boundingBox.min.z + 3.2) < 1e-4, 'the box moved to 10, 0, -3');
  assert.ok(Math.abs(g.boundingBox.max.y - 3) < 1e-4, 'the unit sphere sits at height 2');
  // same result as three's own applyMatrix4 on a copy
  const ref = b.clone(); ref.applyMatrix4(turn); const off = a.attributes.position.count;
  for (const i of [0, 7, 40, b.attributes.position.count - 1]) for (let k = 0; k < 3; k++) {
    assert.ok(Math.abs(g.attributes.position.array[(off + i) * 3 + k] - ref.attributes.position.array[i * 3 + k]) < 1e-5);
    assert.ok(Math.abs(g.attributes.normal.array[(off + i) * 3 + k] - ref.attributes.normal.array[i * 3 + k]) < 1e-5);
  }
  assert.equal(g.index.array[a.index.count], b.index.array[0] + off, 'indices are offset per item');
  // a big merge switches to 32-bit indices
  const many = mergeBaked(Array.from({ length: 500 }, () => ({ geo: b, matrix: move })));
  assert.ok(many.attributes.position.count > 65535); assert.ok(many.index.array instanceof Uint32Array);
});
test('toy: a model with a rounded box in it stays indexed', () => {
  const P = new Parts(); P.rbox(.4, .2, .3, 0xaa5533); P.sphere(.2, 0x44aa55, { pos: [0, .3, 0] });
  const g = P.build();
  assert.ok(g.index, 'one box no longer turns the whole model into loose triangles');
  assert.ok(g.attributes.position.count < g.index.count);
});
test('toy: matte surfaces are Lambert, glossy ones keep the physical model and the environment map', () => {
  const wall = flat(0x123456, { variant: 'lambert-test' }), glass = flat(0x9fc9dc, { rough: .18, physical: true, variant: 'gloss-test' }), zinc = flat(0xc6cdd0, { rough: .6, metal: .15, variant: 'gloss-test' });
  assert.equal(wall.isMeshLambertMaterial, true); assert.equal(glass.isMeshPhysicalMaterial, true); assert.equal(zinc.isMeshStandardMaterial, true);
  const tex = new THREE.Texture();
  setEnvironment(tex, .2);
  assert.equal(glass.envMap, tex); assert.equal(zinc.envMap, tex); assert.equal(glass.envMapIntensity, .2); assert.equal(wall.envMap, null);
  const later = flat(0x9fc9dc, { rough: .1, physical: true, variant: 'gloss-late' }); assert.equal(later.envMap, tex, 'a glossy material made later gets the map too');
  setEnvironment(null, .22); assert.equal(glass.envMap, null);
});
test('toy: the hemisphere light carries the fill the environment map used to give', () => {
  const day = fillLight([1, 1, 1], [.45, .41, .19], .66, .22), night = fillLight([.1, .17, .38], [.03, .04, .08], .75, .14);
  assert.ok(Math.abs(day.sky[0] - (.66 + .907 * .22 * 5.36)) < 1e-9);
  assert.ok(day.ground[2] > .19 * .66 + 1, 'the ground colour gets the same fill');
  assert.ok(night.sky[0] < day.sky[0] && night.sky[2] > night.sky[0]);
});
