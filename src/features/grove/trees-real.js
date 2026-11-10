/* ═══════════════════════════════════════════
   TRUE-TO-LIFE FRUIT AND NUT TREES ("look C", docs/MAP_STYLE.md §10). One model per species, built in
   units of the crown's radius (the map scales it by the tree's size and growth stage): a barked trunk
   that forks into limbs, a crown of separate leaves over darker inner masses, fruit hanging under the
   foliage in the harvest window. Each species has its own habit: an apple spreads, a pear stands up,
   an olive is gnarled and silver, a fig is low with huge leaves, hazel and pomegranate are shrubs.
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { PlantKit, SURF, rng } from "./plantkit";

const HPI = Math.PI / 2, GA = 2.39996, BARK = [SURF.bark, .05];
const clamp01 = (v) => Math.max(0, Math.min(1, v)), smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const dir = (yaw, tilt) => [Math.sin(yaw) * Math.sin(tilt), Math.cos(tilt), Math.cos(yaw) * Math.sin(tilt)];
const PROFILE = {
  apple: [[.02, .03], [.2, .09], [.42, 0], [.5, -.22], [.47, -.48], [.36, -.72], [.2, -.84], [.03, -.8]],
  pear: [[.02, 0], [.14, .03], [.2, -.2], [.3, -.5], [.42, -.8], [.36, -1.05], [.12, -1.18]],
  lemon: [[.02, .08], [.12, .02], [.36, -.2], [.42, -.5], [.34, -.82], [.12, -1.0], [.03, -1.1]],
  fig: [[.03, 0], [.1, -.1], [.2, -.4], [.42, -.8], [.4, -1.0], [.2, -1.15], [.03, -1.18]],
};
function fruitOn(P, o, p, r) {
  const f = o.fruit, s = f.s * (.85 + r() * .3), c = new THREE.Color(f.color), yaw = r() * 6.28;
  if (PROFILE[f.kind]) P.lathe(PROFILE[f.kind], c, { pos: p, scale: s * 2.2, seg: 10, rings: 7, surf: [SURF.fruit, f.gloss ?? .9], paint: f.cheek != null ? (x, y, z, c0) => c0.clone().lerp(new THREE.Color(f.cheek), smooth(.1, .9, Math.cos(Math.atan2(z - p[2], x - p[0]) - yaw) * .5 + .5) * .7) : null });
  else P.sphere(f.kind === "oval" ? [s * .8, s * 1.15, s * .8] : [s, s * (f.flat || 1), s], c, { pos: [p[0], p[1] - s, p[2]], seg: f.s < .03 ? 6 : 8, rings: f.s < .03 ? 4 : 6, surf: [SURF.fruit, f.gloss ?? .8] });
  if (f.crown && P.q >= .45) P.cyl(s * .3, s * .18, s * .3, c, { pos: [p[0], p[1] - s * 2.05, p[2]], seg: 6, surf: [SURF.fruit, .3] });
  if (P.q >= .45 && f.s >= .03) P.stem([p[0], p[1] - s * .05, p[2]], [p[0] + .004, p[1] + s * .8, p[2]], s * .07, s * .07, 0x6b4a2f, { seg: 4 });
}
function orchardTree(P, o, fruiting) {
  const r = rng(o.seed), stems = o.stems || 1, forks = [], ends = [], R = o.R, tr = o.tr;
  if (P.q >= .45) for (let i = 0; i < 5; i++) { const a = i * 1.257 + .4 + r() * .3; P.sphere([tr * .7, tr * .5, tr * 1.8], o.bark, { pos: [Math.cos(a) * tr * .9, tr * .25, Math.sin(a) * tr * .9], rot: [0, -a + HPI, 0], seg: 8, rings: 6, surf: BARK }); } // root flare
  for (let s = 0; s < stems; s++) {
    const a = s * GA + .3, d = dir(a, stems > 1 ? .3 + r() * .15 : (r() - .5) * .1), w = stems > 1 ? tr * .62 : tr, base = stems > 1 ? [Math.sin(a) * tr * .5, 0, Math.cos(a) * tr * .5] : [0, 0, 0];
    const mid = [base[0] + d[0] * o.H * .5 + (r() - .5) * .07 * (o.gnarl || 1), d[1] * o.H * .5, base[2] + d[2] * o.H * .5 + (r() - .5) * .07 * (o.gnarl || 1)], top = [base[0] + d[0] * o.H, d[1] * o.H, base[2] + d[2] * o.H];
    P.stem(base, mid, w * 1.1, w * .9, o.bark, { seg: 10, surf: BARK }); P.stem(mid, top, w * .9, w * .78, o.bark, { seg: 10, surf: BARK }); P.sphere(w * .92, o.bark, { pos: mid, seg: 8, rings: 6, surf: BARK }); P.sphere(w * .86, o.bark, { pos: top, seg: 8, rings: 6, surf: BARK });
    if (o.gnarl > 1.5 && P.q >= .45) P.sphere([w * .5, w * .4, w * .4], o.bark, { pos: [mid[0] + w * .8, mid[1] * .7, mid[2]], seg: 7, rings: 5, surf: BARK }); // a burr on an old trunk
    forks.push([top, w]);
  }
  forks.forEach(([f, w], fi) => { const n = Math.ceil(o.limbs / stems); for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + fi * 1.3 + r() * .5, d = dir(a, o.up + (r() - .5) * .2), len = R * (.55 + r() * .2), e = [f[0] + d[0] * len, f[1] + d[1] * len, f[2] + d[2] * len]; P.stem(f, e, w * .55, w * .22, o.bark, { seg: 6, surf: BARK }); ends.push(e); } });
  // the crown: a mass at each limb end, a layer above, one on top
  const yTop = o.H + R * o.tall, lumps = ends.map((e) => [e[0], e[1] + R * .08, e[2], R * (.42 + r() * .1)]);
  for (let i = 0; i < o.top; i++) { const a = i * (6.283 / o.top) + .8; lumps.push([Math.cos(a) * R * .36, o.H + R * o.tall * (.72 + r() * .12), Math.sin(a) * R * .36, R * (.44 + r() * .08)]); }
  lumps.push([0, yTop, 0, R * .46]);
  lumps.forEach(([x, y, z, rr], li) => P.lump(rr * (P.lite ? 1 : P.q < .9 ? .86 : .72), P.lite ? o.leaf[li % o.leaf.length] : o.inner, { pos: [x, y, z], seed: li * 2.3 + o.seed, amp: .16 }));
  // separate leaves standing proud of the masses: darker deep inside and underneath, lighter where the sun lands
  const cc = [0, o.H + R * o.tall * .5, 0], per = P.n(o.dens * 1.25, 6), dark = new THREE.Color(o.inner).multiplyScalar(.6), sun = new THREE.Color(o.sun ?? 0x86b54a);
  lumps.forEach(([x, y, z, rr], li) => { for (let k = 0; k < per; k++) {
    const a = r() * 6.28, b = Math.min(1.5, -.6 + r() * 2.1), cb = Math.cos(b), sb = Math.sin(b), rad = rr * (.82 + r() * .22), p = [x + Math.cos(a) * cb * rad, y + sb * rad * .86, z + Math.sin(a) * cb * rad];
    const out = Math.hypot(p[0] - cc[0], (p[1] - cc[1]) * 1.2, p[2] - cc[2]) / R, deep = (1 - smooth(.6, 1.05, out)) * .32 + (sb < 0 ? -sb * .26 : 0), col = new THREE.Color(o.leaf[(li + k) % o.leaf.length]).lerp(dark, Math.min(.45, deep));
    if (sb > .45 && out > .8) col.lerp(sun, .3 + r() * .2);
    P.blade(o.L * (.95 + r() * .4), o.L * o.w * 1.1, col, { pos: p, rot: [.2 + r() * .55 - sb * .95 + (o.hang || 0), HPI - a + (r() - .5) * 1.3, (r() - .5) * .7], droop: o.droop ?? .2, fold: .2, rows: 3, cols: o.L > .28 ? 5 : 3, wave: o.wave ?? .1, waveN: 5, wide: o.wide ?? .42, blunt: o.blunt ?? .7, surf: [SURF.leaf, o.gloss ?? .3] });
  } });
  if (!fruiting || !o.fruit) return;
  const n = P.n(o.fruit.n, 6);
  for (let i = 0; i < n; i++) { const [x, y, z, rr] = lumps[i % ends.length], a = Math.atan2(z, x) + (r() - .5) * 2.4, b = -.7 + r() * 1.0, rad = rr * 1.03; fruitOn(P, o, [x + Math.cos(a) * Math.cos(b) * rad, y + Math.sin(b) * rad * .86 - .02, z + Math.sin(a) * Math.cos(b) * rad], r); }
}

/* ---------- the species. Lengths are in crown radii: H trunk to the fork, R crown radius, tall crown height / radius ---------- */
const BASE = { seed: 9, H: .78, R: 1.05, tall: .9, tr: .12, limbs: 5, up: 1.0, top: 3, bark: 0x6d4a31, inner: 0x3b6b2c, leaf: [0x4c8836, 0x5a963d, 0x437a31, 0x66a244], L: .2, w: .5, dens: 44 };
const SPECIES = {
  apple: { ...BASE, fruit: { kind: "apple", color: 0xc5312a, cheek: 0xb9c653, s: .042, n: 26 } },
  pear: { ...BASE, seed: 11, R: .82, tall: 1.35, up: .62, leaf: [0x3f7a35, 0x4a883a, 0x376e30], gloss: .45, L: .18, fruit: { kind: "pear", color: 0xc9c65a, s: .04, n: 20 } },
  quince: { ...BASE, seed: 13, R: .92, H: .68, leaf: [0x5a8a4a, 0x6a9a58, 0x4f7f42], L: .18, w: .7, blunt: .5, gloss: .12, fruit: { kind: "pear", color: 0xe0cc50, s: .046, n: 14, gloss: .4 } },
  peach: { ...BASE, seed: 15, up: .85, leaf: [0x4f8f3f, 0x5c9c46, 0x448238], L: .27, w: .22, hang: .3, droop: .45, dens: 50, fruit: { kind: "round", color: 0xf09a62, s: .044, n: 22, gloss: .2 } },
  apricot: { ...BASE, seed: 17, R: 1.0, leaf: [0x4f8a3a, 0x5d9842, 0x437c33], L: .16, w: .8, blunt: .5, fruit: { kind: "round", color: 0xf2a044, s: .034, n: 26, gloss: .3 } },
  plum: { ...BASE, seed: 19, R: .95, tall: 1.0, leaf: [0x457f36, 0x528d3c, 0x3b7230], L: .17, fruit: { kind: "oval", color: 0x5a3a82, s: .032, n: 28, gloss: .5 } },
  cherry: { ...BASE, seed: 21, R: .95, tall: 1.12, up: .8, leaf: [0x3f7f36, 0x4c8d3c, 0x367230], L: .21, w: .42, hang: .35, droop: .4, fruit: { kind: "round", color: 0xb8182a, s: .023, n: 44, gloss: .95 } },
  almond: { ...BASE, seed: 23, up: .8, R: .95, leaf: [0x5a8f4a, 0x689c54, 0x4e8240], L: .22, w: .2, hang: .2, droop: .35, dens: 50, fruit: { kind: "oval", color: 0x9bb067, s: .026, n: 24, gloss: .1 } },
  lemon: { ...BASE, seed: 25, H: .55, R: .88, tall: 1.0, limbs: 6, inner: 0x24552a, leaf: [0x2f6a34, 0x3a7a3c, 0x285e30], sun: 0x5f9a48, gloss: .6, L: .17, dens: 56, bark: 0x7a6a4a, fruit: { kind: "lemon", color: 0xf2d430, s: .04, n: 24, gloss: .5 } },
  orange: { ...BASE, seed: 27, H: .55, R: .9, tall: 1.0, limbs: 6, inner: 0x24552a, leaf: [0x2f6a34, 0x3a7a3c, 0x285e30], sun: 0x5f9a48, gloss: .6, L: .17, dens: 56, bark: 0x7a6a4a, fruit: { kind: "round", color: 0xf08a22, s: .045, n: 24, gloss: .5 } },
  fig: { ...BASE, seed: 29, stems: 3, H: .5, R: 1.15, tall: .72, tr: .13, up: 1.15, top: 2, bark: 0xa39a8a, inner: 0x35682c, leaf: [0x3f7f3a, 0x4a8c40, 0x377334], L: .36, w: .95, wave: .5, blunt: .45, wide: .5, gloss: .2, dens: 18, fruit: { kind: "fig", color: 0x5a3458, s: .034, n: 16, gloss: .4 } },
  olive: { ...BASE, seed: 31, H: .62, R: 1.0, tall: .95, tr: .17, gnarl: 2.2, limbs: 6, bark: 0x7a6c5a, inner: 0x566a48, leaf: [0x7d916a, 0x8fa07a, 0x6f8560, 0x9aac86], sun: 0xb9c6a0, L: .17, w: .22, gloss: .25, dens: 64, fruit: { kind: "oval", color: 0x2f2a3a, s: .017, n: 40, gloss: .6 } },
  walnut: { ...BASE, seed: 33, H: 1.0, R: 1.15, tall: 1.15, tr: .15, limbs: 6, leaf: [0x4f8a3a, 0x5c9842, 0x437c33], L: .3, w: .4, droop: .4, hang: .2, dens: 36, bark: 0x8a8478, fruit: { kind: "round", color: 0x7f9a55, s: .04, n: 18, gloss: .15 } },
  chestnut: { ...BASE, seed: 35, H: .95, R: 1.2, tall: 1.1, tr: .16, limbs: 6, leaf: [0x457f33, 0x528d3a, 0x3b722e], L: .33, w: .3, wave: .4, droop: .35, dens: 36, fruit: { kind: "round", color: 0x9aa84a, s: .045, n: 18, gloss: .05 } },
  hazelnut: { ...BASE, seed: 37, stems: 5, H: .45, R: .95, tall: 1.0, tr: .1, up: .75, top: 2, leaf: [0x4f8a3c, 0x5c9844, 0x437c35], L: .18, w: .85, blunt: .45, wave: .3, dens: 34, fruit: { kind: "round", color: 0xb08a5a, s: .024, n: 22, gloss: .2 } },
  persimmon: { ...BASE, seed: 39, R: .95, tall: 1.05, leaf: [0x3a7a34, 0x47883a, 0x316e2e], L: .23, w: .6, gloss: .55, fruit: { kind: "round", color: 0xf07a2e, flat: .85, s: .046, n: 20, gloss: .6 } },
  pomegranate: { ...BASE, seed: 41, stems: 4, H: .5, R: .85, tall: 1.0, tr: .1, up: .8, top: 2, leaf: [0x4f8f3a, 0x5c9c42, 0x438234], L: .12, w: .28, gloss: .5, dens: 60, fruit: { kind: "round", color: 0xc23232, s: .05, n: 12, gloss: .5, crown: true } },
  avocado: { ...BASE, seed: 43, H: .9, R: 1.0, tall: 1.3, tr: .14, up: .7, inner: 0x24552a, leaf: [0x2f6f33, 0x3a7d3a, 0x28632e], L: .28, w: .45, droop: .4, gloss: .5, dens: 40, fruit: { kind: "pear", color: 0x2f4a2a, s: .048, n: 14, gloss: .3 } },
};
SPECIES.citrus = SPECIES.orange;
export const TREE_Q = [1, .5, .25, .12, .08];
/* how many trees share the map decides how much each one may cost */
export function treeTier(count, phone) { return Math.min(4, (count > 60 ? 4 : count > 24 ? 3 : count > 10 ? 2 : count > 4 ? 1 : 0) + (phone ? 1 : 0)); }
export function treeGeometry(key, fruiting, tier) { const P = new PlantKit(TREE_Q[tier] ?? .08); orchardTree(P, SPECIES[key] || SPECIES.apple, fruiting); return P.build(); }
export const TREE_SPECIES = Object.keys(SPECIES);
