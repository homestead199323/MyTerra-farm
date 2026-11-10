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
function pepperFruit(P, p, s, color, { lobes = 3, yaw = 0, tilt = 0, hot = false } = {}) {
  const c = new THREE.Color(color), groove = c.clone().multiplyScalar(.74), hi = c.clone().lerp(new THREE.Color(0xffffff), .12);
  if (hot) P.lathe(CHILLI, c, { pos: p, rot: [tilt + .25, yaw, 0], scale: s * 2.2, seg: 9, rings: 8, surf: SKIN });
  else P.lathe(BELL, c, { pos: p, rot: [tilt, yaw, 0], scale: s * 2, lobes, amp: .11, lobeAt: (t) => .35 + .65 * t, seg: 14, rings: 10, surf: SKIN, paint: (x, y, z, c0) => { const k = Math.cos(lobes * (Math.atan2(z - p[2], x - p[0]) - yaw)); return c0.clone().lerp(groove, clamp01(-k) * .5).lerp(hi, clamp01(k) * .3); } });
  P.cyl(s * .26, s * (hot ? .4 : .5), s * .18, 0x4f8a3e, { pos: [p[0], p[1] + s * .06, p[2]], seg: 8, surf: STEM }); calyx(P, [p[0], p[1] + s * .1, p[2]], s, yaw);
}
function pepper(P, o, st) {
  const g = G[st], r = rng(31), full = st >= 4 ? 3 : st === 3 ? 2 : 1, levels = Math.min(P.q >= .9 ? 3 : P.lite ? 1 : 2, full), reach = 1 + .4 * (full - levels), segs = []; // a lighter model forks less and reaches further with each fork
  if (st >= 3) cane(P, 1.3 * g, .075);
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
      const t = depth === 0 ? .55 + k * .2 : (k + .6) / n, base = mix3(a, b, Math.min(1, t)), ya = depth === 0 ? k * 2.2 + 1 : yaw + (k % 2 ? 1 : -1) * (1.15 + r() * .6), L = LL[depth] * (.85 + r() * .3) * (g * .6 + .4), old = depth === 0 && k === 0 && st === 5;
      const pe = [base[0] + Math.sin(ya) * .06, base[1] + .02, base[2] + Math.cos(ya) * .06]; if (P.q >= .45) P.stem(base, pe, .0065, .005, o.stem, { seg: 4, surf: STEM });
      P.blade(L, L * .52, old ? 0x8f9a3a : tone(o.leaf, r), { pos: pe, rot: [-.12 + r() * .42, ya, (r() - .5) * .5], fold: .24, droop: .1 + r() * .18, wide: .36, rows: 5, wave: .12, tip: old ? 0xb9a94a : null, surf: [SURF.leaf, .34] });
      if (depth > 0 && depth < 3 && k === 1) fruits.push([base, Math.atan2(base[0], base[2]) + (r() - .5) * .8]);
    }
    if (depth === levels) for (let k = 0; k < P.n(3, 2); k++) P.blade((.15 + r() * .04) * (g * .6 + .4), .08, 0x56a24e, { pos: b, rot: [-.6 + r() * .35, yaw + k * 2.1 + r(), 0], droop: .12, fold: .3, rows: 4, tip: 0x84c66a, surf: [SURF.leaf, .36] });
  });
  if (st < 4) return;
  const ripe = st === 5, cols = o.fruit, hot = !!o.hot;
  fruits.slice(0, P.n(hot ? 9 : 7, 3)).forEach(([b, a], i) => {
    const col = cols[i % cols.length], green = !ripe || (i % 3 === 1 && !hot), s = (green ? .058 : .076 + r() * .008) * (hot ? .62 : 1), k1 = [b[0] + Math.sin(a) * .075, b[1] + .005, b[2] + Math.cos(a) * .075], p = [b[0] + Math.sin(a) * .13, b[1] - .07, b[2] + Math.cos(a) * .13];
    P.stem(b, k1, .0085, .0085, 0x4a8a3c, { seg: 4, surf: STEM }); P.stem(k1, p, .0085, .011, 0x4a8a3c, { seg: 4, surf: STEM });
    pepperFruit(P, p, s, green ? 0x2f7d35 : col, { lobes: i % 2 ? 4 : 3, yaw: a, tilt: (r() - .5) * .3, hot });
  });
  if (P.q >= .45) segs.filter((q) => q.depth === levels).slice(1, 5).forEach(({ b }, i) => { if (i % 2 === 0) flower(P, [b[0] + .03, b[1] - .02, b[2] + .03], .034); });
}

/* ---------- rosettes: lettuce, spinach, chard, kale, radish tops ---------- */
function rosette(P, o, st) {
  const g = G[st], r = rng(o.seed || 5), n = P.n(o.n * (st === 2 ? .45 : st === 3 ? .75 : 1), st === 2 ? 4 : 6);
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1), yaw = i * GA + r() * .3, L = o.L * g * (1 - t * o.shrink) * (.9 + r() * .2), up = o.out + (o.in - o.out) * Math.pow(t, .8) + (r() - .5) * .12;
    const col = tone(o.leaf, r, .08).lerp(new THREE.Color(o.tip), t * .75), pet = (o.pet || 0) * L, d = dir(yaw, HPI - up), base = [d[0] * .02, .02 + t * .03 * g, d[2] * .02], pe = [base[0] + d[0] * pet, base[1] + d[1] * pet, base[2] + d[2] * pet];
    if (pet > 0) P.stem(base, pe, o.petR * g + .004, o.petR * g * .7 + .003, o.petC, { seg: 5, surf: [SURF.plain, .3] });
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

/* ---------- the list: first match wins. `shade` = [radius, height] of the plant's own shadow inside itself ---------- */
const NS = { leaf: 0x2e7a3a, stem: 0x4a7f3e };
const REAL = [
  [/tomato/, tomato, { ...NS, leaf: 0x357f3c, fruit: 0xd3261f }, [.4, 1.9]],
  [/pepper \(hot\)|chilli|chili/, pepper, { ...NS, fruit: [0xc92118, 0xc92118, 0xd9601c], hot: true }, [.42, 1.1]],
  [/pepper|capsicum/, pepper, { ...NS, fruit: [0xc42a23, 0xd9a521, 0xc42a23, 0xcf5b1f] }, [.42, 1.1]],
  [/lettuce|endive|lamb/, rosette, { n: 28, L: .48, w: .95, wide: .6, blunt: .4, wave: .22, waveN: 4, fold: .05, cupc: .3, cup: .7, droop: .3, out: .3, in: 1.42, shrink: .62, leaf: 0x6fb04a, tip: 0xd2ec98, gloss: .24, rows: 9 }, [.3, .4]],
  [/rocket|arugula/, rosette, { n: 14, L: .46, w: .3, wide: .62, wave: .5, waveN: 7, fold: .15, droop: .3, out: .55, in: 1.25, shrink: .4, leaf: 0x3f8a3c, tip: 0x62a84e, gloss: .2, pet: .2, petR: .006, petC: 0x8fbf70, bolt: true }, [.28, .4]],
  [/spinach/, rosette, { n: 14, L: .4, w: .7, wide: .46, blunt: .5, wave: .1, fold: .05, cupc: .28, droop: .3, out: .45, in: 1.2, shrink: .45, leaf: 0x2a7235, tip: 0x4c9846, gloss: .42, pet: .34, petR: .009, petC: 0x7fb866 }, [.3, .4]],
  [/chard/, rosette, { n: 10, L: .68, w: .5, wide: .44, blunt: .55, wave: .2, waveN: 4, fold: .12, cupc: .15, droop: .32, out: .8, in: 1.38, shrink: .35, leaf: 0x276a33, tip: 0x3f8a40, gloss: .46, pet: .42, petR: .017, petC: 0xc8323a, rib: 0xd2424a, ribW: .09, rows: 9 }, [.3, .9]],
  [/kale/, rosette, { n: 13, L: .66, w: .4, wide: .5, blunt: .5, wave: .55, waveN: 6, fold: .1, cupc: .12, droop: .3, out: .6, in: 1.32, shrink: .35, leaf: 0x3c6b5e, tip: 0x6a9a82, gloss: .14, pet: .3, petR: .012, petC: 0x9fb58a, rib: 0xa9c2a0, ribW: .06, rows: 14 }, [.3, .8]],
  [/radish/, rosette, { n: 8, L: .4, w: .46, wide: .62, blunt: .5, wave: .16, waveN: 4, fold: .1, cupc: .12, droop: .28, rows: 8, out: .7, in: 1.25, shrink: .3, leaf: 0x4a9441, tip: 0x6fb257, gloss: .2, pet: .3, petR: .007, petC: 0x8fbf70, root: { s: .085, color: 0xd42a4a } }, [.2, .4]],
  [/basil/, herb, { mode: "pairs", stems: 9, H: .56, lean: .55, gap: .085, L: .26, w: .66, fold: -.1, cupc: -.2, droop: .25, wide: .42, blunt: .6, leaf: 0x3a9440, tip: 0x6fc05a, stem: 0x5a9a48, stemR: .011, gloss: .55 }, [.3, .6]],
  [/parsley|coriander|cilantro/, herb, { mode: "divided", stems: 14, H: .5, lean: .75, L: .085, leaf: 0x3d8a38, stem: 0x6aa850, gloss: .3 }, [.25, .45]],
  [/sage/, herb, { mode: "pairs", stems: 8, H: .55, lean: .6, gap: .1, L: .2, w: .34, fold: .12, droop: .25, wide: .45, leaf: 0x86a488, tip: 0xa9bfa6, stem: 0x8a927a, stemR: .01, gloss: .06, flower: 0x8a78c8 }, [.3, .5]],
  [/mint/, herb, { mode: "pairs", stems: 10, H: .62, lean: .32, gap: .09, L: .14, w: .58, fold: .15, droop: .2, wide: .4, wave: .3, leaf: 0x3a8a48, tip: 0x62b062, stem: 0x6a8a52, stemR: .008, gloss: .22 }, [.28, .6]],
  [/oregano|marjoram/, herb, { mode: "pairs", stems: 14, H: .4, lean: .75, gap: .055, L: .075, w: .7, fold: .1, droop: .15, wide: .45, rows: 3, leaf: 0x5a9150, tip: 0x7fb068, stem: 0x7a6a50, stemR: .006, gloss: .12, flower: 0xd9a8cc }, [.3, .35]],
  [/thyme/, herb, { mode: "pairs", stems: 26, H: .24, lean: 1.05, gap: .03, L: .075, w: .6, fold: .2, droop: .1, wide: .45, rows: 2, leaf: 0x6a8f62, tip: 0x8aa87a, stem: 0x7a6248, stemR: .005, woody: true, gloss: .08, flower: 0xd6b3e0 }, [.3, .25]],
  [/rosemary/, herb, { mode: "needles", stems: 9, H: .95, lean: .34, L: .12, leaf: 0x4a7a58, tip: 0x6a9272, stem: 0x7a6248, stemR: .012, woody: true, gloss: .12, flower: 0x9aa8e0 }, [.28, 1.0]],
  [/strawberry/, strawberry, { leaf: 0x3a8a3c, fruit: 0xd3241f }, [.3, .35]],
];
export function realCrop(name = "") { const n = name.toLowerCase(), i = REAL.findIndex(([re]) => re.test(n)); return i < 0 ? null : { idx: i, build: REAL[i][1], o: REAL[i][2], shade: REAL[i][3] }; }
/* quality per level of detail: full, garden, field, far */
export const REAL_Q = [1, .5, .25, .12, .08];
export function realGeometry(real, stage, lod) {
  const P = new PlantKit(REAL_Q[lod] ?? .08); real.build(P, real.o, stage);
  const [R, H] = real.shade, g = G[stage] || 1;
  // leaves near the stem and underneath sit in the plant's own shade
  return bakeShade(P.build(), (x, y, z, nx, ny) => (y < .02 ? 1 : (1 - .34 * (1 - smooth(.05, R * g, Math.hypot(x, z))) * (1 - smooth(H * g * .55, H * g, y))) * (1 - .2 * Math.max(0, -ny))));
}
