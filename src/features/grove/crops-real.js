/* ═══════════════════════════════════════════
   TRUE-TO-LIFE CROP MODELS ("look C", docs/MAP_STYLE.md §9). Each crop is built the way the plant
   grows: tomatoes up a cane with compound leaves and trusses, peppers forking, salad leaves in a
   rosette, herbs in leaf pairs on their stems. Unit footprint (x / z within about ±.5), y up.
   A crop without an entry here keeps its older model from crops3d.js.
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { PlantKit, SURF, rng, bakeShade } from "./plantkit";

const HPI = Math.PI / 2, GA = 2.39996, G = [0, 0, .42, .72, 1, 1];
const LEAF = [SURF.leaf, .32], SKIN = [SURF.fruit, .92], STEM = [SURF.plain, .2];
const clamp01 = (v) => Math.max(0, Math.min(1, v)), smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const dir = (yaw, tilt) => [Math.sin(yaw) * Math.sin(tilt), Math.cos(tilt), Math.cos(yaw) * Math.sin(tilt)];
const tone = (hex, r, k = .12) => { const c = new THREE.Color(hex), h = {}; c.getHSL(h); return c.setHSL(h.h + (r() - .5) * .02, h.s, Math.max(.05, h.l * (1 + (r() - .5) * 2 * k))); };
const GREEN = new THREE.Color(0x4f9a45);

/* ---------- shared pieces ---------- */
function cane(P, H, x = .07, z = -.05) { P.caps(.013, H, 0xb89a62, { pos: [x, H / 2 + .02, z], cap: 2, seg: 7, surf: [SURF.bark, .08] }); }
function calyx(P, p, s, yaw = 0, n = 5) { if (P.q < .45) return; for (let j = 0; j < n; j++) P.blade(s * .55, s * .3, 0x3f7f35, { grow: false, pos: [p[0], p[1], p[2]], rot: [.3, yaw + j * (6.283 / n), 0], droop: .5, fold: .1, rows: 2, surf: STEM }); }
function flower(P, p, s, petal = 0xfbfbf2, centre = 0xe0c444, n = 5) { if (P.q < .45) return; for (let j = 0; j < n; j++) P.blade(s, s * .72, petal, { grow: false, pos: p, rot: [.15, j * (6.283 / n), 0], droop: .3, fold: .15, rows: 2, wide: .55, tip: petal, surf: [SURF.plain, .15] }); P.sphere(s * .26, centre, { pos: [p[0], p[1] + s * .1, p[2]], seg: 6, rings: 4 }); }
/* ripening: green at stage 4, the crop's colour in the harvest window */
const ripen = (hex, ripe, r) => (ripe ? tone(hex, r, .06) : new THREE.Color(hex).lerp(GREEN, .82));

/* ---------- tomato: one stem up a cane, compound leaves, trusses ---------- */
function frond(P, base, yaw, L, o, r) { // rachis with leaflet pairs and a terminal leaflet
  const pitch = .15 + r() * .3, d = [Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch) * .35, Math.cos(yaw) * Math.cos(pitch)], end = [base[0] + d[0] * L, base[1] + d[1] * L - L * .12, base[2] + d[2] * L];
  P.stem(base, end, .011, .006, o.stem, { seg: 4, surf: STEM });
  const pairs = P.q >= .9 ? 3 : P.q >= .45 ? 2 : 1;
  for (let k = 0; k < pairs; k++) { const t = .3 + k * (.52 / pairs), b = mix3(base, end, t), s = L * (.46 - k * .04); [-1, 1].forEach((sd) => P.blade(s, s * .6, tone(o.leaf, r), { pos: b, rot: [pitch + .1, yaw + sd * 1.2, sd * .3], fold: .22, droop: .28, rows: 4, wave: .3, waveN: 7, wide: .38, surf: LEAF })); }
  P.blade(L * .5, L * .3, tone(o.leaf, r), { pos: end, rot: [pitch + .2, yaw, 0], fold: .22, droop: .28, rows: 5, wave: .3, waveN: 7, wide: .38, surf: LEAF });
}
function tomato(P, o, st) {
  const g = G[st], r = rng(17), H = 2.0 * g, n = P.n(st === 2 ? 5 : st === 3 ? 9 : 14, st === 2 ? 3 : 6);
  if (st >= 3) cane(P, Math.max(.5, H * 1.08));
  const top = [.03, H, 0], at = (t) => [Math.sin(t * 5) * .025 * g, H * t, Math.cos(t * 4) * .02 * g];
  for (let i = 0; i < 4; i++) P.stem(at(i / 4), at((i + 1) / 4), .036 * g * (1 - i * .15) + .006, .036 * g * (1 - (i + 1) * .15) + .006, o.stem, { seg: 7, surf: STEM });
  for (let i = 0; i < n; i++) { const t = .12 + (i / n) * .86, L = (.72 - t * .26) * (g * .5 + .5) * (st === 2 ? .7 : 1); frond(P, at(t), i * GA + .4, L, o, r); }
  for (let k = 0; k < 3; k++) P.blade(.13 * g + .05, .06, tone(0x5aa24c, r), { pos: top, rot: [-.7 + r() * .3, k * 2.1, 0], droop: .15, rows: 3, tip: 0x8fcb72, surf: LEAF });
  if (st < 4) return;
  const ripe = st === 5, trusses = P.n(4, 2);
  for (let k = 0; k < trusses; k++) {
    const t = .24 + k * .17, b = at(t), yaw = 1.2 + k * 2.3, e = [b[0] + Math.sin(yaw) * .17, b[1] - .05, b[2] + Math.cos(yaw) * .17]; P.stem(b, e, .009, .007, o.stem, { seg: 4, surf: STEM });
    const nf = P.n(5, 3);
    for (let j = 0; j < nf; j++) { const s = (ripe ? .085 : .06) * (.85 + r() * .3), a = yaw + (j - nf / 2) * .55, p = [e[0] + Math.sin(a) * .09 * (j % 2 ? 1 : .4), e[1] - .03 - j * .045, e[2] + Math.cos(a) * .09 * (j % 2 ? 1 : .4)], red = ripe && (k < trusses - 1 || j < 2);
      P.sphere([s, s * .9, s], ripen(red ? o.fruit : 0xd9a035, ripe, r), { pos: p, seg: 12, rings: 9, surf: SKIN }); calyx(P, [p[0], p[1] + s * .82, p[2]], s, a); }
  }
  if (P.q >= .45) [.72, .86].forEach((t, i) => { const b = at(t), a = 3 + i * 2; flower(P, [b[0] + Math.sin(a) * .1, b[1], b[2] + Math.cos(a) * .1], .03, 0xf2d53c, 0xe0a52c); });
}

/* ---------- pepper: forks again and again; fruit hangs under the forks ---------- */
const BELL = [[.1, -.05], [.3, .02], [.46, 0], [.53, -.14], [.52, -.34], [.48, -.54], [.43, -.72], [.37, -.86], [.27, -.95], [.12, -.98], [.02, -.94]];
const CHILLI = [[.05, .0], [.2, -.02], [.24, -.12], [.21, -.4], [.15, -.75], [.08, -1.05], [.02, -1.25]];
const EGGP = [[.06, 0], [.2, -.04], [.26, -.2], [.34, -.5], [.42, -.8], [.4, -1.02], [.26, -1.2], [.04, -1.27]];
function pepperFruit(P, p, s, color, { lobes = 3, yaw = 0, tilt = 0, hot = false } = {}) {
  const c = new THREE.Color(color), groove = c.clone().multiplyScalar(.74), hi = c.clone().lerp(new THREE.Color(0xffffff), .12);
  if (hot) P.lathe(CHILLI, c, { pos: p, rot: [tilt + .25, yaw, 0], scale: s * 2.2, seg: 9, rings: 8, surf: SKIN });
  else P.lathe(BELL, c, { pos: p, rot: [tilt, yaw, 0], scale: s * 2, lobes, amp: .11, lobeAt: (t) => .35 + .65 * t, seg: 14, rings: 10, surf: SKIN, paint: (x, y, z, c0) => { const k = Math.cos(lobes * (Math.atan2(z - p[2], x - p[0]) - yaw)); return c0.clone().lerp(groove, clamp01(-k) * .5).lerp(hi, clamp01(k) * .3); } });
  P.cyl(s * .26, s * (hot ? .4 : .5), s * .18, 0x4f8a3e, { pos: [p[0], p[1] + s * .06, p[2]], seg: 8, surf: STEM }); calyx(P, [p[0], p[1] + s * .1, p[2]], s, yaw);
}
function pepper(P, o, st) {
  const g = G[st], r = rng(31), full = st >= 4 ? 3 : st === 3 ? 2 : 1, levels = Math.min(P.q >= .9 ? 3 : P.lite ? 1 : 2, full), reach = 1 + .4 * (full - levels), segs = []; // a lighter model forks less and reaches further with each fork
  if (st >= 3 && o.cane !== false) cane(P, 1.3 * g, .075);
  const grow = (a, d, len, rad, depth, yaw) => {
    const b = [a[0] + d[0] * len, a[1] + d[1] * len, a[2] + d[2] * len]; P.stem(a, b, rad, rad * .74, o.stem, { seg: 6, surf: STEM }); segs.push({ a, b, depth, yaw });
    if (depth >= levels) return;
    const n = depth === 0 ? 3 : 2;
    for (let i = 0; i < n; i++) { const y2 = depth === 0 ? i * 2.09 + .5 + (r() - .5) * .3 : yaw + (i ? 1 : -1) * (.95 + r() * .4); grow(b, dir(y2, depth === 0 ? .58 + r() * .1 : .62 + r() * .22), len * (depth === 0 ? .66 : .8), rad * .72, depth + 1, y2); }
  };
  grow([0, 0, 0], [.02, 1, 0], .46 * (g * .7 + .3) * reach, .03 * g + .004, 0, 0);
  const fruits = [], LL = [.36, .33, .28, .22];
  segs.forEach(({ a, b, depth, yaw }) => {
    const n = P.n(depth === 3 ? 4 : 3, 2);
    for (let k = 0; k < n; k++) {
      const t = depth === 0 ? .55 + k * .2 : (k + .6) / n, base = mix3(a, b, Math.min(1, t)), ya = depth === 0 ? k * 2.2 + 1 : yaw + (k % 2 ? 1 : -1) * (1.15 + r() * .6), L = LL[depth] * (.85 + r() * .3) * (g * .6 + .4) * (o.leafK || 1), old = depth === 0 && k === 0 && st === 5;
      const pe = [base[0] + Math.sin(ya) * .06, base[1] + .02, base[2] + Math.cos(ya) * .06]; if (P.q >= .45) P.stem(base, pe, .0065, .005, o.stem, { seg: 4, surf: STEM });
      P.blade(L, L * (o.leafW || .52), old ? 0x8f9a3a : tone(o.leaf, r), { pos: pe, rot: [-.12 + r() * .42, ya, (r() - .5) * .5], fold: .24, droop: .1 + r() * .18, wide: .36, rows: 5, wave: o.leafWave ?? .12, tip: old ? 0xb9a94a : null, surf: [SURF.leaf, .34] });
      if (depth > 0 && depth < 3 && k === 1) fruits.push([base, Math.atan2(base[0], base[2]) + (r() - .5) * .8]);
    }
    if (depth === levels) for (let k = 0; k < P.n(3, 2); k++) P.blade((.15 + r() * .04) * (g * .6 + .4), .08, 0x56a24e, { pos: b, rot: [-.6 + r() * .35, yaw + k * 2.1 + r(), 0], droop: .12, fold: .3, rows: 4, tip: 0x84c66a, surf: [SURF.leaf, .36] });
  });
  if (st < 4) return;
  const ripe = st === 5, cols = o.fruit, hot = !!o.hot;
  fruits.slice(0, P.n(hot ? 9 : 7, 3)).forEach(([b, a], i) => {
    if (o.kind === "okra") { P.lathe(CHILLI, ripe ? cols[0] : 0x7fb060, { pos: [b[0] + Math.sin(a) * .07, b[1] + .03, b[2] + Math.cos(a) * .07], rot: [Math.PI - .5, a, 0], scale: ripe ? .17 : .1, lobes: 5, amp: .1, seg: 10, rings: 7, surf: [SURF.fruit, .3] }); return; }
    const col = cols[i % cols.length], green = !ripe || (i % 3 === 1 && !hot), s = (green ? .058 : .076 + r() * .008) * (hot ? .62 : 1), k1 = [b[0] + Math.sin(a) * .075, b[1] + .005, b[2] + Math.cos(a) * .075], p = [b[0] + Math.sin(a) * .13, b[1] - .07, b[2] + Math.cos(a) * .13];
    P.stem(b, k1, .0085, .0085, 0x4a8a3c, { seg: 4, surf: STEM }); P.stem(k1, p, .0085, .011, 0x4a8a3c, { seg: 4, surf: STEM });
    if (o.kind === "egg") { const e = (ripe ? .1 : .06) * (.9 + r() * .2); P.lathe(EGGP, col, { pos: p, rot: [.2, a, 0], scale: e * 2.6, seg: 12, rings: 10, surf: SKIN }); calyx(P, [p[0], p[1] - e * .05, p[2]], e * 1.6, a); return; }
    pepperFruit(P, p, s, green ? 0x2f7d35 : col, { lobes: i % 2 ? 4 : 3, yaw: a, tilt: (r() - .5) * .3, hot });
  });
  if (P.q >= .45) segs.filter((q) => q.depth === levels).slice(1, 5).forEach(({ b }, i) => { if (i % 2 === 0) flower(P, [b[0] + .03, b[1] - .02, b[2] + .03], .034, o.flower ?? 0xfbfbf2); });
}

/* ---------- rosettes: lettuce, spinach, chard, kale, radish tops ---------- */
function rosette(P, o, st) {
  const g = G[st], r = rng(o.seed || 5), n = P.n(o.n * (st === 2 ? .45 : st === 3 ? .75 : 1), st === 2 ? 4 : 6);
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1), yaw = i * GA + r() * .3, L = o.L * g * (1 - t * o.shrink) * (.9 + r() * .2), up = o.out + (o.in - o.out) * Math.pow(t, .8) + (r() - .5) * .12;
    const col = tone(o.leaf, r, .08).lerp(new THREE.Color(o.tip), t * .75), pet = (o.pet || 0) * L, d = dir(yaw, HPI - up), base = [d[0] * .02, (o.y0 || 0) + .02 + t * .03 * g, d[2] * .02], pe = [base[0] + d[0] * pet, base[1] + d[1] * pet, base[2] + d[2] * pet];
    if (pet > 0) P.stem(base, pe, (o.petR || .008) * g + .004, (o.petR || .008) * g * .7 + .003, o.petC ?? 0x8fbf70, { seg: 5, surf: [SURF.plain, .3] });
    P.blade(L, L * o.w, col, { pos: pe, rot: [-up, yaw, (r() - .5) * .35], fold: o.fold, cup: (o.cupc || 0) + t * (o.cup || 0), droop: o.droop * (1 - t * .7), rise: .05, fixL: true, rows: o.rows || 6, cols: 5, wide: o.wide, wave: o.wave, waveN: o.waveN || 4, blunt: o.blunt || .6, rib: o.rib, ribW: o.ribW || 0, tip: o.edge != null ? o.edge : null, surf: [SURF.leaf, o.gloss] });
  }
  if (o.root && st >= 3) { // the swollen root shows above the soil
    const s = o.root.s * (st === 3 ? .55 : 1);
    P.lathe([[.02, .06], [.2, .05], [.46, -.1], [.5, -.42], [.36, -.78], [.12, -.98], [.02, -1.2]], o.root.color, { pos: [0, s * 1.15, 0], scale: s * 2, seg: 14, rings: 10, surf: [SURF.fruit, .55], paint: (x, y, z, c) => c.clone().lerp(new THREE.Color(0xf6efe6), smooth(s * .5, 0, y) * .8) });
  }
  if (o.bolt && st === 5 && P.q >= .9) flower(P, [0, o.L * .55, 0], .03);
}

/* ---------- herbs: leaf pairs up the stems, needles, or divided leaves on long stalks ---------- */
function herb(P, o, st) {
  const g = G[st], r = rng(o.seed || 7), stems = P.n(o.stems * (st === 2 ? .5 : st === 3 ? .8 : 1), st === 2 ? 3 : 5), H = o.H * g;
  for (let s = 0; s < stems; s++) {
    const yaw = s * GA + r() * .4, lean = o.lean * (.35 + .65 * Math.sqrt((s + .5) / stems)) * (.8 + r() * .4), d = dir(yaw, lean), len = H * (.7 + r() * .3), base = [d[0] * .03, 0, d[2] * .03], top = [base[0] + d[0] * len, d[1] * len, base[2] + d[2] * len];
    if (o.mode === "divided") { // parsley, coriander: a long stalk ending in three groups of small crinkled leaflets
      const bend = mix3(base, top, .6); bend[1] += len * .08; P.stem(base, bend, .007, .006, o.stem, { seg: 4, surf: STEM }); P.stem(bend, top, .006, .004, o.stem, { seg: 4, surf: STEM });
      [-1, 0, 1].forEach((k) => { const a = yaw + k * .9, c = [top[0] + Math.sin(a) * .03, top[1], top[2] + Math.cos(a) * .03]; for (let j = 0; j < 3; j++) P.blade(o.L * (j === 1 ? 1 : .8), o.L * .75, tone(o.leaf, r), { pos: c, rot: [.1 + r() * .35 - .2, a + (j - 1) * .75, (r() - .5) * .6], fold: .25, droop: .25, rows: 3, wide: .58, wave: .45, waveN: 5, surf: [SURF.leaf, o.gloss] }); });
      continue;
    }
    P.stem(base, top, o.stemR * (g * .5 + .5), o.stemR * .5, o.stem, { seg: 5, surf: o.woody ? [SURF.bark, .05] : STEM });
    if (o.mode === "needles") { // rosemary: needles all the way up, standing off the stem
      const k = P.n(Math.round(len * 62), 10); for (let j = 0; j < k; j++) { const t = .1 + (j / k) * .9, b = mix3(base, top, t), a = j * GA; P.blade(o.L * (1 - t * .25), o.L * .2, tone(o.leaf, r, .1), { pos: b, rot: [-.55 - r() * .3, a, 0], fold: .5, droop: .05, rise: 0, rows: 2, wide: .5, tip: o.tip, surf: [SURF.leaf, o.gloss] }); }
      if (o.flower != null && st === 5 && P.q >= .45) for (let j = 0; j < 3; j++) P.sphere(.012, o.flower, { pos: mix3(base, top, .7 + j * .1), seg: 5, rings: 4 });
      continue;
    }
    const pairs = P.n(Math.max(2, Math.round(len / o.gap)), 3); // basil, mint, sage, thyme, oregano: opposite pairs, each pair turned a quarter
    for (let j = 0; j < pairs; j++) { const t = .15 + (j / pairs) * .85, b = mix3(base, top, t), L = o.L * (1 - t * .45) * (g * .5 + .5); [0, Math.PI].forEach((h) => P.blade(L, L * o.w, tone(o.leaf, r, .1).lerp(new THREE.Color(o.tip), t * .5), { pos: b, rot: [-.15 - t * .5 + r() * .2, yaw + j * HPI + h, 0], fold: o.fold, cup: o.cupc || 0, cols: o.L > .15 ? 5 : 3, blunt: o.blunt || .8, droop: o.droop, rows: o.rows || 4, wide: o.wide || .42, wave: o.wave || 0, waveN: 5, surf: [SURF.leaf, o.gloss] })); }
    if (o.L > .06) for (let j = 0; j < 2; j++) P.blade(o.L * .45, o.L * .45 * o.w, o.tip, { pos: top, rot: [-.9, yaw + j * Math.PI + .8, 0], fold: o.fold, droop: .1, rows: 2, surf: [SURF.leaf, o.gloss] });
    if (o.flower != null && st === 5 && P.q >= .45 && s % 2 === 0) for (let j = 0; j < 3; j++) P.sphere(.011, o.flower, { pos: [top[0], top[1] + .012 + j * .016, top[2]], seg: 5, rings: 4 });
  }
  if (o.spike && st >= 4) for (let k = 0; k < P.n(o.spike.n, P.lite ? 3 : 4); k++) { const a = k * GA, d = dir(a, .25 + r() * .3), h = H * o.spike.h * (.8 + r() * .3), top = [d[0] * h, d[1] * h, d[2] * h]; P.stem([d[0] * .05, H * .4, d[2] * .05], top, .005, .004, o.stem, { seg: 4, surf: STEM }); const col = st === 5 ? o.spike.color : 0x9aa890; if (P.q < .45) P.sphere([.016, .075, .016], col, { pos: [top[0], top[1] - .06, top[2]], seg: 5, rings: 4 }); else for (let j = 0; j < 5; j++) P.sphere([.014, .02, .014], col, { pos: [top[0], top[1] - j * .028, top[2]], seg: 5, rings: 4 }); }
}

/* ---------- strawberry: trifoliate leaves on stalks, flowers, berries at the edge ---------- */
const BERRY = [[.04, .02], [.3, .03], [.5, -.12], [.5, -.4], [.36, -.78], [.14, -1.08], [.02, -1.16]];
function strawberry(P, o, st) {
  const g = G[st], r = rng(13), n = P.n(st === 2 ? 5 : st === 3 ? 8 : 11, 4);
  P.sphere([.07 * g, .05 * g, .07 * g], 0x6b5a3a, { pos: [0, .03 * g, 0], seg: 8, rings: 6 }); // the crown
  for (let i = 0; i < n; i++) {
    const yaw = i * GA, t = i / n, len = (.2 + t * .16) * (g * .6 + .4), d = dir(yaw, .95 - t * .55), top = [d[0] * len, d[1] * len, d[2] * len];
    P.stem([0, .03, 0], top, .0075, .006, 0x6f9a4a, { seg: 4, surf: STEM });
    [-1, 0, 1].forEach((k) => { const L = (.17 - Math.abs(k) * .015) * (g * .5 + .5); P.blade(L, L * .86, tone(o.leaf, r, .1), { pos: top, rot: [.1 + r() * .25, yaw + k * 1.15, k * .25], fold: .22, droop: .2, rows: 4, wide: .58, wave: .3, waveN: 7, surf: [SURF.leaf, .3] }); });
  }
  if (st < 4) return;
  const ripe = st === 5, nf = P.n(6, 3);
  for (let i = 0; i < nf; i++) {
    const yaw = i * 1.05 + .5, rad = .3 + r() * .1, s = (ripe ? .058 : .04) * (.85 + r() * .3), top = [Math.sin(yaw) * rad * .6, .16, Math.cos(yaw) * rad * .6], p = [Math.sin(yaw) * rad, .1 + s, Math.cos(yaw) * rad];
    P.stem([0, .04, 0], top, .006, .005, 0x7fa456, { seg: 4, surf: STEM }); P.stem(top, [p[0], p[1] + s * .1, p[2]], .005, .005, 0x7fa456, { seg: 4, surf: STEM });
    P.lathe(BERRY, ripe && i % 4 !== 3 ? tone(o.fruit, r, .06) : 0xd9dfae, { pos: p, rot: [.5, yaw, 0], scale: s * 2, seg: 10, rings: 8, surf: SKIN }); calyx(P, [p[0], p[1] + s * .08, p[2]], s * 1.25, yaw, 6);
  }
  if (P.q >= .45) for (let i = 0; i < 3; i++) { const yaw = i * 2.1 + 1.6, top = [Math.sin(yaw) * .2, .26 * g, Math.cos(yaw) * .2]; P.stem([0, .04, 0], top, .005, .004, 0x7fa456, { seg: 4, surf: STEM }); flower(P, top, .036, 0xfdfdf8, 0xe6c63a); }
}

/* ---------- shared: three leaflets on one stalk, and a finely divided frond ---------- */
function trifoliate(P, top, yaw, L, col, r, { w = .7, wave = .1, gloss = .25 } = {}) {
  [-1, 0, 1].forEach((k) => P.blade(L * (k ? .9 : 1), L * w, tone(col, r, .1), { pos: top, rot: [.15 + r() * .2, yaw + k * 1.1, k * .25], fold: .2, droop: .2, rows: 4, wide: .5, blunt: .6, wave, waveN: 5, surf: [SURF.leaf, gloss] }));
}
function feather(P, base, yaw, len, up, o, r) {
  const d = dir(yaw, HPI - up), top = [base[0] + d[0] * len, base[1] + d[1] * len - len * .08, base[2] + d[2] * len]; P.stem(base, top, .006, .004, o.stem, { seg: 4, surf: STEM });
  const pairs = P.n(o.pairs || 5, 2), w = o.w || .45;
  for (let k = 0; k < pairs; k++) { const t = .3 + k * (.7 / pairs), b = mix3(base, top, t), s = o.L * (1 - k * .08); [-1, 1].forEach((sd) => P.blade(s, s * w, tone(o.leaf, r, .1), { pos: b, rot: [.2 - up * .5, yaw + sd * 1.1, 0], fold: .25, droop: .2, rows: 2, wide: .5, wave: o.wave ?? .4, waveN: 5, surf: [SURF.leaf, .2] })); }
  P.blade(o.L, o.L * w, tone(o.leaf, r, .1), { pos: top, rot: [.2 - up * .5, yaw, 0], fold: .25, droop: .2, rows: 2, wide: .5, wave: o.wave ?? .4, waveN: 5, surf: [SURF.leaf, .2] });
  return top;
}

/* ---------- potato: sprawling stems of compound leaves, flowers, tubers showing at lifting time ---------- */
function potato(P, o, st) {
  const g = G[st], r = rng(41), n = P.n(st === 2 ? 3 : 6, 3), oo = st === 5 ? { ...o, leaf: 0x7f9440 } : o; // the tops yellow off when the crop is ready
  for (let s = 0; s < n; s++) {
    const yaw = s * GA, d = dir(yaw, .45 + r() * .25), len = (.5 + r() * .15) * g, top = [d[0] * len, d[1] * len, d[2] * len]; P.stem([0, 0, 0], top, .016 * g + .004, .008, o.stem, { seg: 5, surf: STEM });
    const k = P.n(4, 2); for (let j = 0; j < k; j++) frond(P, mix3([0, 0, 0], top, .3 + j * (.7 / k)), yaw + (j % 2 ? 1.2 : -1.2) + r() * .4, (.34 - j * .03) * (g * .5 + .5), oo, r);
    if (st === 4 && s % 2 === 0) flower(P, [top[0], top[1] + .03, top[2]], .035, 0xf4f0fa, 0xe6c63a);
  }
  if (st === 5) for (let i = 0; i < P.n(4, 2); i++) { const a = i * 1.7 + .3; P.sphere([.075, .052, .058], 0xc9a878, { pos: [Math.sin(a) * .22, .03, Math.cos(a) * .22], rot: [0, a, 0], seg: 10, rings: 7, surf: [SURF.fruit, .2] }); }
}

/* ---------- brassicas: wrapper leaves round a head, a crown, a curd, or sprouts up a stalk ---------- */
const WRAP = { n: 10, L: .55, w: .72, wide: .55, blunt: .45, wave: .2, fold: .05, cupc: .25, droop: .35, out: .35, in: .95, shrink: .25, leaf: 0x4a846a, tip: 0x7fae8a, gloss: .15, pet: .14, petR: .012, petC: 0xb9d0b0, rib: 0xc9dcc0, ribW: .06, rows: 8 };
function brassica(P, o, st) {
  const k = st === 5 ? 1 : st === 4 ? .6 : 0, r = rng(9);
  if (o.kind === "sprouts") {
    const H = .95 * G[st]; P.stem([0, 0, 0], [0, H, 0], .03 * G[st] + .005, .022, 0xa9c08a, { seg: 7, surf: STEM }); rosette(P, { ...WRAP, n: 8, L: .4, y0: H, out: .5 }, st);
    if (k) for (let i = 0; i < P.n(18, 6); i++) { const a = i * GA, y = H * (.12 + (i / 18) * .72); P.sphere(.042 * k, tone(0x6fa052, r, .08), { pos: [Math.sin(a) * .05, y, Math.cos(a) * .05], seg: 8, rings: 6, surf: [SURF.plain, .25] }); }
    return;
  }
  rosette(P, WRAP, st); if (!k) return;
  if (o.kind === "cabbage") {
    const R = .23 * k; P.sphere([R, R * .9, R], 0x9fcc7c, { pos: [0, R * .95 + .05, 0], seg: 16, rings: 12, surf: [SURF.plain, .3], paint: (x, y, z, c) => c.clone().lerp(new THREE.Color(0xe4f0c0), smooth(R, R * 1.9, y) * .3) });
    for (let i = 0; i < P.n(5, 3); i++) P.blade(R * 2.3, R * 2.2, tone(0x8fc47a, r, .06), { pos: [0, .04, 0], rot: [-1.12, i * 1.257 + .3, 0], fold: 0, cup: .9, cols: 5, droop: .55, rise: .0, rows: 6, wide: .55, blunt: .4, rib: 0xd9eac0, ribW: .05, fixL: true, grow: false, surf: [SURF.leaf, .25] });
    return;
  }
  const curd = o.kind === "cauli", col = curd ? 0xf1ead2 : 0x2f6b3a; P.stem([0, 0, 0], [0, .16, 0], .035, .03, 0x9fc07a, { seg: 6, surf: STEM });
  for (let i = 0; i < P.n(9, 5); i++) { const a = i * GA, d = i === 0 ? 0 : .1 * k * (i < 5 ? .75 : 1.25); P.sphere([.085 * k, .065 * k, .085 * k], tone(col, r, .05), { pos: [Math.sin(a) * d, .2 + .07 * k - d * .35, Math.cos(a) * d], seg: 10, rings: 7, surf: [SURF.fruit, curd ? .1 : .05] }); }
}

/* ---------- carrot, parsnip, fennel, dill, chamomile: feathery tops, and what swells at the soil ---------- */
function feathery(P, o, st) {
  const g = G[st], r = rng(o.seed || 19), n = P.n(o.n * (st === 2 ? .5 : 1), 4);
  for (let i = 0; i < n; i++) { const t = i / Math.max(1, n - 1), top = feather(P, [0, .03, 0], i * GA, o.H * g * (.7 + r() * .3), o.out + (o.in - o.out) * t + (r() - .5) * .2, o, r); if (o.daisy && st >= 4 && i % 2 === 0) flower(P, [top[0], top[1] + .04, top[2]], .04, 0xffffff, 0xf0c22c, 8); }
  if (o.root && st >= 3) { const s = o.root.s * (st === 3 ? .6 : 1); P.lathe([[.02, .12], [.3, .1], [.44, -.05], [.38, -.5], [.2, -1.2]], o.root.color, { pos: [0, s * .5, 0], scale: s * 2, seg: 10, rings: 6, surf: [SURF.fruit, .3] }); }
  if (o.bulb && st >= 3) { const s = .11 * (st === 3 ? .6 : 1); P.sphere([s, s * .8, s * .7], 0xeef2dc, { pos: [0, s * .7, 0], seg: 12, rings: 8, surf: [SURF.plain, .35] }); }
}

/* ---------- onion, garlic, leek, chives: tube or strap leaves from a bulb or a shank ---------- */
function allium(P, o, st) {
  const g = G[st], r = rng(23), n = P.n(o.n * (st === 2 ? .5 : 1), 3), shank = (o.shank || 0) * g, flop = o.flop && st === 5;
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1), yaw = o.fan ? (i % 2 ? 0 : Math.PI) + (r() - .5) * .25 : i * GA, up = flop ? .25 + r() * .4 : o.fan ? 1.38 - Math.floor(i / 2) * .17 : 1.45 - (1 - t) * o.spread;
    P.blade(o.L * g * (.75 + r() * .25), o.W, flop ? tone(0x9a9a52, r) : tone(o.leaf, r, .08), { pos: [0, shank + .04 * g, 0], rot: [-up, yaw, 0], fold: o.fold, droop: flop ? .5 : o.droop, rise: 0, rows: 6, wide: .3, blunt: .9, tip: flop ? 0xc9b06a : o.tip, fixL: true, surf: [SURF.leaf, .3] });
  }
  if (shank) P.cyl(.032 * g + .006, .04 * g + .006, shank + .04, 0xf2f0e4, { pos: [0, (shank + .04) / 2, 0], seg: 9, surf: [SURF.plain, .3] });
  if (o.bulb != null && st >= 4) { const s = o.bulbS * (st === 4 ? .7 : 1); P.lathe([[.03, .55], [.1, .42], [.38, .2], [.46, -.1], [.36, -.4], [.1, -.52]], o.bulb, { pos: [0, s * .55, 0], scale: s * 2, seg: 12, rings: 8, surf: [SURF.fruit, .4] }); }
}

/* ---------- pumpkin, squash, courgette, cucumber, melons: runners on the ground, big leaves on stalks ---------- */
function vine(P, o, st) {
  const g = G[st], r = rng(o.seed || 29), runners = P.n(st === 2 ? 2 : 4, 2), ends = [];
  const bigLeaf = (at, ya, k = 1) => { const h = (.14 + r() * .1) * (g * .6 + .4) * k * (o.stalk || 1), top = [at[0] + (r() - .5) * .05, at[1] + h, at[2] + (r() - .5) * .05], L = o.L * (g * .6 + .4) * (.85 + r() * .3) * k; P.stem(at, top, .008, .006, o.stem, { seg: 4, surf: STEM });
    P.blade(L, L * o.w, tone(o.leaf, r, .1), { pos: [top[0] - Math.sin(ya) * L * .3, top[1], top[2] - Math.cos(ya) * L * .3], rot: [-.15 + r() * .3, ya, (r() - .5) * .4], fold: .05, cup: .25, cols: 5, droop: .15, rise: .05, rows: 6, wide: .5, blunt: .35, wave: o.wave, waveN: 5, surf: [SURF.leaf, .2] }); };
  for (let k = 0; k < 3; k++) bigLeaf([0, .03, 0], k * 2.1, 1.1);
  for (let k = 0; k < runners; k++) {
    let a = [0, .03, 0], yaw = k * (6.283 / runners) + .4; const len = .44 * g;
    for (let j = 0; j < 3; j++) { yaw += (r() - .5) * .6; const b = [a[0] + Math.sin(yaw) * len / 3, .035, a[2] + Math.cos(yaw) * len / 3]; P.stem(a, b, .014 * g + .004, .012 * g + .003, o.stem, { seg: 5, surf: STEM }); bigLeaf(b, yaw + (j % 2 ? 1.3 : -1.3)); a = b; }
    ends.push([a, yaw]);
  }
  if (st < 4 || !o.count) return;
  const ripe = st === 5;
  ends.slice(0, P.n(o.count, 1)).forEach(([e, yaw], i) => {
    const s = o.s * (ripe ? 1 : .6) * (.9 + r() * .2), p = [e[0] * .8, 0, e[2] * .8], col = ripen(o.fruit, ripe || o.kind === "long", r);
    if (o.kind === "pumpkin") { P.lathe([[.05, .3], [.3, .34], [.5, .1], [.5, -.15], [.3, -.36], [.05, -.34]], col, { pos: [p[0], s * .72, p[2]], scale: s * 2, lobes: 9, amp: .07, seg: 18, rings: 9, surf: [SURF.fruit, .45] }); P.stem([p[0], s * 1.35, p[2]], [p[0] + .02, s * 1.6, p[2]], .014, .01, 0x7a6a3a, { seg: 5 }); }
    else if (o.kind === "long") { P.lathe([[.03, 0], [.16, -.05], [.19, -.3], [.19, -1.0], [.15, -1.25], [.03, -1.3]], col, { pos: [p[0], s * .2, p[2]], rot: [HPI, yaw, 0], scale: s, seg: 10, rings: 8, surf: [SURF.fruit, .6] }); }
    else P.sphere([s * 1.2, s, s], col, { pos: [p[0], s * .95, p[2]], rot: [0, yaw, 0], seg: 16, rings: 11, surf: [SURF.fruit, o.stripe != null ? .55 : .15], paint: o.stripe != null ? (x, y, z, c) => c.clone().lerp(new THREE.Color(o.stripe), smooth(.2, .7, Math.sin(Math.atan2(y - s * .95, z - p[2]) * 7) * .5 + .5) * .7) : null });
    if (i === 0 && P.q >= .45) flower(P, [e[0] * .5, .1, e[2] * .5], .05, 0xf2c21c, 0xe0a020);
  });
}

/* ---------- beans and peas up canes, broad beans standing, lentils and chickpeas low ---------- */
function climber(P, o, st) {
  const g = G[st], r = rng(33), H = o.H * g, n = P.n(o.poles ? 3 : o.stems || 4, 2), ripe = st === 5; let pods = 0;
  for (let k = 0; k < n; k++) {
    const a = k * (6.283 / n) + .3, base = o.poles ? [Math.sin(a) * .3, 0, Math.cos(a) * .3] : [Math.sin(a) * .05, 0, Math.cos(a) * .05], d = dir(a, o.lean || 0), top = o.poles ? [Math.sin(a) * .05, H, Math.cos(a) * .05] : [base[0] + d[0] * H, d[1] * H, base[2] + d[2] * H];
    if (o.poles && st >= 3) P.stem(base, [Math.sin(a) * .03, o.H * 1.08, Math.cos(a) * .03], .014, .012, 0xb89a62, { seg: 6, surf: [SURF.bark, .08] });
    P.stem(base, top, .011 * (g * .5 + .5), .006, o.stem, { seg: 5, surf: STEM });
    const m = P.n(Math.max(3, Math.round(H / o.gap)), 3);
    for (let j = 0; j < m; j++) {
      const t = (j + .5) / m, b = mix3(base, top, t), ya = a + j * 2.3, pe = [b[0] + Math.sin(ya) * .08, b[1] + .03, b[2] + Math.cos(ya) * .08]; if (P.q >= .45) P.stem(b, pe, .005, .004, o.stem, { seg: 4, surf: STEM });
      trifoliate(P, pe, ya, o.L * (g * .5 + .5), o.leaf, r, { w: o.w });
      if (st >= 4 && o.pod != null && j % 2 === 1 && pods < P.n(o.pods || 8, 3)) { pods++; P.lathe([[.03, 0], [.1, -.08], [.12, -.5], [.1, -.9], [.03, -1.05]], ripen(o.pod, ripe, r), { pos: [b[0] + Math.sin(ya + 2) * .05, b[1], b[2] + Math.cos(ya + 2) * .05], rot: [o.podUp ? Math.PI - .5 : .3, ya + 2, 0], scale: [o.podS, o.podS, o.podS * .6], seg: 7, rings: 6, surf: [SURF.fruit, .3] }); }
      else if (st === 4 && j % 3 === 0 && P.q >= .45) flower(P, [pe[0], pe[1] + .02, pe[2]], .028, o.flower ?? 0xfbfbf2, 0xe8d8a0, 4);
    }
  }
}

/* ---------- maize, grain, sunflower ---------- */
function corn(P, o, st) {
  const g = G[st], r = rng(37), H = 2.1 * g, n = P.n(st === 2 ? 5 : 12, 5), at = (t) => [Math.sin(t * 4) * .015, H * t, 0];
  for (let i = 0; i < 3; i++) P.stem(at(i / 3), at((i + 1) / 3), .045 * g * (1 - i * .2) + .006, .045 * g * (1 - (i + 1) * .2) + .006, 0x7fa650, { seg: 7, surf: STEM });
  for (let i = 0; i < n; i++) { const t = .1 + (i / n) * .78, L = .8 * (g * .6 + .4) * (1 - Math.abs(t - .5) * .5); P.blade(L, .15, tone(0x3f8a3c, r, .08), { pos: at(t), rot: [-.95 + r() * .2, (i % 2 ? Math.PI : 0) + i * .35, 0], fold: .25, droop: .9, rise: .2, rows: 8, wide: .25, blunt: .9, wave: .15, waveN: 6, rib: 0x9fd07a, fixL: true, surf: [SURF.leaf, .3] }); }
  if (st < 4) return;
  const ripe = st === 5;
  [[.42, .6], [.56, 3.6]].slice(0, P.n(2, 1)).forEach(([t, ya]) => { const b = at(t), p = [b[0] + Math.sin(ya) * .03, b[1], b[2] + Math.cos(ya) * .03], tip = [p[0] + Math.sin(ya) * .14, p[1] + .29, p[2] + Math.cos(ya) * .14];
    P.lathe([[.02, 0], [.12, .12], [.16, .5], [.13, .9], [.04, 1.08]], ripe ? 0xa9c070 : 0x8fb85a, { pos: p, rot: [.45, ya, 0], scale: .3, seg: 9, rings: 7, surf: [SURF.leaf, .2] });
    if (P.q >= .45) for (let k = 0; k < 5; k++) P.blade(.1, .012, ripe ? 0x7a4a2a : 0xe6d98a, { grow: false, pos: tip, rot: [.3 + k * .25, ya + (k - 2) * .5, 0], droop: .8, rows: 2, tip: ripe ? 0x5a3420 : 0xe6d98a, surf: [SURF.plain, .1] }); });
  for (let k = 0; k < P.n(6, 3); k++) P.blade(.28, .022, 0xcdb86a, { grow: false, pos: at(1), rot: [-.5 - (k % 3) * .3, k * 1.05, 0], droop: .25, rows: 3, tip: 0xd9c67a, surf: [SURF.plain, .1] });
}
function grain(P, o, st) {
  const g = G[st], r = rng(43), n = P.n(st === 2 ? 5 : 11, 4), gold = st === 5, col = gold ? 0xc9a85a : 0x6fa24a;
  for (let i = 0; i < n; i++) {
    const yaw = i * GA, sp = .13 * Math.sqrt((i + .5) / n), d = dir(yaw, .08 + r() * .14), len = (.9 + r() * .2) * g, base = [Math.sin(yaw) * sp, 0, Math.cos(yaw) * sp], top = [base[0] + d[0] * len, d[1] * len, base[2] + d[2] * len];
    P.stem(base, top, .008, .006, col, { seg: 4, surf: STEM });
    [.35, .6].forEach((t, k) => P.blade(.34 * (g * .5 + .5), .03, gold ? 0xb9a55a : tone(0x5f9a44, r), { pos: mix3(base, top, t), rot: [-.9 + r() * .4, yaw + k * 2.6, 0], fold: .3, droop: .6, rows: 3, wide: .3, blunt: .9, surf: [SURF.leaf, .2] }));
    if (st >= 4) { P.lathe([[.02, 0], [.09, .1], [.1, .5], [.07, .85], [.02, 1.0]], gold ? 0xd9b862 : 0x8fb55a, { pos: top, rot: [(r() - .5) * .5, yaw, 0], scale: .16, lobes: 4, amp: .14, seg: 8, rings: 6, surf: [SURF.fruit, .25] });
      if (P.q >= .45) for (let k = 0; k < 3; k++) P.blade(.17, .008, gold ? 0xe0c67a : 0x9fc06a, { grow: false, pos: [top[0], top[1] + .12, top[2]], rot: [-1.2 + k * .15, yaw + k * 2.1, 0], droop: .1, rows: 2, tip: gold ? 0xe0c67a : 0x9fc06a, surf: [SURF.plain, .1] }); }
  }
}
function sunflower(P, o, st) {
  const g = G[st], r = rng(47), H = 2.2 * g, n = P.n(st === 2 ? 5 : 12, 5);
  P.stem([0, 0, 0], [.02, H * .5, 0], .036 * g + .006, .03 * g + .005, 0x6f9a4a, { seg: 7, surf: STEM }); P.stem([.02, H * .5, 0], [0, H, .03], .03 * g + .005, .022 * g + .004, 0x6f9a4a, { seg: 7, surf: STEM });
  for (let i = 0; i < n; i++) { const t = .12 + (i / n) * .76, ya = i * GA, b = [.01, H * t, 0], pe = [b[0] + Math.sin(ya) * .1, b[1] + .04, b[2] + Math.cos(ya) * .1], L = .48 * (g * .6 + .4) * (1 - t * .3); P.stem(b, pe, .008, .006, 0x6f9a4a, { seg: 4, surf: STEM });
    P.blade(L, L * .85, tone(0x3f8540, r, .08), { pos: pe, rot: [.25 + r() * .25, ya, 0], fold: .05, cup: .12, cols: 5, droop: .35, rows: 6, wide: .35, blunt: .55, wave: .1, surf: [SURF.leaf, .15] }); }
  if (st < 4) return;
  const c = [0, H + .02, .06], rot = [HPI - .85, .2, 0], R = st === 5 ? .24 : .1, /* the head tips up toward the map's camera more than a real one does, so it shows */ M = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], "YXZ"));
  P.cyl(R, R * .85, .06, st === 5 ? 0x4a3220 : 0x5f8a3a, { pos: c, rot, seg: 16, surf: [SURF.fruit, .1] });
  const petals = P.n(st === 5 ? 18 : 10, 8);
  for (let k = 0; k < petals; k++) { const ph = k * (6.283 / petals), v = new THREE.Vector3(Math.cos(ph), .12, Math.sin(ph)).normalize().applyMatrix4(M), base = [c[0] + v.x * R * .9, c[1] + v.y * R * .9, c[2] + v.z * R * .9];
    P.blade(st === 5 ? .24 : .1, st === 5 ? .08 : .05, st === 5 ? 0xf2c21c : 0x6f9a4a, { grow: false, pos: base, rot: [-Math.asin(Math.max(-1, Math.min(1, v.y))), Math.atan2(v.x, v.z), 0], fold: .15, droop: .15, rows: 3, wide: .45, tip: st === 5 ? 0xf7d84a : 0x86b05a, surf: [SURF.plain, .2] }); }
}

/* ---------- raspberry and blackberry canes, a trained grape vine ---------- */
function caneberry(P, o, st) {
  const g = G[st], r = rng(51), n = P.n(st === 2 ? 2 : 4, 2), ripe = st === 5;
  for (let k = 0; k < n; k++) {
    const yaw = k * (6.283 / n) + .5, H = 1.5 * g * (.85 + r() * .3), base = [Math.sin(yaw) * .06, 0, Math.cos(yaw) * .06], mid = [Math.sin(yaw) * .16, H * .62, Math.cos(yaw) * .16], top = [Math.sin(yaw) * .42, H * .95, Math.cos(yaw) * .42];
    P.stem(base, mid, .014, .011, o.cane, { seg: 5, surf: [SURF.bark, .1] }); P.stem(mid, top, .011, .006, o.cane, { seg: 5, surf: [SURF.bark, .1] });
    const m = P.n(7, 3);
    for (let j = 0; j < m; j++) { const t = (j + .6) / m, b = t < .55 ? mix3(base, mid, t / .55) : mix3(mid, top, (t - .55) / .45), ya = yaw + j * 2.4, pe = [b[0] + Math.sin(ya) * .08, b[1] + .02, b[2] + Math.cos(ya) * .08];
      trifoliate(P, pe, ya, .2 * (g * .5 + .5), o.leaf, r, { w: .62, wave: .3 });
      if (st >= 4 && j >= m - 3) for (let q = 0; q < P.n(3, 1); q++) P.sphere(.03, ripen(o.fruit, ripe, r), { pos: [b[0] + Math.sin(ya + 2 + q) * .06, b[1] - .04 - q * .025, b[2] + Math.cos(ya + 2 + q) * .06], seg: 7, rings: 5, surf: [SURF.fruit, .6] }); }
  }
}
function grape(P, o, st) {
  const g = G[st], r = rng(53), ripe = st === 5, arm = .42 * (st >= 3 ? 1 : 0);
  if (st >= 3) { P.caps(.028, 1.45, 0x9a7a54, { pos: [0, .74, -.07], cap: 2, seg: 8, surf: [SURF.bark, .05] }); P.cyl(.004, .004, 1.0, 0xaab0b0, { pos: [0, 1.02, -.03], rot: [0, 0, HPI], seg: 4 }); }
  const t1 = [.03, .5 * g, 0], t2 = [0, 1.0 * g, 0]; P.stem([0, 0, 0], t1, .04 * g + .008, .032 * g + .006, 0x6a4c34, { seg: 8, surf: [SURF.bark, .04] }); P.stem(t1, t2, .032 * g + .006, .025 * g + .005, 0x6a4c34, { seg: 8, surf: [SURF.bark, .04] });
  const leaf = (b, ya) => { const L = .2 * (g * .5 + .5) * (.85 + r() * .3), pe = [b[0] + Math.sin(ya) * .06, b[1] + .03, b[2] + Math.cos(ya) * .06]; P.blade(L, L * 1.0, tone(o.leaf, r, .1), { pos: pe, rot: [.2 + r() * .4, ya, (r() - .5) * .5], fold: .05, cup: .15, cols: 5, droop: .25, rows: 6, wide: .45, blunt: .4, wave: .35, waveN: 5, surf: [SURF.leaf, .2] }); };
  if (!arm) { for (let k = 0; k < 4; k++) leaf(mix3(t1, t2, k / 4 + .2), k * 2.2); return; }
  [-1, 1].forEach((sd) => {
    const end = [sd * arm, 1.0 * g, 0]; P.stem(t2, end, .022, .014, 0x6a4c34, { seg: 6, surf: [SURF.bark, .04] });
    const shoots = P.n(st >= 4 ? 4 : 2, 2);
    for (let k = 0; k < shoots; k++) { const b = mix3(t2, end, (k + .7) / shoots), top = [b[0] + (r() - .5) * .08, b[1] + .34 * g, b[2] + (r() - .5) * .1]; P.stem(b, top, .008, .005, 0x7f9a52, { seg: 4, surf: STEM }); for (let j = 0; j < P.n(3, 2); j++) leaf(mix3(b, top, (j + 1) / 3), sd * 1.2 + j * 2.1);
      if (st >= 4 && k % 2 === 0) { const col = ripen(o.fruit, ripe, r), c = [b[0], b[1] - .05, b[2] + .03]; if (P.q >= .45) for (let q = 0; q < 13; q++) { const lv = q < 5 ? 0 : q < 9 ? 1 : q < 12 ? 2 : 3, m = [5, 4, 3, 1][lv], a = q * (6.283 / m); P.sphere(.024, col, { pos: [c[0] + Math.sin(a) * .03 * (1 - lv * .25), c[1] - lv * .038, c[2] + Math.cos(a) * .03 * (1 - lv * .25)], seg: 6, rings: 5, surf: [SURF.fruit, .5] }); } else P.lathe([[.02, 0], [.3, -.08], [.26, -.5], [.05, -1]], col, { pos: c, scale: .19, seg: 7, rings: 4, surf: [SURF.fruit, .5] }); }
    }
  });
}

/* ---------- asparagus spears with fern behind, globe artichoke ---------- */
function asparagus(P, o, st) {
  const g = G[st], r = rng(57), n = P.n(st === 2 ? 3 : st === 3 ? 5 : 7, 3);
  for (let i = 0; i < n; i++) { const a = i * GA, d = .06 + .16 * Math.sqrt(i / n), h = (.22 + r() * .4) * (g * .6 + .4), p = [Math.sin(a) * d, 0, Math.cos(a) * d]; P.stem(p, [p[0], h, p[2]], .016, .014, 0x6fa24a, { seg: 6, surf: STEM }); P.lathe([[.02, .0], [.5, .15], [.48, .5], [.2, .95], [.02, 1.1]], 0x5f7f52, { pos: [p[0], h - .01, p[2]], scale: .042, lobes: 3, amp: .12, seg: 7, rings: 5, surf: [SURF.plain, .25], paint: (x, y, z, c) => c.clone().lerp(new THREE.Color(0x6a4a6a), smooth(h, h + .05, y) * .6) }); }
  if (st >= 4) for (let k = 0; k < 2; k++) { const base = [(k ? .2 : -.18), 0, -.2], top = [base[0] * 1.3, 1.25, base[2] - .05]; P.stem(base, top, .01, .004, 0x6fa24a, { seg: 4, surf: STEM }); const m = P.n(26, 8); for (let j = 0; j < m; j++) P.blade(.16, .012, tone(0x6fae58, r), { grow: false, pos: mix3(base, top, .3 + (j / m) * .7), rot: [-.3 - r() * .5, j * GA, 0], droop: .3, rows: 2, surf: [SURF.leaf, .1] }); }
}
function artichoke(P, o, st) {
  rosette(P, { n: 12, L: .72, w: .32, wide: .5, blunt: .55, wave: .7, waveN: 8, fold: .12, cupc: .1, droop: .45, out: .5, in: 1.25, shrink: .3, leaf: 0x7a9a84, tip: 0xa9c2a8, gloss: .08, rib: 0xc0d2c0, ribW: .06, rows: 16 }, st);
  if (st < 4) return; const k = st === 5 ? 1 : .6;
  [[0, 0, .8, 1], [.9, .2, .62, .7], [3.6, .18, .55, .65]].slice(0, P.n(3, 1)).forEach(([a, d, h, s]) => { const top = [Math.sin(a) * d, h * (k * .4 + .6), Math.cos(a) * d]; P.stem([0, 0, 0], top, .022, .018, 0x8aa08a, { seg: 6, surf: STEM });
    P.lathe([[.05, 0], [.3, .1], [.42, .4], [.36, .75], [.15, 1.0], [.02, 1.02]], 0x6f8f6a, { pos: top, scale: .2 * s * k, lobes: 7, amp: .07, lobeAt: (t) => Math.sin(t * 9) * .5 + .5, seg: 14, rings: 10, surf: [SURF.fruit, .2], paint: (x, y, z, c) => c.clone().lerp(new THREE.Color(0x7a5a7a), smooth(top[1] + .1 * s * k, top[1] + .22 * s * k, y) * .5) }); });
}

/* ---------- the list: first match wins. `shade` = [radius, height] of the plant's own shadow inside itself ---------- */
const NS = { leaf: 0x2e7a3a, stem: 0x4a7f3e }, HERB = { mode: "pairs", stem: 0x6a8a52, stemR: .008, fold: .15, droop: .2 };
const ROOTTOP = { n: 8, L: .4, w: .46, wide: .62, blunt: .5, wave: .16, waveN: 4, fold: .1, cupc: .12, droop: .28, rows: 8, out: .7, in: 1.25, shrink: .3, gloss: .2, pet: .3, petR: .007 };
const VINE = { stem: 0x5f8f48, leaf: 0x3a8038, L: .34, w: 1.0, wave: .25 };
const REAL = [
  [/tomato/, tomato, { ...NS, leaf: 0x357f3c, fruit: 0xd3261f }, [.4, 1.9]],
  [/pepper \(hot\)|chilli|chili/, pepper, { ...NS, fruit: [0xc92118, 0xc92118, 0xd9601c], hot: true }, [.42, 1.1]],
  [/pepper|capsicum/, pepper, { ...NS, fruit: [0xc42a23, 0xd9a521, 0xc42a23, 0xcf5b1f] }, [.42, 1.1]],
  [/eggplant|aubergine/, pepper, { leaf: 0x4a7a4c, stem: 0x5a6a4a, fruit: [0x3a2150], kind: "egg", leafK: 1.25, leafW: .62, flower: 0xb9a0e0 }, [.45, 1.1]],
  [/okra/, pepper, { leaf: 0x3f8540, stem: 0x5a8a48, fruit: [0x9fc85a], kind: "okra", leafK: 1.2, leafW: .8, leafWave: .4, flower: 0xf4e9a0, cane: false }, [.42, 1.2]],
  [/sweet potato/, vine, { ...VINE, leaf: 0x3f7f3a, L: .24, w: .85, wave: .1, count: 0, stalk: .45 }, [.4, .3]],
  [/potato/, potato, { leaf: 0x3a7f3c, stem: 0x5a8a48 }, [.45, .6]],
  [/lettuce|endive|lamb/, rosette, { n: 28, L: .48, w: .95, wide: .6, blunt: .4, wave: .22, waveN: 4, fold: .05, cupc: .3, cup: .7, droop: .3, out: .3, in: 1.42, shrink: .62, leaf: 0x6fb04a, tip: 0xd2ec98, gloss: .24, rows: 9 }, [.3, .4]],
  [/rocket|arugula/, rosette, { n: 14, L: .46, w: .3, wide: .62, wave: .5, waveN: 7, fold: .15, droop: .3, out: .55, in: 1.25, shrink: .4, leaf: 0x3f8a3c, tip: 0x62a84e, gloss: .2, pet: .2, petR: .006, petC: 0x8fbf70, bolt: true }, [.28, .4]],
  [/spinach/, rosette, { n: 14, L: .4, w: .7, wide: .46, blunt: .5, wave: .1, fold: .05, cupc: .28, droop: .3, out: .45, in: 1.2, shrink: .45, leaf: 0x2a7235, tip: 0x4c9846, gloss: .42, pet: .34, petR: .009, petC: 0x7fb866 }, [.3, .4]],
  [/chard/, rosette, { n: 10, L: .68, w: .5, wide: .44, blunt: .55, wave: .2, waveN: 4, fold: .12, cupc: .15, droop: .32, out: .8, in: 1.38, shrink: .35, leaf: 0x276a33, tip: 0x3f8a40, gloss: .46, pet: .42, petR: .017, petC: 0xc8323a, rib: 0xd2424a, ribW: .09, rows: 9 }, [.3, .9]],
  [/kale/, rosette, { n: 13, L: .66, w: .4, wide: .5, blunt: .5, wave: .55, waveN: 6, fold: .1, cupc: .12, droop: .3, out: .6, in: 1.32, shrink: .35, leaf: 0x3c6b5e, tip: 0x6a9a82, gloss: .14, pet: .3, petR: .012, petC: 0x9fb58a, rib: 0xa9c2a0, ribW: .06, rows: 14 }, [.3, .8]],
  [/celery/, rosette, { n: 12, L: .3, w: .8, wide: .5, blunt: .5, wave: .4, waveN: 5, fold: .1, droop: .25, out: 1.15, in: 1.45, shrink: .2, leaf: 0x4f9a40, tip: 0x86c060, gloss: .3, pet: 2.4, petR: .016, petC: 0xc4e08e, rows: 6 }, [.2, .9]],
  [/rhubarb/, rosette, { n: 9, L: .5, w: .95, wide: .5, blunt: .4, wave: .25, waveN: 5, fold: .05, cupc: .2, droop: .35, out: .55, in: 1.2, shrink: .25, leaf: 0x3a7a38, tip: 0x5f9a4a, gloss: .25, pet: .7, petR: .02, petC: 0xb8324a, rib: 0xd9a0a0, ribW: .05, rows: 8 }, [.35, .7]],
  [/cabbage/, brassica, { kind: "cabbage" }, [.4, .5]],
  [/broccoli/, brassica, { kind: "broccoli" }, [.4, .5]],
  [/cauliflower/, brassica, { kind: "cauli" }, [.4, .5]],
  [/brussels/, brassica, { kind: "sprouts" }, [.3, 1.2]],
  [/carrot/, feathery, { n: 13, H: .5, out: .65, in: 1.35, L: .09, w: .55, pairs: 6, leaf: 0x3f8f3c, stem: 0x6aa850, root: { s: .07, color: 0xe8792a } }, [.2, .5]],
  [/parsnip|celeriac/, feathery, { n: 9, H: .5, out: .6, in: 1.3, L: .1, w: .7, pairs: 4, wave: .5, leaf: 0x3f8a3a, stem: 0x7fb060, root: { s: .08, color: 0xeadfbe } }, [.2, .5]],
  [/fennel/, feathery, { n: 11, H: .85, out: .9, in: 1.45, L: .09, w: .08, pairs: 7, wave: 0, leaf: 0x6fb05a, stem: 0x9fd07a, bulb: true }, [.2, .8]],
  [/dill/, feathery, { n: 9, H: .8, out: .9, in: 1.45, L: .08, w: .08, pairs: 7, wave: 0, leaf: 0x5fa24e, stem: 0x8fc46a }, [.2, .8]],
  [/chamomile/, feathery, { n: 14, H: .42, out: .6, in: 1.35, L: .05, w: .2, pairs: 5, wave: 0, leaf: 0x5f9f4a, stem: 0x7fb060, daisy: true }, [.25, .4]],
  [/beet/, rosette, { ...ROOTTOP, leaf: 0x3f7a3a, tip: 0x5f9a4a, petC: 0xa82a48, rib: 0xb8405a, ribW: .07, root: { s: .1, color: 0x7a1f3f } }, [.2, .4]],
  [/radish/, rosette, { ...ROOTTOP, leaf: 0x4a9441, tip: 0x6fb257, petC: 0x8fbf70, root: { s: .085, color: 0xd42a4a } }, [.2, .4]],
  [/turnip|swede|kohlrabi/, rosette, { ...ROOTTOP, L: .46, leaf: 0x4a9441, tip: 0x6fb257, petC: 0x8fbf70, root: { s: .11, color: 0x9a5a9a } }, [.2, .4]],
  [/leek/, allium, { n: 8, L: .6, W: .09, fold: .35, droop: .5, fan: true, shank: .28, leaf: 0x3f7a62, tip: 0x5f9a7a }, [.15, .8]],
  [/garlic/, allium, { n: 6, L: .6, W: .045, fold: .4, droop: .4, spread: .5, leaf: 0x5a9a6a, tip: 0x8fb88a, bulb: 0xf2ede0, bulbS: .075, flop: true }, [.15, .6]],
  [/chive/, allium, { n: 22, L: .45, W: .014, fold: .9, droop: .25, spread: .6, leaf: 0x4f9a50, tip: 0x7fc070 }, [.15, .5]],
  [/onion|shallot/, allium, { n: 7, L: .65, W: .05, fold: .9, droop: .3, spread: .55, leaf: 0x4f8f72, tip: 0x7fb89a, bulb: 0xc9953f, bulbS: .1, flop: true }, [.15, .6]],
  [/pumpkin/, vine, { ...VINE, fruit: 0xe8792a, kind: "pumpkin", s: .17, count: 2 }, [.45, .3]],
  [/squash/, vine, { ...VINE, fruit: 0xe8b83a, kind: "pumpkin", s: .13, count: 2 }, [.45, .3]],
  [/zucchini|courgette/, vine, { ...VINE, L: .32, fruit: 0x2f6a30, kind: "long", s: .26, count: 3 }, [.45, .3]],
  [/cucumber/, vine, { ...VINE, L: .24, leaf: 0x3f8a3a, fruit: 0x3f8a3c, kind: "long", s: .2, count: 3 }, [.45, .3]],
  [/watermelon/, vine, { ...VINE, L: .26, wave: .5, fruit: 0x2f6a34, stripe: 0x8fc47a, kind: "melon", s: .15, count: 2 }, [.45, .3]],
  [/melon/, vine, { ...VINE, L: .26, fruit: 0xd9c88f, kind: "melon", s: .11, count: 2 }, [.45, .3]],
  [/broad bean|fava/, climber, { stems: 4, H: 1.15, lean: .12, gap: .16, L: .16, w: .55, leaf: 0x5f9a6a, stem: 0x7fa870, pod: 0x5f9a48, podS: .17, podUp: true, pods: 8, flower: 0xf4f0f4 }, [.25, 1.1]],
  [/lentil|chickpea/, climber, { stems: 9, H: .45, lean: .6, gap: .07, L: .07, w: .5, leaf: 0x6fa860, stem: 0x8fb870, pod: 0xa9c070, podS: .05, pods: 6 }, [.3, .4]],
  [/bean|pea/, climber, { poles: true, H: 1.9, gap: .17, L: .17, w: .7, leaf: 0x3f8a40, stem: 0x5f9a4a, pod: 0x4f9a40, podS: .15, pods: 10, flower: 0xfbfbf2 }, [.4, 1.9]],
  [/corn|maize/, corn, {}, [.25, 2]],
  [/wheat|barley|oat|rye|spelt/, grain, {}, [.2, 1]],
  [/sunflower/, sunflower, {}, [.25, 2.2]],
  [/lavender/, herb, { mode: "needles", stems: 16, H: .42, lean: .8, L: .11, leaf: 0x8fa392, tip: 0xb0c0b0, stem: 0x8a927a, stemR: .008, woody: true, gloss: .05, spike: { color: 0x7a68c8, n: 12, h: 1.9 } }, [.3, .4]],
  [/basil/, herb, { ...HERB, stems: 9, H: .56, lean: .55, gap: .085, L: .26, w: .66, fold: -.1, cupc: -.2, droop: .25, wide: .42, blunt: .6, leaf: 0x3a9440, tip: 0x6fc05a, stem: 0x5a9a48, stemR: .011, gloss: .55 }, [.3, .6]],
  [/parsley|coriander|cilantro/, herb, { mode: "divided", stems: 14, H: .5, lean: .75, L: .085, leaf: 0x3d8a38, stem: 0x6aa850, gloss: .3 }, [.25, .45]],
  [/sage/, herb, { ...HERB, stems: 8, H: .55, lean: .6, gap: .1, L: .2, w: .34, fold: .12, droop: .25, wide: .45, leaf: 0x86a488, tip: 0xa9bfa6, stem: 0x8a927a, stemR: .01, gloss: .06, flower: 0x8a78c8 }, [.3, .5]],
  [/mint/, herb, { ...HERB, stems: 10, H: .62, lean: .32, gap: .09, L: .14, w: .58, wide: .4, wave: .3, leaf: 0x3a8a48, tip: 0x62b062, gloss: .22 }, [.28, .6]],
  [/oregano|marjoram/, herb, { ...HERB, stems: 14, H: .4, lean: .75, gap: .055, L: .075, w: .7, fold: .1, droop: .15, wide: .45, rows: 3, leaf: 0x5a9150, tip: 0x7fb068, stem: 0x7a6a50, stemR: .006, gloss: .12, flower: 0xd9a8cc }, [.3, .35]],
  [/thyme/, herb, { ...HERB, stems: 26, H: .24, lean: 1.05, gap: .03, L: .075, w: .6, fold: .2, droop: .1, wide: .45, rows: 2, leaf: 0x6a8f62, tip: 0x8aa87a, stem: 0x7a6248, stemR: .005, woody: true, gloss: .08, flower: 0xd6b3e0 }, [.3, .25]],
  [/rosemary/, herb, { mode: "needles", stems: 9, H: .95, lean: .34, L: .12, leaf: 0x4a7a58, tip: 0x6a9272, stem: 0x7a6248, stemR: .012, woody: true, gloss: .12, flower: 0x9aa8e0 }, [.28, 1.0]],
  [/strawberry/, strawberry, { leaf: 0x3a8a3c, fruit: 0xd3241f }, [.3, .35]],
  [/raspberry/, caneberry, { leaf: 0x4a8f48, cane: 0x8a6a4a, fruit: 0xd3305a }, [.4, 1.4]],
  [/blackberry/, caneberry, { leaf: 0x3f8040, cane: 0x6a4a5a, fruit: 0x2a1f3a }, [.4, 1.4]],
  [/grape/, grape, { leaf: 0x4f9040, fruit: 0x4a2f6a }, [.45, 1.4]],
  [/asparagus/, asparagus, {}, [.25, .6]],
  [/artichoke/, artichoke, {}, [.4, .7]],
];
/* a crop with no entry of its own grows as a plain leafy rosette */
const GREENS = [null, rosette, { n: 12, L: .42, w: .6, wide: .48, blunt: .5, wave: .15, fold: .05, cupc: .2, droop: .3, out: .5, in: 1.2, shrink: .4, leaf: 0x3f8a40, tip: 0x6fb05a, gloss: .3, pet: .25, petR: .008, petC: 0x8fbf70 }, [.3, .4]];
export function realCrop(name = "") { const n = name.toLowerCase(), i = REAL.findIndex(([re]) => re.test(n)), e = i < 0 ? GREENS : REAL[i]; return { idx: i < 0 ? REAL.length : i, build: e[1], o: e[2], shade: e[3] }; }
/* quality per level of detail: full, garden, field, far */
export const REAL_Q = [1, .5, .25, .12, .08];
export function realGeometry(real, stage, lod) {
  const P = new PlantKit(REAL_Q[lod] ?? .08); real.build(P, real.o, stage);
  const [R, H] = real.shade, g = G[stage] || 1;
  // leaves near the stem and underneath sit in the plant's own shade
  return bakeShade(P.build(), (x, y, z, nx, ny) => (y < .02 ? 1 : (1 - .34 * (1 - smooth(.05, R * g, Math.hypot(x, z))) * (1 - smooth(H * g * .55, H * g, y))) * (1 - .2 * Math.max(0, -ny))));
}
