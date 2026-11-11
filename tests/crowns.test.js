import test from 'node:test';
import assert from 'node:assert/strict';
import { crownGeo, hedgeGeo, CROWN_HABITS, CROWN_TRIS } from '../src/features/grove/crowns.js';
import { setDetail } from '../src/features/grove/toy.js';

const radii = (g) => { const p = g.attributes.position, out = []; for (let i = 0; i < p.count; i++) out.push(Math.hypot(p.getX(i), p.getY(i), p.getZ(i))); return out; };
const tris = (g) => g.index.count / 3;
const flagged = (g) => { const u = g.attributes.uv; for (let i = 0; i < u.count; i++) if (!(u.getX(i) >= 2.3 && u.getX(i) <= 3.3)) return false; return true; };

test('crowns: every habit is an indexed, lumpy, shade-flagged form inside its triangle budget', () => {
  setDetail(1);
  for (const habit of CROWN_HABITS) for (let v = 0; v < 3; v++) {
    const g = crownGeo(habit, v);
    assert.ok(g.index && g.attributes.normal && g.attributes.uv, habit + ' attributes');
    assert.ok(tris(g) <= CROWN_TRIS[habit === 'shrub' ? 'shrub' : 'tree'][0], `${habit} ${tris(g)} triangles`);
    const r = radii(g), lo = Math.min(...r), hi = Math.max(...r);
    assert.ok(hi / lo > 1.25, `${habit} v${v} is not a ball (${(hi / lo).toFixed(2)})`);
    assert.ok(flagged(g), habit + ' carries the shade flag in uv.x');
    assert.ok(g.userData.shared, 'cached crowns survive a rebuild');
    const p = g.attributes.position, n = g.attributes.normal; let out = 0;
    for (let i = 0; i < p.count; i++) if (p.getX(i) * n.getX(i) + p.getY(i) * n.getY(i) + p.getZ(i) * n.getZ(i) > 0) out++;
    assert.ok(out > p.count * .9, habit + ' faces outwards');
  }
});
test('crowns: same arguments give the same cached geometry; variants differ', () => {
  setDetail(1);
  assert.equal(crownGeo('round', 1), crownGeo('round', 1));
  assert.notEqual(crownGeo('round', 1), crownGeo('round', 2));
  const a = crownGeo('round', 0).attributes.position.array, b = crownGeo('round', 2).attributes.position.array;
  let diff = 0; for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
  assert.ok(diff > 5, 'variants are different shapes');
});
test('crowns: the phone farm tier builds lighter crowns', () => {
  setDetail(.45); const light = crownGeo('round', 0); setDetail(1); const full = crownGeo('round', 0);
  assert.ok(tris(light) <= CROWN_TRIS.tree[1] && tris(light) < tris(full));
});
test('crowns: a crown is flatter underneath than on top, and darker there', () => {
  setDetail(1);
  const g = crownGeo('round', 0), p = g.attributes.position, u = g.attributes.uv; let lo = 0, hi = 0, sLo = 0, sHi = 0;
  for (let i = 0; i < p.count; i++) { if (p.getY(i) < p.getY(lo)) lo = i; if (p.getY(i) > p.getY(hi)) hi = i; }
  sLo = u.getX(lo); sHi = u.getX(hi);
  assert.ok(-p.getY(lo) < p.getY(hi) * .8, 'flat base');
  assert.ok(sLo < sHi - .2, 'underside is shaded');
});
test('crowns: a hedge run covers its length, sits on the ground and keeps its height within a few per cent', () => {
  setDetail(1);
  const g = hedgeGeo(12, 1.4, .8, 7); g.computeBoundingBox(); const b = g.boundingBox;
  assert.ok(g.index && flagged(g));
  assert.ok(Math.abs(b.min.y) < 1e-6 && b.max.y > 1.4 * .95 && b.max.y < 1.4 * 1.12);
  assert.ok(b.max.x - b.min.x > 12 && b.max.x - b.min.x < 12 + .8);
  assert.ok(b.max.z - b.min.z > .8 * .9 && b.max.z - b.min.z < .8 * 1.25);
  assert.ok(tris(g) < 12 * 60, tris(g) + ' triangles');
  assert.notEqual(hedgeGeo(12, 1.4, .8, 7), g, 'hedge runs are not cached');
  const p = g.attributes.position, n = g.attributes.normal; let top = 0, side = 0;
  for (let i = 0; i < p.count; i++) { if (p.getY(i) > p.getY(top)) top = i; if (Math.abs(p.getX(i)) < 3 && p.getZ(i) > p.getZ(side)) side = i; }
  assert.ok(n.getY(top) > .7, 'the top faces up (winding)');
  assert.ok(n.getZ(side) > .7, 'the +z side faces out');
});
