import test from 'node:test';
import assert from 'node:assert/strict';
import { flat, ripple, detailFor, setDetail, sphereGeo } from '../src/features/grove/toy.js';

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
