/* ═══════════════════════════════════════════
   CROWNS — foliage shapes for everything that is drawn as one mass of leaves:
   backdrop trees, shrubs and clipped hedges (the look-C plants have their own leaves).
   A crown is a ball pushed out into billows: the outer skin of a cluster of overlapping
   spheres, flatter underneath. A hedge is a clipped run that swells and dips a little.
   Shade is baked per vertex and carried in uv.x as 2 + shade (uv survives bake(); the
   `hedge` surface in toy.js reads it; ordinary shapes have uv.x <= 1 and are left alone).
   Rules: docs/MAP_STYLE.md §12.   MARKER: GROVE_CROWNS_V1
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DETAIL } from "./toy";
import { srand } from "./sceneMath";

/* sx, sy: proportions. lobes: billows. lo: how far down the sides they start (-1 bottom, 1 top).
   off / size: how far out a billow sits and how big it is, in crown radii. base: where the underside is cut flat. */
const HABIT = {
  round: { sx: 1, sy: .9, lobes: 11, lo: -.2, off: [.4, .56], size: [.46, .62], base: -.3 },
  wide: { sx: 1.2, sy: .68, lobes: 12, lo: -.05, off: [.46, .62], size: [.42, .56], base: -.22 },
  tall: { sx: .8, sy: 1.28, lobes: 12, lo: -.45, off: [.36, .5], size: [.44, .58], base: -.5 },
  shrub: { sx: 1.1, sy: .82, lobes: 6, lo: .05, off: [.34, .48], size: [.5, .64], base: -.18 },
};
export const CROWN_HABITS = Object.keys(HABIT);
// triangle budget [full detail, phone farm tier]; an icosphere of detail n has 20 (n + 1)² triangles
export const CROWN_TRIS = { tree: [1280, 500], shrub: [320, 180] };
const DETAILS = { tree: [7, 4], shrub: [3, 2] };
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const cache = new Map();

export function crownGeo(habit = "round", variant = 0) {
  const H = HABIT[habit] || HABIT.round, kind = habit === "shrub" ? "shrub" : "tree", detail = DETAILS[kind][DETAIL.value >= 1 ? 0 : 1];
  const key = `${habit}|${variant}|${detail}`; let geo = cache.get(key); if (geo) return geo;
  const seed = CROWN_HABITS.indexOf(habit) * 97 + variant * 31 + 5, lobes = [];
  for (let k = 0; k < H.lobes; k++) { // billows spiralled over the top and sides, each a sphere set a little way out from the middle
    const y = H.lo + (1 - H.lo) * ((k + .5) / H.lobes), a = k * 2.39996 + srand(seed + k) * 1.1, rr = Math.sqrt(Math.max(0, 1 - y * y));
    const off = H.off[0] + (H.off[1] - H.off[0]) * srand(seed + k * 3 + 1), size = H.size[0] + (H.size[1] - H.size[0]) * srand(seed + k * 5 + 2);
    lobes.push([Math.cos(a) * rr * off, y * off, Math.sin(a) * rr * off, off * off - size * size]);
  }
  const ico = new THREE.IcosahedronGeometry(1, detail), bare = new THREE.BufferGeometry(); bare.setAttribute("position", ico.attributes.position.clone()); ico.dispose();
  geo = mergeVertices(bare, 1e-4); bare.dispose();
  const p = geo.attributes.position, n = p.count, crease = new Float32Array(n); let far = 0;
  for (let i = 0; i < n; i++) {
    const dx = p.getX(i), dy = p.getY(i), dz = p.getZ(i); let r1 = .6, r2 = 0; // .6: the core, so every direction has a surface
    for (const [lx, ly, lz, c] of lobes) { const b = dx * lx + dy * ly + dz * lz, disc = b * b - c; if (disc < 0) continue; const t = b + Math.sqrt(disc); if (t > r1) { r2 = r1; r1 = t; } else if (t > r2) r2 = t; }
    crease[i] = smooth(0, .15, r1 - r2); // 0 in the folds between two billows
    const r = r1 * (1 + (srand(seed + i * 7.3) - .5) * .05); far = Math.max(far, r); p.setXYZ(i, dx * r, dy * r, dz * r);
  }
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < n; i++) { let y = p.getY(i) / far; if (y < H.base) y = H.base + (y - H.base) * .35; y *= H.sy; p.setXYZ(i, p.getX(i) / far * H.sx, y, p.getZ(i) / far * H.sx); lo = Math.min(lo, y); hi = Math.max(hi, y); }
  const uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { const h = (p.getY(i) - lo) / (hi - lo); uv[i * 2] = 2 + (.6 + .4 * crease[i]) * (.62 + .5 * smooth(0, 1, h)); uv[i * 2 + 1] = h; }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.computeVertexNormals(); geo.userData.shared = true; cache.set(key, geo);
  return geo;
}

/* One clipped hedge run along x, centred, standing on y = 0: battered sides, rounded shoulders, a gently domed top,
   quarter-domed ends. It swells and dips by a few per cent so no two metres are the same. Built per run, not cached. */
const PROFILE = [[1.04, 0], [1.02, .34], [.97, .68], [.84, .9], [.55, 1], [0, 1.03]]; // half section: (z in half thicknesses, y in heights)
const wave = (x, seed) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return srand(seed + i * 13.7) * (1 - u) + srand(seed + (i + 1) * 13.7) * u; };
export function hedgeGeo(len, h, t, seed = 1) {
  const cap = t * .5, total = len + t * .5, step = DETAIL.value >= 1 ? .5 : .9, rings = Math.max(4, Math.ceil(total / step)) + 1;
  const section = [...PROFILE.map(([z, y]) => [z, y]), ...PROFILE.slice(0, -1).reverse().map(([z, y]) => [-z, y])], m = section.length;
  const pos = new Float32Array(rings * m * 3), uv = new Float32Array(rings * m * 2), idx = [];
  for (let i = 0; i < rings; i++) {
    const x = -total / 2 + total * i / (rings - 1), e = Math.min(x + total / 2, total / 2 - x), f = e >= cap ? 1 : Math.sqrt(Math.max(0, 1 - (1 - e / cap) ** 2));
    const tall = 1 + (wave(x * .55, seed) - .5) * .12, fat = 1 + (wave(x * .8 + 40, seed) - .5) * .18, tone = .95 + wave(x * .35 + 80, seed) * .1;
    for (let j = 0; j < m; j++) {
      const [z, y] = section[j], o = (i * m + j) * 3, bulge = 1 + (wave(x * 1.1 + j * 3.1, seed + 9) - .5) * .08 * y;
      pos[o] = x; pos[o + 1] = y * h * tall * (.25 + .75 * f) * (y > 0 ? 1 : 0); pos[o + 2] = z * t / 2 * fat * bulge * f;
      uv[(i * m + j) * 2] = 2 + (.76 + .34 * smooth(0, 1, y)) * tone; uv[(i * m + j) * 2 + 1] = y;
    }
    if (i) for (let j = 0; j < m - 1; j++) { const a = (i - 1) * m + j, b = i * m + j; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
