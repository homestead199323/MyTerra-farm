/* ═══════════════════════════════════════════
   CROPS 3D — every crop on the map is a small rounded plant model built from geometry
   (no cut-out artwork): eleven plant families cover all 70 crops, each one shaped by its
   growth stage — a sprout, a seedling, a growing plant, a maturing plant with green
   fruit, and the harvest-window plant carrying ripe fruit in full colour. Models are
   vertex-coloured and built in a unit footprint (1 = the plant's spread), so one
   geometry per crop and stage is instanced across the farm and scaled by the real
   spacing; leaves sway in the vertex shader from the shared clock.
   MARKER: GROVE_CROPS_3D_V1
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { Parts, clamp01, WIND } from "./toy";

const HPI = Math.PI / 2;
function rng(seed) { let t = (Math.floor(seed * 1000003) ^ 0x5bd1e995) >>> 0; return () => { t = (t + 0x6d2b79f5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
const WHITE = new THREE.Color(0xffffff), GREEN_FRUIT = new THREE.Color(0x8cc47a);
// lighter toward the top of the plant: a cheap sky-light gradient that reads as soft volume
const lit = (h, amt = .22) => (x, y, z, c) => c.clone().lerp(WHITE, clamp01(y / Math.max(.05, h)) * amt);
const GROW = [0, 0, .42, .72, 1, 1]; // size by stage: seedling, growing, maturing, harvest window

import { cropFamily } from "./crop-families";
export { cropFamily };

/* ---------- families (unit footprint: x/z within ±.5, y up) ---------- */
// Keep each family’s random layout stable across stages so growth feels continuous.
function leaves(P, o, grow, { n = o.n || 9, d = .3, up = o.up ?? .6, lx = .21, ly = .08, lz = .38, y0 = .12, tall = o.tall || 1, r } = {}) {
  const rr = r || rng(n * 7 + 1), col = new THREE.Color(o.leaf), tip = o.tip ? new THREE.Color(o.tip) : col.clone().lerp(WHITE, .3), H = (lz + y0) * grow * tall;
  n = Math.round(n * (P.detail < .7 ? .7 : 1)); // lighter models carry fewer leaves
  const paint = (x, y, z, c) => c.clone().lerp(tip, clamp01(y / Math.max(.05, H)) * .9);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rr() * .5, inner = i % 3 === 0, dd = (inner ? d * .45 : d) * grow, pitch = -(up + (inner ? .5 : 0) + (rr() - .5) * .25);
    const s = grow * (inner ? .7 : 1) * (.85 + rr() * .3);
    P.sphere([lx * s, ly * s, lz * s * tall], col, { pos: [Math.sin(a) * dd, (y0 + (inner ? .06 : 0)) * grow * tall, Math.cos(a) * dd], rot: [pitch, a, 0], paint, seg: 9, rings: 6 });
    if (o.stem) P.stem([Math.sin(a) * dd * .3, 0, Math.cos(a) * dd * .3], [Math.sin(a) * dd * 1.1, (y0 + lz * .5) * grow * tall, Math.cos(a) * dd * 1.1], .022 * grow, .012 * grow, o.stem, { seg: 6 });
  }
  P.sphere(.1 * grow, col.clone().lerp(tip, .5), { pos: [0, .08 * grow, 0], seg: 9, rings: 6 });
}
function leafy(P, o, stage) {
  const grow = GROW[stage];
  leaves(P, o, grow, o.rosette ? { n: stage === 2 ? 3 : stage === 3 ? 7 : 10, lx: .23, ly: .045, lz: .34 } : {});
  if (o.rosette && stage >= 3) leaves(P, { ...o, leaf: o.tip, up: 1.1 }, grow * (stage === 3 ? .42 : .65), { n: 5, d: .12, lx: .18, ly: .045, lz: .27, y0: .2 });
}
function head(P, o, stage) {
  const grow = GROW[stage], rr = rng(27), head = new THREE.Color(o.head);
  leaves(P, { leaf: o.leaf, n: 7, up: .35 }, grow, { d: .33, lx: .2, ly: .06, lz: .32, y0: .04, r: rr });
  if (stage < 3) return;
  const hs = stage === 3 ? .55 : 1, top = lit(.6, .18);
  if (o.kind === "cabbage") P.sphere(.28 * hs, head, { pos: [0, .26 * hs, 0], paint: top, seg: 14, rings: 10 });
  else if (o.kind === "cauli") { P.sphere([.26 * hs, .2 * hs, .26 * hs], head, { pos: [0, .22 * hs, 0], paint: top, seg: 14, rings: 10 }); for (let i = 0; i < 5; i++) { const a = rr() * 6.28; P.sphere([.13 * hs, .05 * hs, .2 * hs], o.leaf, { pos: [Math.sin(a) * .2 * hs, .3 * hs, Math.cos(a) * .2 * hs], rot: [-.8, a, 0], seg: 8, rings: 5 }); } }
  else if (o.kind === "broccoli") {
    P.caps(.07 * hs, .22 * hs, 0x8fc79a, { pos: [0, .2 * hs, 0] });
    P.sphere([.28 * hs, .2 * hs, .28 * hs], head, { pos: [0, .38 * hs, 0], paint: top, seg: 12, rings: 8 });
    for (let i = 0; i < 9; i++) { const a = rr() * 6.28, b = rr() * 1.2; P.sphere(.08 * hs, head.clone().lerp(WHITE, .18), { pos: [Math.cos(a) * Math.cos(b) * .25 * hs, .38 * hs + Math.sin(b) * .18 * hs, Math.sin(a) * Math.cos(b) * .25 * hs], seg: 8, rings: 6 }); }
  } else { // brussels sprouts: a stem studded with buttons, a tuft of leaves on top
    P.caps(.06 * hs, .9 * hs, 0x7fb784, { pos: [0, .5 * hs, 0] });
    for (let i = 0; i < 14; i++) { const a = i * 2.4, y = .18 * hs + (i / 14) * .75 * hs; P.sphere(.065 * hs, head, { pos: [Math.sin(a) * .09 * hs, y, Math.cos(a) * .09 * hs], seg: 8, rings: 6 }); }
    for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; P.sphere([.1 * hs, .04 * hs, .22 * hs], o.leaf, { pos: [Math.sin(a) * .14 * hs, 1.0 * hs, Math.cos(a) * .14 * hs], rot: [-.7, a, 0], seg: 8, rings: 5 }); }
  }
}
function root(P, o, stage) {
  const grow = GROW[stage], rr = rng(22), n = o.small ? (stage === 2 ? 3 : stage === 3 ? 5 : 7) : o.feathery ? 13 : 9, tall = o.tall || 1, col = new THREE.Color(o.leaf), tip = col.clone().lerp(WHITE, .35), H = (o.small ? .5 : .7) * grow * tall;
  const paint = (x, y, z, c) => c.clone().lerp(tip, clamp01(y / H) * .8);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.28 + rr() * .6, t = .18 + rr() * .3, h = H * (.7 + rr() * .4), end = [Math.sin(a) * Math.sin(t) * h, Math.cos(t) * h, Math.cos(a) * Math.sin(t) * h];
    P.stem([Math.sin(a) * .03, 0, Math.cos(a) * .03], end, (o.feathery ? .018 : .03) * grow, .006, o.leaf, { seg: 6, paint });
    if (!o.feathery) P.sphere([(o.small ? .11 : .06) * grow, .025 * grow, (o.small ? .2 : .12) * grow], col, { pos: [end[0] * .85, end[1] * .85, end[2] * .85], rot: [-(1.2 - t), a, 0], paint, seg: 10, rings: 7 });
    if (o.stem) P.stem([Math.sin(a) * .03, 0, Math.cos(a) * .03], [end[0] * .5, end[1] * .5, end[2] * .5], .03 * grow, .02 * grow, o.stem, { seg: 6 });
  }
  if (stage < 4 || !o.root) return;
  // A smaller crown appears as the root matures, then reaches full size at harvest.
  const crown = stage === 4 ? .65 : 1;
  if (o.shape === "cone") P.cyl(.085 * crown, .07 * crown, .05 * crown, o.root, { pos: [0, .025 * crown, 0], seg: 12 });
  else { const r = (o.small ? .115 : .12) * crown; P.sphere(r, o.root, { pos: [0, r * .55, 0], seg: 14, rings: 10, paint: o.cap ? (x, y, z, c) => (y > r * .6 ? new THREE.Color(o.cap) : c) : null }); }
}
function allium(P, o, stage) {
  const grow = GROW[stage], rr = rng(58), col = new THREE.Color(o.leaf), tip = col.clone().lerp(WHITE, .3), H = (o.leek ? .6 : .5) * grow;
  const paint = (x, y, z, c) => c.clone().lerp(tip, clamp01(y / H) * .7);
  if (o.leek) {
    P.cyl(.055 * grow, .07 * grow, .28 * grow, o.bulb, { pos: [0, .14 * grow, 0], seg: 12 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28 + rr() * .3; P.sphere([.04 * grow, .015 * grow, .3 * grow], col, { pos: [Math.sin(a) * .08 * grow, .32 * grow, Math.cos(a) * .08 * grow], rot: [-1.1 - rr() * .3, a, 0], paint, seg: 7, rings: 5 }); }
    return;
  }
  for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28 + rr() * .4, t = .1 + rr() * .2, h = H * (.7 + rr() * .4); P.stem([Math.sin(a) * .02, 0, Math.cos(a) * .02], [Math.sin(a) * Math.sin(t) * h, Math.cos(t) * h, Math.cos(a) * Math.sin(t) * h], .028 * grow, .012, col, { seg: 6, paint }); }
  if (stage >= 5) P.sphere([.1, .085, .1], o.bulb, { pos: [0, .04, 0], seg: 12, rings: 8 });
}
function bush(P, o, stage) {
  const grow = GROW[stage], rr = rng(70), H = (o.tall || 1.6) * grow, col = new THREE.Color(o.leaf), paint = lit(H, .2);
  if (o.stake && stage >= 3) P.caps(.025, Math.max(.3, H * 1.05), 0x8f6b4c, { pos: [.05, Math.max(.3, H * 1.05) / 2 + .02, -.05], cap: 2, seg: 7 });
  P.stem([0, 0, 0], [0, H * .8, 0], .04 * grow, .02 * grow, 0x5f8f55, { seg: 7 });
  const blobs = stage >= 4 ? 5 : stage === 3 ? 4 : 2;
  for (let i = 0; i < blobs; i++) {
    const a = i * 2.1 + rr() * .6, y = H * (.22 + (i / blobs) * .62), d = .17 * grow;
    if (o.fruit === 0xe3493a) {
      const end = [Math.sin(a) * .43 * grow, y + .1 * grow, Math.cos(a) * .43 * grow];
      P.stem([0, y, 0], end, .024 * grow, .012 * grow, o.leaf, { seg: 7 });
      for (let k = 0; k < 3; k++) { const t = .4 + k * .3; P.sphere([.12 * grow, .035 * grow, .19 * grow], col, { pos: [end[0] * t, y + .1 * grow * t, end[2] * t], rot: [-.3, a + (k % 2 ? .6 : -.6), 0], paint, seg: 10, rings: 7 }); }
    } else P.sphere([.36 * grow, .27 * grow, .36 * grow], col, { pos: [Math.sin(a) * d, y, Math.cos(a) * d], paint, seg: 12, rings: 8 });
  }
  if (stage < 4) return;
  const fruits = Array.isArray(o.fruit) ? o.fruit : [o.fruit], ripe = stage === 5;
  for (let i = 0; i < o.n; i++) {
    const a = rr() * 6.28, y = H * (.3 + rr() * .55), d = .3 * grow, f = new THREE.Color(fruits[i % fruits.length]), c = ripe ? f : f.clone().lerp(GREEN_FRUIT, .75), s = (ripe ? 1 : .7) * (.85 + rr() * .3) * o.fr * 1.7;
    const p = [Math.sin(a) * d + (rr() - .5) * .08, y, Math.cos(a) * d + (rr() - .5) * .08];
    if (o.flower) { if (ripe) P.sphere(s, 0xfbfbff, { pos: [p[0], H * .95, p[2]], seg: 6, rings: 4 }); }
    else if (o.shape === "egg") P.sphere([s * .85, s * 1.5, s * .85], c, { pos: [p[0], p[1] - s * .6, p[2]], seg: 9, rings: 7 });
    else if (o.shape === "ell") P.sphere([s, s * 1.3, s], c, { pos: p, seg: 9, rings: 7 });
    else if (o.shape === "pod") P.caps(s * .6, s * 2.2, c, { pos: p, rot: [.4, a, 0], cap: 2, seg: 6 });
    else P.sphere(s, c, { pos: p, seg: 9, rings: 7 });
  }
}
function vine(P, o, stage) {
  const grow = GROW[stage], rr = rng(96), col = new THREE.Color(o.leaf), paint = lit(.25, .22), n = stage >= 4 ? 7 : stage === 3 ? 5 : 3;
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.28 + rr() * .7, d = (.12 + rr() * .33) * grow; P.stem([0, .02, 0], [Math.sin(a) * d, .05, Math.cos(a) * d], .02 * grow, .012 * grow, 0x6f9f5a, { seg: 5 }); P.sphere([.17 * grow, .07 * grow, .17 * grow], col, { pos: [Math.sin(a) * d, .12 * grow, Math.cos(a) * d], rot: [(rr() - .5) * .4, a, 0], paint, seg: 10, rings: 7 }); }
  if (stage < 4) return;
  const ripe = stage === 5, f = new THREE.Color(o.fruit), c = ripe ? f : f.clone().lerp(GREEN_FRUIT, .6), s = ripe ? 1 : .55, a = rr() * 6.28, px = Math.sin(a) * .22, pz = Math.cos(a) * .22;
  if (o.shape === "pumpkin") {
    const r = .3 * s, ridges = (x, y, z, cc) => cc.clone().multiplyScalar(.9 + .1 * Math.cos(Math.atan2(z - pz, x - px) * 8));
    P.sphere([r, r * .72, r], c, { pos: [px, r * .7, pz], seg: 16, rings: 10, paint: ridges });
    P.cyl(.03 * s, .04 * s, .09 * s, 0x6f9f5a, { pos: [px, r * 1.42, pz], seg: 6 });
  } else if (o.shape === "long") { const ex = Math.sin(a) * .38, ez = Math.cos(a) * .38; P.caps(.075 * s, .4 * s, c, { pos: [ex, .075 * s, ez], rot: [HPI, a + .6, 0], cap: 3, seg: 10, paint: lit(.15, .25) }); }
  else { const r = .22 * s, stripes = o.stripe ? (x, y, z, cc) => (Math.sin(Math.atan2(z - pz, x - px) * 7) > .3 ? new THREE.Color(o.stripe) : cc) : lit(.4, .2); P.sphere([r, r * .85, r], c, { pos: [px, r * .8, pz], seg: 16, rings: 10, paint: stripes }); }
}
function climber(P, o, stage) {
  const grow = GROW[stage], rr = rng(108), col = new THREE.Color(o.leaf), H = (o.poles ? 1.9 : o.low ? .9 : 1.6) * grow, paint = lit(H, .22);
  if (o.poles) { // one cane per plant, the vine spiralling up it
    P.caps(.03, 1.95, 0x8f6b4c, { pos: [0, 1.0, 0], cap: 2, seg: 7 });
    const n = stage >= 4 ? 7 : stage === 3 ? 4 : 2;
    for (let i = 0; i < n; i++) { const t = (i + .5) / n, a = t * 7 + rr(), d = .16 + rr() * .06; P.sphere([.19, .15, .19], col, { pos: [Math.sin(a) * d, .22 + t * (H - .3), Math.cos(a) * d], paint, seg: 10, rings: 7 }); }
    if (stage >= 4) for (let i = 0; i < 9; i++) { const t = rr(), a = t * 7 + rr() * 2, d = .25; P.caps(.02, .1, o.pod, { pos: [Math.sin(a) * d, .3 + t * (H - .5) - .06, Math.cos(a) * d], rot: [.2, a, .3], cap: 2, seg: 5 }); }
    return;
  }
  const stems = o.low ? 5 : 3;
  for (let i = 0; i < stems; i++) {
    const a = (i / stems) * 6.28 + rr() * .5, d = .14, lean = o.low ? .5 : .12, base = [Math.sin(a) * d, 0, Math.cos(a) * d], tip = [Math.sin(a) * (d + lean * H), H, Math.cos(a) * (d + lean * H)];
    P.stem(base, tip, .03 * grow, .015 * grow, 0x6f9f5a, { seg: 6 });
    const k = stage >= 3 ? 4 : 2;
    for (let j = 0; j < k; j++) { const t = (j + 1) / (k + 1), p = [base[0] + (tip[0] - base[0]) * t, tip[1] * t, base[2] + (tip[2] - base[2]) * t]; P.sphere([.12 * grow, .05 * grow, .17 * grow], col, { pos: [p[0] + Math.sin(a + 1.5) * .08, p[1], p[2] + Math.cos(a + 1.5) * .08], rot: [-.5, a + 1.5 + j, 0], paint, seg: 8, rings: 6 }); }
    if (stage >= 4) for (let j = 0; j < 3; j++) { const t = .35 + j * .2, p = [base[0] + (tip[0] - base[0]) * t, tip[1] * t, base[2] + (tip[2] - base[2]) * t]; P.caps(.016, .08, o.pod, { pos: [p[0] + .05, p[1] - .05, p[2]], rot: [.25, a, .5], cap: 2, seg: 5 }); }
  }
}
function stalk(P, o, stage) {
  const grow = GROW[stage], rr = rng(132), col = new THREE.Color(o.leaf);
  if (o.kind === "corn") {
    const H = 3.0 * grow, paint = lit(H, .2);
    P.stem([0, 0, 0], [0, H, 0], .05, .025, 0x7fb86a, { seg: 8 });
    for (let i = 0; i < 6; i++) { const t = .15 + (i / 6) * .65, a = i * 2.1 + rr() * .4; P.sphere([.06, .018, .5 * grow], col, { pos: [Math.sin(a) * .22 * grow, H * t + .08, Math.cos(a) * .22 * grow], rot: [-.55 - rr() * .3, a, 0], paint, seg: 7, rings: 5 }); }
    if (stage >= 4) {
      P.cone(.055, .42, 0xe9dba0, { pos: [0, H + .18, 0], seg: 6 });
      [1.2, 3.5].forEach((a) => { const y = H * .5 + rr() * .3; P.caps(.075, .3, 0x9fd38a, { pos: [Math.sin(a) * .13, y, Math.cos(a) * .13], rot: [.35, a, 0], cap: 2, seg: 8, paint: stage === 5 ? (x, yy, z, c) => (yy > y + .17 ? new THREE.Color(0xf1d04a) : c) : null }); });
    }
    return;
  }
  if (o.kind === "sunflower") {
    const H = 2.3 * grow;
    P.stem([0, 0, 0], [0, H, 0], .05, .035, 0x6a9e58, { seg: 8 });
    for (let i = 0; i < 4; i++) { const t = .25 + i * .18, a = i * 2.4; P.sphere([.17 * grow, .03, .2 * grow], col, { pos: [Math.sin(a) * .18 * grow, H * t, Math.cos(a) * .18 * grow], rot: [-.5, a, 0], seg: 8, rings: 6, paint: lit(H, .15) }); }
    if (stage >= 4) {
      const s = stage === 5 ? 1 : .55, c = stage === 5 ? 0xf6c531 : 0xbccf5a; // bud, then the open flower
      P.sphere([.32 * s, .07, .32 * s], c, { pos: [0, H + .02, .08], rot: [-1.05, 0, 0], seg: 18, rings: 6 });
      P.sphere([.16 * s, .07, .16 * s], 0x6b4a2f, { pos: [0, H + .05, .14], rot: [-1.05, 0, 0], seg: 12, rings: 5 });
    }
    return;
  }
  // grain: a dense tuft of thin stems carrying heads that turn gold as harvest nears
  const H = 1.3 * grow, gold = new THREE.Color(stage === 5 ? 0xe4c45a : stage === 4 ? 0xc9c466 : 0x9ac36a), stemC = stage === 5 ? 0xd5c27a : o.leaf;
  for (let i = 0; i < 11; i++) {
    const a = rr() * 6.28, d = rr() * .28, h = H * (.8 + rr() * .35), lean = .06 + rr() * .1;
    const base = [Math.sin(a) * d, 0, Math.cos(a) * d], top = [base[0] + Math.sin(a) * lean * h, h, base[2] + Math.cos(a) * lean * h];
    P.stem(base, top, .018, .01, stemC, { seg: 5 });
    if (stage >= 3) P.caps(.035, .16, gold, { pos: [top[0], top[1] + .07, top[2]], rot: [lean * 1.5, a, 0], cap: 2, seg: 6 });
  }
}
function herb(P, o, stage) {
  const grow = GROW[stage], rr = rng(164), col = new THREE.Color(o.leaf), n = o.small ? 9 : 7, R = (o.small ? .32 : .26) * grow, H = (o.tall || 1) * .32 * grow, paint = lit(H, .25);
  if (o.spiky) { for (let i = 0; i < 11; i++) { const a = rr() * 6.28, d = rr() * .26 * grow, h = H * (1.2 + rr() * .8); P.stem([Math.sin(a) * d, 0, Math.cos(a) * d], [Math.sin(a) * d * 1.3, h, Math.cos(a) * d * 1.3], .03 * grow, .02 * grow, col, { seg: 6, paint: lit(h, .3) }); } return; }
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.28 + rr() * .5, d = R * (.4 + rr() * .6); P.sphere([.15 * grow, (o.small ? .07 : .12) * grow, .15 * grow], col, { pos: [Math.sin(a) * d, (o.small ? .06 : .11) * grow, Math.cos(a) * d], paint, seg: 10, rings: 7 }); }
  P.sphere([.16 * grow, .13 * grow, .16 * grow], col, { pos: [0, H * .55, 0], paint, seg: 10, rings: 7 });
  if (stage < 4) return;
  if (o.spikes) for (let i = 0; i < 11; i++) { const a = rr() * 6.28, d = rr() * .24, h = .3 + rr() * .3; P.stem([Math.sin(a) * d, .1, Math.cos(a) * d], [Math.sin(a) * d * 1.2, h, Math.cos(a) * d * 1.2], .012, .01, 0x8faa7f, { seg: 4 }); P.caps(.025, .11, o.spikes, { pos: [Math.sin(a) * d * 1.2, h + .06, Math.cos(a) * d * 1.2], cap: 2, seg: 6 }); }
  if (o.dots) for (let i = 0; i < 9; i++) { const a = rr() * 6.28, d = rr() * .25, h = .2 + rr() * .18; P.stem([Math.sin(a) * d, .1, Math.cos(a) * d], [Math.sin(a) * d, h, Math.cos(a) * d], .01, .008, 0x7fb07a, { seg: 4 }); P.sphere([.045, .018, .045], o.dots, { pos: [Math.sin(a) * d, h, Math.cos(a) * d], seg: 8, rings: 4 }); P.sphere(.018, o.centre, { pos: [Math.sin(a) * d, h + .012, Math.cos(a) * d], seg: 6, rings: 4 }); }
}
function berry(P, o, stage) {
  const grow = GROW[stage], rr = rng(178), col = new THREE.Color(o.leaf), ripe = stage === 5, f = new THREE.Color(o.fruit), fc = ripe ? f : f.clone().lerp(GREEN_FRUIT, .7);
  if (o.kind === "low") {
    const clusters = stage === 2 ? 2 : stage === 3 ? 3 : 4;
    for (let i = 0; i < clusters; i++) {
      const a = i * 2.4, x = Math.sin(a) * .25 * grow, z = Math.cos(a) * .25 * grow, y = .16 * grow;
      P.stem([0, .025, 0], [x, y, z], .018 * grow, .01 * grow, o.leaf, { seg: 6 });
      for (let k = -1; k <= 1; k++) { const b = a + k * .85; P.sphere([.09 * grow, .025 * grow, .13 * grow], col, { pos: [x + Math.sin(b) * .07 * grow, y, z + Math.cos(b) * .07 * grow], rot: [-.2, b, 0], seg: 10, rings: 7 }); }
    }
    if (stage >= 3) for (let i = 0; i < 2; i++) { const a = i * 3.4 + .6, x = Math.sin(a) * .48 * grow, z = Math.cos(a) * .48 * grow; P.stem([0, .025, 0], [x, .025, z], .012, .007, o.leaf, { seg: 6 }); P.sphere([.07, .025, .1], col, { pos: [x, .04, z], rot: [0, a, 0], seg: 9, rings: 6 }); }
    if (stage >= 4) for (let i = 0; i < 6; i++) { const a = rr() * 6.28, d = .18 + rr() * .2; P.sphere([.045, .055, .045], fc, { pos: [Math.sin(a) * d, .04, Math.cos(a) * d], seg: 8, rings: 6 }); }
    return;
  }
  if (o.kind === "vine") {
    P.caps(.045, 1.5, 0x8f6b4c, { pos: [0, .8, 0], cap: 2, seg: 7 }); P.rbox(.9, .05, .05, 0x8f6b4c, { pos: [0, 1.45, 0] });
    const n = stage >= 3 ? 4 : 2;
    for (let i = 0; i < n; i++) { const x = -.36 + (i / (n - 1)) * .72; P.sphere([.2 * grow, .16 * grow, .13 * grow], col, { pos: [x, 1.35 + (i % 2) * .12, (i % 2 ? .06 : -.06)], paint: lit(1.6, .2), seg: 10, rings: 7 }); }
    if (stage >= 4) for (let i = 0; i < 4; i++) { const x = -.3 + i * .2; [0, 1, 2].forEach((k) => P.sphere(.045, fc, { pos: [x + (k - 1) * .03, 1.12 - k * .06, .1], seg: 7, rings: 5 })); }
    return;
  }
  const H = 1.5 * grow;
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + rr() * .4, base = [Math.sin(a) * .1, 0, Math.cos(a) * .1], tip = [Math.sin(a) * .3, H, Math.cos(a) * .3];
    P.stem(base, tip, .03, .015, 0x8aa56a, { seg: 6 });
    [.55, .85].forEach((t) => P.sphere([.15 * grow, .1 * grow, .15 * grow], col, { pos: [base[0] + (tip[0] - base[0]) * t, H * t, base[2] + (tip[2] - base[2]) * t], paint: lit(H, .2), seg: 9, rings: 7 }));
    if (stage >= 4) for (let k = 0; k < 4; k++) { const t = .45 + k * .13; P.sphere(.035, fc, { pos: [base[0] + (tip[0] - base[0]) * t + Math.sin(k * 2) * .08, H * t - .04, base[2] + (tip[2] - base[2]) * t + Math.cos(k * 2) * .08], seg: 7, rings: 5 }); }
  }
}
function spears(P, o, stage) {
  const grow = GROW[stage], rr = rng(214), H = 1.1 * grow, tip = new THREE.Color(0x8e6ea8), col = new THREE.Color(0x7cbd6c);
  for (let i = 0; i < 8; i++) { const a = rr() * 6.28, d = rr() * .2, h = H * (.6 + rr() * .5), lean = .08; P.caps(.028, h, col, { pos: [Math.sin(a) * d, h / 2, Math.cos(a) * d], rot: [lean, a, 0], cap: 2, seg: 7, paint: (x, y, z, c) => c.clone().lerp(tip, clamp01((y - h * .8) / (h * .2)) * .8) }); }
  if (stage >= 4) for (let i = 0; i < 5; i++) { const a = rr() * 6.28, d = rr() * .25; P.sphere([.1, .08, .1], 0x9ccf84, { pos: [Math.sin(a) * d, H * 1.05, Math.cos(a) * d], seg: 8, rings: 6 }); }
}
function rhubarb(P, o, stage) {
  const grow = GROW[stage], rr = rng(236), n = stage >= 4 ? 6 : 4;
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.28 + rr() * .4, d = .24 * grow, h = .32 * grow; P.stem([Math.sin(a) * .04, 0, Math.cos(a) * .04], [Math.sin(a) * d, h, Math.cos(a) * d], .04 * grow, .03 * grow, 0xd9453f, { seg: 7 }); P.sphere([.26 * grow, .09 * grow, .3 * grow], 0x5fa352, { pos: [Math.sin(a) * d * 1.2, h + .04, Math.cos(a) * d * 1.2], rot: [-.35, a, 0], paint: lit(h + .2, .2), seg: 11, rings: 8 }); }
}
function artichoke(P, o, stage) {
  const grow = GROW[stage], rr = rng(252);
  leaves(P, { leaf: 0x8fae8c, tip: 0xbacfb6, n: 10, up: .95 }, grow, { d: .3, lx: .09, ly: .03, lz: .42, y0: .06, tall: 1.4, r: rr });
  if (stage < 4) return;
  const s = stage === 5 ? 1 : .6;
  P.caps(.04, .5, 0x8fae8c, { pos: [0, .5, 0], cap: 2, seg: 7 });
  P.sphere([.17 * s, .21 * s, .17 * s], 0x7faa7f, { pos: [0, .85, 0], seg: 12, rings: 9, paint: (x, y, z, c) => c.clone().lerp(new THREE.Color(0xb48fc2), clamp01((y - .95) / .1) * .9) });
}
function sprout(P) { // stage 1 (sown): a seedling pair of leaves at the soil
  P.stem([0, 0, 0], [0, .08, 0], .012, .01, 0x8fd47a, { seg: 5 });
  [-1, 1].forEach((s) => P.sphere([.055, .02, .035], 0x9ddc88, { pos: [s * .045, .085, 0], rot: [0, 0, s * .5], seg: 7, rings: 5 }));
}
const BUILD = { leafy, head, root, allium, bush, vine, climber, stalk, herb, berry, spears, rhubarb, artichoke };

/* ---------- geometry cache: one buffer per crop family entry and stage ---------- */
const cache = new Map();
export function cropGeometry(name, stage, lod = 0) {
  const st = Math.max(1, Math.min(5, stage)), fam = cropFamily(name), key = cropKey(name, st, lod);
  if (cache.has(key)) return cache.get(key);
  const P = new Parts(); P.detail = lod === 2 ? .5 : lod === 1 ? .66 : 1; // level of detail: a big farm gets lighter plant models
  if (st === 1) sprout(P); else BUILD[fam.family](P, fam.o, st);
  const g = P.build(); g.userData.shared = true; cache.set(key, g); return g; // shared across world rebuilds
}
export function cropKey(name, stage, lod = 0) { const st = Math.max(1, Math.min(5, stage)); return st === 1 ? `sprout|${lod}` : `${cropFamily(name).idx}|${st}|${lod}`; }
/* the model space is a unit footprint; scale by the plant's real spread in metres */
const SCALE_CAP = { stalk: .55, climber: .55, bush: .7, vine: .95, berry: .7, head: .8, spears: .6, rhubarb: .9, artichoke: .9 };
export function cropScale(size, stage, name = "") { // plants spill a little over their spacing (lush, not sparse), tall crops never balloon with wide spacing
  const cap = SCALE_CAP[cropFamily(name).family] || .8;
  return Math.min(cap, Math.max(.14, size) * 1.3) * (stage === 1 ? 1.25 : 1);
}

/* ---------- material: matte vertex colours, leaves sway from the shared clock ---------- */
let cropMat = null, cropDepth = null;
export function cropMaterials(TIME) {
  if (cropMat) return { mat: cropMat, depth: cropDepth };
  cropMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: 0 });
  cropMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = TIME; sh.uniforms.uWind = WIND;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime; uniform vec3 uWind;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
{ vec3 g3c = instanceMatrix[3].xyz;
  float g3seed = fract(sin(dot(g3c.xz, vec2(12.9898, 78.233))) * 43758.5453);
  float g3ph = dot(g3c.xz, uWind.xy) * .35 - uTime * (1.2 + uWind.z * 1.8);
  float g3gust = .65 + .35 * sin(g3ph);
  float g3flutter = sin(uTime * (2.1 + g3seed) + g3seed * 6.283);
  vec2 g3world = uWind.xy * (.35 + .45 * g3gust) + vec2(-uWind.y, uWind.x) * g3flutter * .12;
  // Convert the shared world wind to the plant's rotated local axes.
  vec2 g3local = vec2(dot(g3world, normalize(instanceMatrix[0].xz)), dot(g3world, normalize(instanceMatrix[2].xz)));
  float g3bend = smoothstep(.02, .65, position.y);
  transformed.xz += g3local * g3bend * .06 * (.5 + uWind.z) * (.8 + .4 * g3seed); }`);
  };
  cropMat.customProgramCacheKey = () => "g3crop-wind-v2";
  cropDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  return { mat: cropMat, depth: cropDepth };
}
/* draws every collected plant: items are { key, name, stage, x, y, z, s, ry } in world metres */
export function buildCrops(g, items, TIME, focusBounds) {
  if (!items.length) return;
  const { mat } = cropMaterials(TIME), byKey = new Map(), lod = items.length > 900 ? 2 : items.length > 350 ? 1 : 0; // the whole farm shares one level of detail
  items.forEach((it) => { const key = cropKey(it.name, it.stage, lod); it.lod = lod; let l = byKey.get(key); if (!l) { l = []; byKey.set(key, l); } l.push(it); });
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler();
  const box = focusBounds ? new THREE.Box3() : null;
  byKey.forEach((list) => {
    const geo = cropGeometry(list[0].name, list[0].stage, list[0].lod || 0), im = new THREE.InstancedMesh(geo, mat, list.length);
    if (focusBounds && !geo.boundingBox) geo.computeBoundingBox();
    list.forEach((it, i) => {
      P.set(it.x, it.y, it.z); E.set(0, it.ry || 0, 0); Q.setFromEuler(E); S.setScalar(it.s); M4.compose(P, Q, S); im.setMatrixAt(i, M4);
      const bounds = focusBounds?.get(it.zoneId);
      if (bounds) bounds.union(box.copy(geo.boundingBox).applyMatrix4(M4));
    });
    // Retain identities so a changed growth stage can animate independently of its neighbours.
    im.userData.cropItems = list.map((it) => ({ key: `${it.name}|${it.x.toFixed(3)}|${it.y.toFixed(3)}|${it.z.toFixed(3)}`, stage: it.stage }));
    im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; g.add(im);
  });
}
