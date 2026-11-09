/* ═══════════════════════════════════════════
   ANIMALS 3D — every farm animal on the 3D map is built from geometry (no sprites): a body,
   neck and head, ears, horns, legs with hooves, a tail, plus species details (udder, mane,
   wool, comb, wattle, fan tail…), coloured per vertex so a herd has natural variety.
   All animals of the farm are merged into ONE mesh (one draw call, one shadow pass) and
   move in the vertex shader from the shared clock: they walk slow loops inside their
   paddock, stop and graze (head down, nibbling), swish tails, hens strut and peck,
   rabbits hop. Local space: forward = +z, up = +y, ground = y 0, body centre at x/z 0.
   Toy proportions (v2): plump rounded bodies, big heads and eyes, short chunky legs with
   rounded hooves, smooth high-segment surfaces, matte vertex colours.
   MARKER: GROVE_ANIMALS_3D_V2
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DETAIL } from "./toy";
// phones build animals with fewer segments too (toy.js setDetail)
const sd = (n, min) => Math.max(min, Math.round(n * DETAIL.value));
const sph = (a, b) => new THREE.SphereGeometry(1, sd(a, 5), sd(b, 4));

const HPI = Math.PI / 2, DEG = Math.PI / 180;
// parts (drive the shader): 0 body, 1 head+neck (pivot at the neck base), 3-6 legs FL FR BL BR (pivot at hip), 7 tail
const PART = { body: 0, head: 1, FL: 3, FR: 4, BL: 5, BR: 6, tail: 7 };
// kinds: 0 grazer (head down to the grass), 1 bird (pecks), 2 hopper (rabbit)
const KIND = { grazer: 0, bird: 1, hopper: 2 };
const col = (hex) => new THREE.Color(hex);
function rng(seed) { let t = (Math.floor(seed * 1000003) ^ 0x5bd1e995) >>> 0; return () => { t = (t + 0x6d2b79f5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; } // mulberry32: consecutive seeds give unrelated sequences
// blobby patch noise for cow / goat / pinto coats
function patchy(x, y, z, k) { return Math.sin(x * 4.1 + k) * Math.sin(y * 3.3 + k * .7) + Math.sin(z * 3.7 + k * 1.3) * Math.cos(x * 2.2 - k) + .5 * Math.sin((x + z) * 6.3 + y * 5 + k * 2); }

/* ---------- a rig collects coloured primitives with their part id and pivot ---------- */
class Rig {
  constructor() { this.geos = []; }
  add(geo, color, { part = PART.body, pivot = [0, 0, 0], pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, paint = null } = {}) {
    const M = new THREE.Matrix4(), E = new THREE.Euler(rot[0], rot[1], rot[2], "YXZ"), Q = new THREE.Quaternion().setFromEuler(E);
    const S = Array.isArray(scale) ? new THREE.Vector3(...scale) : new THREE.Vector3(scale, scale, scale);
    M.compose(new THREE.Vector3(...pos), Q, S); geo.applyMatrix4(M);
    const n = geo.attributes.position.count, cA = new Float32Array(n * 3), pA = new Float32Array(n * 4), P = geo.attributes.position, c0 = color.isColor ? color : col(color);
    for (let i = 0; i < n; i++) {
      const c = paint ? paint(P.getX(i), P.getY(i), P.getZ(i), c0) : c0;
      cA[i * 3] = c.r; cA[i * 3 + 1] = c.g; cA[i * 3 + 2] = c.b;
      pA[i * 4] = part; pA[i * 4 + 1] = pivot[0]; pA[i * 4 + 2] = pivot[1]; pA[i * 4 + 3] = pivot[2];
    }
    geo.setAttribute("color", new THREE.BufferAttribute(cA, 3)); geo.setAttribute("g3p", new THREE.BufferAttribute(pA, 4));
    geo.deleteAttribute("uv");
    this.geos.push(geo); return geo;
  }
  ell(rx, ry, rz, color, o = {}) { return this.add(new THREE.SphereGeometry(1, sd(o.seg || 10, 6), sd(o.rings || 7, 4)), color, { ...o, scale: [rx, ry, rz] }); }
  box(w, h, d, color, o = {}) { return this.add(new THREE.BoxGeometry(w, h, d), color, o); }
  cyl(rt, rb, h, color, o = {}) { return this.add(new THREE.CylinderGeometry(rt, rb, h, sd(o.seg || 8, 5), 1), color, o); }
  cone(r, h, color, o = {}) { return this.add(new THREE.ConeGeometry(r, h, o.seg || 6), color, o); }
  capsule(r, len, color, o = {}) { return this.add(new THREE.CapsuleGeometry(r, len, sd(o.cap || 3, 2), sd(o.seg || 10, 6), sd(o.hseg || 1, 1)), color, o); } // along local y before rot
  // a limb from a to b (world-local points), radius r0 → r1
  bar(a, b, r0, r1, color, o = {}) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B), geo = new THREE.CylinderGeometry(r1, r0, len, sd(o.seg || 7, 4), 1);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()), M = new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), q, new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(M); return this.add(geo, color, o);
  }
  build() { const g = mergeGeometries(this.geos, false); this.geos.forEach((x) => x.dispose()); return g; }
}

/* ---------- quadrupeds ---------- */
function quadruped(S, r, vi) {
  const R = new Rig(), C = S.colors(r, vi);
  const { L, H } = S, br = S.br * 1.3, bw = S.bw || 1, bl = L * (S.bodyFrac || .6) * .78, by = H - br * .95;
  const pk = 2.6 / L, paint = C.patch ? (x, y, z, c) => (patchy(x * pk, y * pk, z * pk, S.seed * 3.7) > (S.patchCut ?? .35) ? C.patch : c) : null;
  // body: a capsule along z, wider than tall for cattle and pigs
  R.capsule(br, bl, C.body, { rot: [HPI, 0, 0], pos: [0, by, 0], scale: [bw, 1, 1], paint, cap: paint ? 7 : 4, seg: paint ? 26 : 18, hseg: paint ? 12 : 1 }); // patched coats need a fine mesh or the patches go blocky
  R.ell(br * bw * 1.05, br * 1.04, br * 1.0, C.body, { pos: [0, by - br * .03, bl / 2 - br * .25], paint, seg: paint ? 24 : 16, rings: paint ? 18 : 12 }); // a deep round chest
  R.ell(br * bw * 1.08, br * 1.02, br * .95, C.body, { pos: [0, by - br * .02, -bl / 2 + br * .3], paint, seg: paint ? 24 : 16, rings: paint ? 18 : 12 }); // and a round rump: every toy animal is a little plump
  // neck + head pivot at the withers
  const n0 = [0, by + br * .35, bl / 2 + br * .1], up = S.neck.up, nl = S.neck.len;
  const n1 = [0, n0[1] + Math.sin(up) * nl, n0[2] + Math.cos(up) * nl];
  const head = (g, o) => R.add(g, o.color || C.head, { ...o, part: PART.head, pivot: n0 });
  R.bar(n0, n1, S.neck.r0, S.neck.r1, C.body, { part: PART.head, pivot: n0, paint, seg: 9 });
  if (S.mane) R.box(br * .12, S.mane, nl * .9, C.mane || C.tuft, { part: PART.head, pivot: n0, pos: [0, (n0[1] + n1[1]) / 2 + S.neck.r0 * .9, (n0[2] + n1[2]) / 2], rot: [-up, 0, 0] });
  const hl = S.head.l * 1.12, hw = S.head.w * 1.3, hh = S.head.h * 1.28, pitch = S.head.pitch || 0, hc = [0, n1[1] + Math.sin(-pitch) * hl * .3, n1[2] + hl * .3];
  head(sph(16, 12), { pos: hc, scale: [hw, hh, hl * .66], rot: [pitch, 0, 0], paint });
  // snout / muzzle
  const sn = S.snout, sc = [0, hc[1] - sn.drop, hc[2] + hl * .5];
  head(sph(14, 10), { pos: sc, scale: [sn.w * 1.15, sn.h * 1.1, sn.l], color: C.muzzle || C.head, paint: C.muzzle ? null : paint });
  if (S.noseDisc) head(new THREE.CylinderGeometry(sn.w * .8, sn.w * .8, .03, 10), { pos: [0, sc[1], sc[2] + sn.l * .95], rot: [HPI, 0, 0], color: C.nose || 0x6d4a44 });
  else head(sph(7, 5), { pos: [0, sc[1] + sn.h * .25, sc[2] + sn.l * .82], scale: [sn.w * .5, sn.h * .35, sn.l * .3], color: C.nose || 0x33302d });
  // eyes
  [-1, 1].forEach((s) => { head(sph(10, 8), { pos: [s * hw * .82, hc[1] + hh * .2, hc[2] + hl * .14], scale: [hw * .24, hh * .24, hw * .17], color: 0x1e1a18 }); head(sph(6, 5), { pos: [s * hw * .86, hc[1] + hh * .27, hc[2] + hl * .25], scale: [hw * .07, hh * .07, hw * .05], color: 0xffffff }); });
  // ears
  const E = S.ears, ey = hc[1] + hh * .6, ez = hc[2] - hl * .12;
  [-1, 1].forEach((s) => {
    if (E.type === "up") head(sph(6, 5), { pos: [s * hw * .8, ey + E.len * .4, ez], scale: [E.w, E.len * .6, E.w * .45], rot: [-.25, 0, s * -.45], color: C.ears || C.head, paint });
    else if (E.type === "side") head(sph(6, 5), { pos: [s * (hw + E.len * .45), ey - hh * .25, ez], scale: [E.len * .55, E.w * .55, E.w * .35], rot: [.1, 0, s * .18], color: C.ears || C.head, paint });
    else if (E.type === "long") head(sph(6, 5), { pos: [s * hw * .7, ey + E.len * .5, ez - hl * .1], scale: [E.w, E.len * .6, E.w * .4], rot: [-.15, 0, s * -.22], color: C.ears || C.head, paint });
    else head(sph(6, 5), { pos: [s * hw * .95, ey - hh * .15, ez + hl * .2], scale: [E.w * .5, E.len * .55, E.w * .35], rot: [.55, 0, s * .35], color: C.ears || C.head, paint }); // floppy, forward
  });
  // horns
  if (S.horns) { const h = S.horns; [-1, 1].forEach((s) => { const a = [s * hw * .55, hc[1] + hh * .75, hc[2] - hl * .05], b = [s * (hw * .55 + h.spread), a[1] + h.up, a[2] - h.back]; R.bar(a, b, h.r, h.r * .35, C.horn || 0xd9cfb5, { part: PART.head, pivot: n0, seg: 6 }); }); }
  if (S.beard) head(new THREE.ConeGeometry(hw * .35, hh * .9, 6), { pos: [0, sc[1] - sn.h * .9, sc[2] - sn.l * .5], rot: [Math.PI, 0, 0], color: C.tuft || C.head });
  if (S.topknot) head(sph(7, 5), { pos: [0, hc[1] + hh * .9, hc[2] - hl * .05], scale: [hw * .9, hh * .45, hl * .45], color: C.tuft || C.head });
  // legs: FL FR BL BR, pivot at the hip, hoof at the ground
  const lr = S.legR, lx = br * bw * .62, lzF = bl / 2 - br * .15, lzB = -bl / 2 + br * .2, hipY = by - br * .35, hoofH = lr * 1.6;
  [[-lx, lzF, PART.FL], [lx, lzF, PART.FR], [-lx, lzB, PART.BL], [lx, lzB, PART.BR]].forEach(([x, z, part]) => {
    const piv = [x, hipY, z];
    R.bar([x, hipY + br * .25, z], [x, hoofH * .9, z], lr * 1.7, lr * 1.35, C.legs || C.body, { part, pivot: piv, paint: C.legs ? null : paint, seg: 10 });
    R.ell(lr * 1.5, lr * 1.0, lr * 1.6, C.hoof || 0x3a302a, { part, pivot: piv, pos: [x, lr * .85, z + lr * .15], seg: 10, rings: 7 });

  });
  // tail
  const T = S.tail, t0 = [0, by + br * .55, -bl / 2 - br * .35], t1 = [0, t0[1] - T.down, t0[2] - T.back];
  if (T.curl) R.add(new THREE.TorusGeometry(T.len * .35, T.len * .12, 5, 9, 4.8), C.body, { part: PART.tail, pivot: t0, pos: [0, t0[1] - T.len * .2, t0[2] - T.len * .15], rot: [0, HPI, .6] });
  else if (T.up) R.bar(t0, [0, t0[1] + T.len * .8, t0[2] - T.len * .35], T.r, T.r * .5, C.body, { part: PART.tail, pivot: t0, paint, seg: 6 });
  else { R.bar(t0, t1, T.r, T.r * .7, C.body, { part: PART.tail, pivot: t0, paint, seg: 6 }); if (T.tuft) R.ell(T.r * 2.2, T.tuft, T.r * 2.2, C.tuft || 0x2a2320, { part: PART.tail, pivot: t0, pos: [0, t1[1] - T.tuft * .5, t1[2]] }); }
  if (S.extras) S.extras(R, C, { by, bl, br, bw, hc, sc, n0, n1, hl, hw, hh, lx, hipY }, r);
  return R.build();
}

/* ---------- birds ---------- */
function bird(S, r, vi) {
  const R = new Rig(), C = S.colors(r, vi), { L, H } = S, bl = L * .55, bh = L * .33 * (S.plump || 1), bwid = L * .3 * (S.plump || 1), by = H - bh * .55, tilt = S.tilt ?? .35;
  const paint = C.speckle ? (x, y, z, c) => c.clone().lerp(C.speckle, .18 + .22 * Math.abs(Math.sin(x * 37 + y * 23) * Math.sin(z * 41 - y * 17))) : null; // fine mottling, not vertex-sized blotches
  R.ell(bwid * 1.08, bh * 1.05, bl, C.body, { pos: [0, by, 0], rot: [-tilt, 0, 0], paint, seg: 16, rings: 12 });
  [-1, 1].forEach((s) => R.ell(bwid * .38, bh * .58, bl * .8, C.wing || C.body, { pos: [s * bwid * .82, by + bh * .1, -bl * .05], rot: [-tilt * .8, 0, s * .12], paint, seg: 12, rings: 8 }));
  // tail: a few flattened feathers fanned up and back (turkeys carry a full fan)
  const t0 = [0, by + bh * .35, -bl * .85];
  if (S.fan) { for (let i = 0; i < 7; i++) { const a = -.9 + i * .3; R.add(new THREE.BoxGeometry(L * .12, L * .55, .008), C.tail || C.body, { part: PART.tail, pivot: t0, pos: [Math.sin(a) * L * .2, t0[1] + Math.cos(a) * L * .26 + L * .04, t0[2] - .04], rot: [-.5, 0, -a] }); } }
  else for (let i = -1; i <= 1; i++) R.add(new THREE.BoxGeometry(L * .07, L * (S.tailLen || .3), .01), C.tail || C.body, { part: PART.tail, pivot: t0, pos: [i * L * .05, t0[1] + L * .1, t0[2] - L * .08], rot: [-.85 - (S.tailUp || 0), 0, i * .35] });
  // neck + head, pivot at the front of the body
  const n0 = [0, by + bh * .45, bl * .55], up = S.neck.up, nl = S.neck.len, n1 = [0, n0[1] + Math.sin(up) * nl, n0[2] + Math.cos(up) * nl];
  const head = (g, o) => R.add(g, o.color || C.head || C.body, { ...o, part: PART.head, pivot: n0 });
  R.bar(n0, n1, S.neck.r, S.neck.r * .85, C.neck || C.body, { part: PART.head, pivot: n0, paint, seg: 8 });
  const hr = S.head.r * 1.25, hc = [0, n1[1] + hr * .3, n1[2] + hr * .2];
  head(sph(14, 10), { pos: hc, scale: [hr, hr * .95, hr * 1.1], paint });
  head(new THREE.ConeGeometry(hr * .38, S.beak.len, 6), { pos: [0, hc[1] - hr * .1, hc[2] + hr * .95 + S.beak.len * .4], rot: [HPI, 0, 0], color: C.beak, scale: [1, 1, S.beak.flat || 1] });
  [-1, 1].forEach((s) => head(sph(8, 6), { pos: [s * hr * .8, hc[1] + hr * .2, hc[2] + hr * .4], scale: [hr * .22, hr * .22, hr * .17], color: 0x1e1a18 }));
  if (S.comb) head(new THREE.BoxGeometry(hr * .18, hr * .7, hr * 1.1), { pos: [0, hc[1] + hr * .95, hc[2] - hr * .05], rot: [.2, 0, 0], color: 0xd6362e });
  if (S.wattle) head(sph(6, 5), { pos: [0, hc[1] - hr * .75, hc[2] + hr * .55], scale: [hr * .32, hr * .5, hr * .3], color: 0xd6362e });
  if (S.snood) head(sph(6, 5), { pos: [0, hc[1] - hr * .4, hc[2] + hr * 1.1], scale: [hr * .18, hr * .55, hr * .18], color: 0xc8302a });
  if (S.plume) head(sph(6, 5), { pos: [0, hc[1] + hr * 1.2, hc[2] + hr * .1], scale: [hr * .12, hr * .45, hr * .12], rot: [.4, 0, 0], color: 0x2b2420 });
  if (S.helmet) head(new THREE.ConeGeometry(hr * .35, hr * .7, 6), { pos: [0, hc[1] + hr * 1.05, hc[2] - hr * .1], color: 0xc98b3a });
  // legs: thin, with a flat foot, pivot at the belly
  const lr = L * .025, lx = bwid * .42, hipY = by - bh * .5;
  [[-lx, PART.FL], [lx, PART.FR]].forEach(([x, part]) => {
    const piv = [x, hipY + bh * .2, L * .05];
    R.bar([x, hipY + bh * .25, L * .05], [x, 0.01, L * .02], lr * 1.3, lr, C.legs, { part, pivot: piv, seg: 5 });
    R.box(lr * 4, lr * 1.2, L * .22, C.legs, { part, pivot: piv, pos: [x, lr * .6, L * .1] });
  });
  return R.build();
}

/* ---------- rabbit ---------- */
function rabbit(S, r, vi) {
  const R = new Rig(), C = S.colors(r, vi), L = S.L, by = L * .27;
  R.ell(L * .3, L * .32, L * .48, C.body, { pos: [0, by, -L * .05], seg: 16, rings: 12 });
  [-1, 1].forEach((s) => R.ell(L * .15, L * .21, L * .25, C.body, { pos: [s * L * .2, by - L * .05, -L * .25], seg: 12, rings: 9 })); // haunches
  const n0 = [0, by + L * .1, L * .32], hc = [0, n0[1] + L * .12, n0[2] + L * .08];
  const head = (g, o) => R.add(g, o.color || C.body, { ...o, part: PART.head, pivot: n0 });
  head(sph(14, 10), { pos: hc, scale: [L * .2, L * .2, L * .23] });
  head(sph(6, 4), { pos: [0, hc[1] - L * .02, hc[2] + L * .2], scale: [L * .035, L * .03, L * .03], color: 0x6a4a48 });
  [-1, 1].forEach((s) => { head(sph(6, 4), { pos: [s * L * .13, hc[1] + L * .05, hc[2] + L * .08], scale: [L * .03, L * .03, L * .025], color: 0x1e1a18 }); head(sph(6, 5), { pos: [s * L * .07, hc[1] + L * .3, hc[2] - L * .06], scale: [L * .05, L * .2, L * .025], rot: [-.25, 0, s * -.15], color: C.ears || C.body }); });
  [-1, 1].forEach((s) => R.ell(L * .06, L * .05, L * .14, C.body, { pos: [s * L * .13, L * .05, L * .12] }));
  R.ell(L * .07, L * .07, L * .07, 0xf6f2ea, { part: PART.tail, pivot: [0, by, -L * .5], pos: [0, by + L * .02, -L * .52] });
  return R.build();
}

/* ---------- species ---------- */
const pick = (v, list) => list[v % list.length]; // colour variant → palette entry, so a herd shows every coat
const SPECIES = {
  Cow: { graze: 1.0, kind: KIND.grazer, L: 2.3, H: 1.42, br: .44, bw: 1.0, bodyFrac: .62, chest: true, belly: true, legR: .075, walk: .45, seed: 1,
    neck: { len: .55, up: 18 * DEG, r0: .27, r1: .2 }, head: { l: .62, w: .21, h: .24, pitch: .2 }, snout: { w: .17, h: .14, l: .2, drop: .07 }, noseDisc: true,
    ears: { type: "side", len: .24, w: .12 }, horns: { spread: .16, up: .16, back: .05, r: .035 }, tail: { len: .9, down: .8, back: .12, r: .028, tuft: .14 },
    colors: (r, vi) => { const v = pick(vi, [[0xf3f0e7, 0x2a2521], [0xf3f0e7, 0x6f3d24], [0xa8663d, null], [0x3a2f28, null]]); return { body: col(v[0]), patch: v[1] == null ? null : col(v[1]), head: col(v[0]), muzzle: col(0xe7c6bd), hoof: col(0x3a302a), tuft: col(v[1] == null ? 0x3a2f28 : v[1]), horn: col(0xe6dcc3) }; },
    extras: (R, C, D) => { R.ell(D.br * .42, D.br * .32, D.br * .42, 0xefc2ba, { pos: [0, D.by - D.br * .82, -D.bl * .28] }); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => R.cyl(.018, .022, .07, 0xe7b3aa, { pos: [a * D.br * .18, D.by - D.br * 1.08, -D.bl * .28 + b * D.br * .18], seg: 5 })); } },
  Horse: { graze: 1.65, kind: KIND.grazer, L: 2.4, H: 1.58, br: .38, bw: .9, bodyFrac: .6, chest: true, legR: .06, walk: .55, seed: 2, mane: .12,
    neck: { len: .8, up: 52 * DEG, r0: .26, r1: .17 }, head: { l: .6, w: .17, h: .22, pitch: .55 }, snout: { w: .13, h: .12, l: .2, drop: .18 },
    ears: { type: "up", len: .16, w: .05 }, tail: { len: 1.0, down: .95, back: .18, r: .07, tuft: .5 },
    colors: (r, vi) => { const v = pick(vi, [[0x7a4a2c, 0x2e2119], [0x3a2c25, 0x1c1614], [0xc9a978, 0x2e2119], [0xe9e4dc, 0xd0c8bb], [0x1f1b19, 0x0e0c0b]]); return { body: col(v[0]), head: col(v[0]), muzzle: col(v[0]).multiplyScalar(.8), hoof: col(0x2a2220), tuft: col(v[1]), mane: col(v[1]) }; } },
  Donkey: { graze: 1.45, kind: KIND.grazer, L: 1.9, H: 1.15, br: .32, bw: .95, bodyFrac: .6, legR: .05, walk: .4, seed: 3, mane: .07,
    neck: { len: .55, up: 42 * DEG, r0: .2, r1: .15 }, head: { l: .5, w: .15, h: .19, pitch: .5 }, snout: { w: .13, h: .11, l: .16, drop: .14 },
    ears: { type: "long", len: .34, w: .07 }, tail: { len: .7, down: .62, back: .1, r: .03, tuft: .16 },
    colors: (r, vi) => { const v = pick(vi, [0x8d8781, 0x6e665e, 0xa39a90]); return { body: col(v), head: col(v), muzzle: col(0xe5ded3), hoof: col(0x2a2220), tuft: col(0x3a332e), mane: col(0x3a332e), ears: col(v) }; } },
  Alpaca: { graze: 2.0, kind: KIND.grazer, L: 1.6, H: 1.0, br: .34, bw: .95, bodyFrac: .55, belly: true, legR: .045, walk: .4, seed: 4, topknot: true,
    neck: { len: .75, up: 78 * DEG, r0: .17, r1: .12 }, head: { l: .32, w: .12, h: .15, pitch: .3 }, snout: { w: .09, h: .08, l: .1, drop: .06 },
    ears: { type: "up", len: .14, w: .045 }, tail: { len: .2, down: .05, back: .18, r: .05, up: false },
    colors: (r, vi) => { const v = pick(vi, [0xf1e8d6, 0xd9b98f, 0x6d4a33, 0xc7c0b6]); return { body: col(v), head: col(v), muzzle: col(v).multiplyScalar(.85), hoof: col(0x3a302a), tuft: col(v) }; },
    extras: (R, C, D, r) => { for (let i = 0; i < 9; i++) R.ell(D.br * .34, D.br * .3, D.br * .34, C.body, { pos: [(r() - .5) * D.br * 1.4, D.by + D.br * (.3 + r() * .5), (r() - .5) * D.bl * .95] }); } },
  Pig: { graze: .45, kind: KIND.grazer, L: 1.35, H: .72, br: .3, bw: 1.05, bodyFrac: .62, chest: true, belly: true, legR: .04, walk: .35, seed: 5,
    neck: { len: .16, up: 5 * DEG, r0: .24, r1: .19 }, head: { l: .36, w: .17, h: .19, pitch: .25 }, snout: { w: .1, h: .09, l: .14, drop: .04 }, noseDisc: true,
    ears: { type: "floppy", len: .16, w: .1 }, tail: { len: .18, curl: true },
    colors: (r, vi) => { const v = pick(vi, [0xf0b8a8, 0xe9a998, 0x4a3a35, 0xd9c2b0]); return { body: col(v), head: col(v), nose: col(v).multiplyScalar(.85), hoof: col(0x5a4a44) }; } },
  Goat: { graze: 1.1, kind: KIND.grazer, L: 1.15, H: .74, br: .19, bw: .9, bodyFrac: .58, legR: .028, walk: .38, seed: 6, beard: true,
    neck: { len: .36, up: 42 * DEG, r0: .11, r1: .085 }, head: { l: .3, w: .1, h: .13, pitch: .35 }, snout: { w: .07, h: .07, l: .1, drop: .06 },
    ears: { type: "side", len: .16, w: .06 }, horns: { spread: .04, up: .14, back: .14, r: .022 }, tail: { len: .14, r: .02, up: true },
    colors: (r, vi) => { const v = pick(vi, [[0xf3efe6, 0xa86b3c], [0xefe6d4, 0x3a2f28], [0x8a5a3a, 0x3a2a20], [0x5a4638, null]]); return { body: col(v[0]), patch: v[1] == null ? null : col(v[1]), head: col(v[0]), hoof: col(0x3a302a), tuft: col(v[1] == null ? 0x8a7a6a : v[1]), horn: col(0x9a8c76) }; }, patchCut: .5 },
  Sheep: { graze: .85, kind: KIND.grazer, L: 1.25, H: .78, br: .28, bw: 1.05, bodyFrac: .55, legR: .03, walk: .32, seed: 7,
    neck: { len: .22, up: 20 * DEG, r0: .12, r1: .09 }, head: { l: .3, w: .1, h: .13, pitch: .3 }, snout: { w: .07, h: .07, l: .1, drop: .05 },
    ears: { type: "side", len: .12, w: .06 }, tail: { len: .12, down: .12, back: .03, r: .03 },
    colors: (r, vi) => { const v = pick(vi, [[0xf4efe3, 0x2b2622], [0xf4efe3, 0xf0e8da], [0xe9e2d3, 0x5a4a3c], [0xd8d0c0, 0x2b2622]]); return { body: col(v[0]), head: col(v[1]), legs: col(v[1]), ears: col(v[1]), hoof: col(0x2a2220) }; },
    extras: (R, C, D, r) => { for (let i = 0; i < 14; i++) R.ell(D.br * .36, D.br * .32, D.br * .38, C.body, { pos: [(r() - .5) * D.br * 1.9, D.by + D.br * (.05 + r() * .55), (r() - .5) * D.bl * 1.1], seg: 7, rings: 5 }); R.ell(D.hw * 1.15, D.hh * .5, D.hl * .35, C.body, { part: PART.head, pivot: D.n0, pos: [0, D.hc[1] + D.hh * .75, D.hc[2] - D.hl * .1] }); } },
  Rabbit: { kind: KIND.hopper, L: .55, walk: .3, hop: true, colors: (r, vi) => { const v = pick(vi, [0xb9a08a, 0x6f5a49, 0xe8e2d8, 0x8a8078]); return { body: col(v), ears: col(v).multiplyScalar(.9) }; } },
  Chicken: { graze: 1.9, kind: KIND.bird, L: .5, H: .38, walk: .25, comb: true, wattle: true, tilt: .3, tailUp: .3, neck: { len: .16, up: 65 * DEG, r: .05 }, head: { r: .065 }, beak: { len: .045 },
    colors: (r, vi) => { const v = pick(vi, [[0xb8622c, 0x7a3d1c, 0x2b2420], [0xf0ebe0, 0xe4dccd, 0xf0ebe0], [0x2b2420, 0x1c1815, 0x2b2420], [0xd9a04e, 0xa9702e, 0x3a2e28]]); return { body: col(v[0]), wing: col(v[1]), tail: col(v[2]), head: col(v[0]), neck: col(v[0]), beak: col(0xe3a83a), legs: col(0xd99a3a) }; } },
  Duck: { graze: 1.6, kind: KIND.bird, L: .55, H: .32, walk: .2, tilt: .12, plump: 1.05, tailUp: -.4, neck: { len: .13, up: 70 * DEG, r: .045 }, head: { r: .06 }, beak: { len: .07, flat: .45 },
    colors: (r, vi) => { const v = pick(vi, [[0xf3efe6, 0xf3efe6, 0xf3efe6], [0x8a7a68, 0x6f6152, 0x2f6b3e], [0xf3efe6, 0xe6e0d4, 0xf3efe6]]); return { body: col(v[0]), wing: col(v[1]), head: col(v[2]), neck: col(v[2]), tail: col(v[1]), beak: col(0xe9a33c), legs: col(0xe9a33c) }; } },
  Goose: { graze: 1.7, kind: KIND.bird, L: .78, H: .5, walk: .25, tilt: .1, plump: 1.0, tailUp: -.3, neck: { len: .33, up: 82 * DEG, r: .05 }, head: { r: .07 }, beak: { len: .08, flat: .5 },
    colors: (r, vi) => { const v = pick(vi, [0xf6f2ea, 0xd8d3c6]); return { body: col(v), wing: col(v).multiplyScalar(.94), head: col(v), neck: col(v), tail: col(v), beak: col(0xe8842d), legs: col(0xe8842d) }; } },
  Turkey: { graze: 1.5, kind: KIND.bird, L: .85, H: .6, walk: .25, tilt: .25, plump: 1.15, fan: true, wattle: true, snood: true, neck: { len: .24, up: 70 * DEG, r: .05 }, head: { r: .06 }, beak: { len: .05 },
    colors: () => ({ body: col(0x3d2c22), wing: col(0x5a3f2c), tail: col(0x4a3324), head: col(0x8fa4b5), neck: col(0xb2555a), beak: col(0xe3c07a), legs: col(0xb98a5a) }) },
  Quail: { graze: 1.8, kind: KIND.bird, L: .26, H: .17, walk: .15, tilt: .2, plume: true, tailUp: -.5, neck: { len: .05, up: 60 * DEG, r: .03 }, head: { r: .04 }, beak: { len: .02 },
    colors: (r, vi) => { const v = pick(vi, [0x8a6a48, 0x6f5540]); return { body: col(v), wing: col(v).multiplyScalar(.85), speckle: col(0xe9dcc3), head: col(v), neck: col(v), tail: col(v), beak: col(0x3a302a), legs: col(0xb98a5a) }; } },
  "Guinea Fowl": { graze: 1.8, kind: KIND.bird, L: .55, H: .38, walk: .25, tilt: .2, plump: 1.15, helmet: true, wattle: true, tailUp: -.6, neck: { len: .16, up: 62 * DEG, r: .035 }, head: { r: .045 }, beak: { len: .03 },
    colors: () => ({ body: col(0x4a4c52), wing: col(0x3f4147), speckle: col(0xe8e6e0), head: col(0xd9d4cb), neck: col(0x6f7178), tail: col(0x3f4147), beak: col(0xc98b3a), legs: col(0x8a7a6a) }) },
};

const geoCache = new Map();
function animalGeometry(type, variant) { // one geometry per species and colour variant, reused across the herd
  const key = type + "|" + variant; if (geoCache.has(key)) return geoCache.get(key);
  const S = SPECIES[type] || SPECIES.Sheep, r = rng(variant * 17 + 3);
  const g = S.kind === KIND.bird ? bird(S, r, variant) : S.kind === KIND.hopper ? rabbit(S, r, variant) : quadruped(S, r, variant);
  g.userData.shared = true; geoCache.set(key, g); return g; // shared across world rebuilds
}

/* ---------- shader: pose + motion from the shared clock ---------- */
const GLSL_HEAD = `uniform float uTime; attribute vec4 g3a; attribute vec4 g3b; attribute vec4 g3p; attribute vec4 g3q; attribute float g3y; attribute vec4 g3l1; attribute vec4 g3l2;
mat3 g3rx(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
mat3 g3ry(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
// legs (herd-brain.js): g3l1 = (fromX, fromZ, toX, toZ), g3l2 = (t0, t1, mode, param); g3b = (phase, bodyH, heading, previous heading)
// modes: 0 stand, 1 graze/peck, 2 walk, 3 lie, 4 swim, 5 scatter, 6 inside (hidden)
void g3pose(out mat3 Rp, out mat3 Rh, out vec3 off, out float vis, out float lie) {
  float part = g3p.x, kind = g3a.w, ph = g3b.x, H = g3b.y;
  float t0 = g3l2.x, t1 = g3l2.y, mode = g3l2.z, param = g3l2.w;
  float u = smoothstep(t0, t1, uTime), ease = smoothstep(t0, t0 + .6, uTime);
  vec2 pos = mix(g3l1.xy, g3l1.zw, u);
  float moving = (mode == 2. || mode == 5.) ? step(t0, uTime) * (1. - step(t1, uTime)) : 0.;
  float speedMul = mode == 5. ? 2.5 : 1.;
  float gt = uTime * g3q.x * speedMul + ph * 6.2832;
  float legOff = (part == 3. || part == 6.) ? 0. : 3.1416;
  float swim = mode == 4. ? 1. : 0.;
  float swing = sin(gt + legOff) * g3q.y * moving * (1. - swim);
  float bob = abs(sin(gt)) * g3q.w * moving;
  float down = mode == 1. ? ease : 0.;
  float nib = down * sin(uTime * 5.5 + ph * 9.) * .05;
  float peck = down * max(0., sin(uTime * 4.5 + ph * 7.)) * g3q.z;
  float strut = moving * sin(gt) * .12;
  float headUp = mode == 5. ? -.35 : 0.;
  lie = mode == 3. ? ease : 0.;
  float chew = lie * sin(uTime * 3. + ph * 4.) * .03;
  float headA = kind == 1. ? peck + strut + headUp : kind == 2. ? sin(uTime * 1.3 + ph * 6.) * .08 : down * g3q.z + nib + chew;
  float tailA = sin(uTime * 1.4 + ph * 6.2832) * .32 + sin(uTime * 3.3 + ph * 4.) * .1 + (mode == 5. ? .5 : 0.);
  float a = part == 1. ? headA : (part >= 3. && part <= 6.) ? (kind == 2. ? 0. : swing) : 0.;
  Rp = part == 7. ? g3ry(tailA) : g3rx(a);
  float turn = atan(sin(g3b.z - g3b.w), cos(g3b.z - g3b.w));
  Rh = g3ry(g3b.w + turn * smoothstep(t0, t0 + .45, uTime));
  float y = g3y + bob - lie * .35 * H + swim * (param - g3y + sin(uTime * 1.7 + ph * 6.) * .02);
  off = vec3(pos.x, y, pos.y);
  vis = mode == 6. ? 0. : 1.;
}`;
export function animalShader(sh, depth) {
  Object.assign(sh.uniforms, { uTime: sh.uniforms.uTime || { value: 0 } });
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\n" + GLSL_HEAD)
    .replace("#include <begin_vertex>", `#include <begin_vertex>
{ mat3 Rp, Rh; vec3 off; float vis, lie; g3pose(Rp, Rh, off, vis, lie);
  vec3 p0 = (g3p.x >= 3. && g3p.x <= 6.) ? g3p.yzw + (position - g3p.yzw) * mix(1., .25, lie) : position;
  vec3 lp = g3p.yzw + Rp * (p0 - g3p.yzw); transformed = mix(off, Rh * lp + off, vis); }`);
  if (!depth) sh.vertexShader = sh.vertexShader.replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
{ mat3 Rp, Rh; vec3 off; float vis, lie; g3pose(Rp, Rh, off, vis, lie); objectNormal = Rh * (Rp * objectNormal); }`);
}
let mats = null;
export function animalMaterials(TIME) {
  if (mats) return mats;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true }); // matte coats: Lambert (see toy.js flat)
  mat.onBeforeCompile = (sh) => { sh.uniforms.uTime = TIME; animalShader(sh, false); }; mat.customProgramCacheKey = () => "g3animal";
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = (sh) => { sh.uniforms.uTime = TIME; animalShader(sh, true); }; depth.customProgramCacheKey = () => "g3animalDepth";
  mats = { mat, depth }; return mats;
}

/* ---------- the herd: one mesh for every animal on the farm ----------
   items: [{ type, x, z, y?, heading, arena: { x0, x1, z0, z1 } | null, seed }] in world metres (y: a raised floor).
   Each animal gets a colour variant and a first leg (standing at its spot); herd-brain.js then
   decides the legs (wander, graze, lie, swim, scatter, roost) and applyLegs writes them (or stands
   still when there is no room), a gait speed from its size and a random phase. */
/** what the brain needs to know about a species */
export function speciesInfo(type) {
  const S = SPECIES[type] || SPECIES.Sheep;
  return { kind: S.kind === KIND.bird ? "bird" : S.kind === KIND.hopper ? "hopper" : "grazer", L: S.L, H: S.H || S.L * .6, walk: S.walk };
}
/** items: [{ type, x, z, y?, heading, seed, variant? }]; returns { mesh, ranges: [{ idx, start, count }], l1, l2, b } — null without animals */
export function buildHerd(items, TIME) {
  if (!items.length) return null;
  const { mat, depth } = animalMaterials(TIME), geos = [], ranges = []; let start = 0;
  items.forEach((it, idx) => {
    const S = SPECIES[it.type] || SPECIES.Sheep, r = rng(it.seed * 31 + 7), variant = it.variant ?? Math.floor(r() * 4);
    const g = animalGeometry(it.type, variant).clone(), n = g.attributes.position.count;
    const gait = 6.2832 * S.walk / (S.L * (S.kind === KIND.bird ? .32 : .5)), stride = S.kind === KIND.bird ? .45 : .32, graze = S.graze ?? 0, bobH = S.kind === KIND.hopper ? S.L * .22 : S.L * .012;
    const a = new Float32Array(n * 4), b = new Float32Array(n * 4), q = new Float32Array(n * 4), l1 = new Float32Array(n * 4), l2 = new Float32Array(n * 4), ph = r();
    for (let i = 0; i < n; i++) { a.set([it.x, it.z, it.heading, S.kind], i * 4); b.set([ph, S.H || S.L * .6, it.heading, it.heading], i * 4); q.set([gait, stride, graze, bobH], i * 4); l1.set([it.x, it.z, it.x, it.z], i * 4); l2.set([0, 1, 0, 0], i * 4); }
    g.setAttribute("g3a", new THREE.BufferAttribute(a, 4)); g.setAttribute("g3b", new THREE.BufferAttribute(b, 4)); g.setAttribute("g3q", new THREE.BufferAttribute(q, 4));
    g.setAttribute("g3l1", new THREE.BufferAttribute(l1, 4)); g.setAttribute("g3l2", new THREE.BufferAttribute(l2, 4));
    g.setAttribute("g3y", new THREE.BufferAttribute(new Float32Array(n).fill(it.y || 0), 1));
    ranges.push({ idx, start, count: n }); start += n; geos.push(g);
  });
  const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(merged, mat);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.customDepthMaterial = depth; mesh.frustumCulled = false; mesh.name = "herd";
  return { mesh, ranges, l1: merged.attributes.g3l1, l2: merged.attributes.g3l2, b: merged.attributes.g3b };
}
/** writes the brain's new legs into the herd's vertex ranges (only those ranges are re-uploaded) */
export function applyLegs(herd, legs) {
  if (!herd || !legs.length) return;
  const { l1, l2, b, ranges } = herd;
  legs.forEach((leg) => {
    const rg = ranges[leg.idx]; if (!rg) return;
    const A1 = l1.array, A2 = l2.array, B = b.array;
    const first = rg.start * 4, t = Math.max(0, Math.min(1, (leg.t0 - A2[first]) / .45)), eased = t * t * (3 - 2 * t);
    const delta = Math.atan2(Math.sin(B[first + 2] - B[first + 3]), Math.cos(B[first + 2] - B[first + 3]));
    const previousHeading = B[first + 3] + delta * eased;
    for (let i = rg.start, e = rg.start + rg.count; i < e; i++) { const k = i * 4; A1[k] = leg.from[0]; A1[k + 1] = leg.from[1]; A1[k + 2] = leg.to[0]; A1[k + 3] = leg.to[1]; A2[k] = leg.t0; A2[k + 1] = leg.t1; A2[k + 2] = leg.mode; A2[k + 3] = leg.param; B[k + 2] = leg.heading; B[k + 3] = previousHeading; }
    l1.addUpdateRange(rg.start * 4, rg.count * 4); l2.addUpdateRange(rg.start * 4, rg.count * 4); b.addUpdateRange(rg.start * 4, rg.count * 4);
  });
  l1.needsUpdate = true; l2.needsUpdate = true; b.needsUpdate = true;
}
