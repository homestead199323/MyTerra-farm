/* ═══════════════════════════════════════════
   CROPS 3D — every crop on the map is a plant model built from geometry (no cut-out artwork),
   shaped by its growth stage: a sprout, a seedling, a growing plant, a maturing plant with green
   fruit, and the harvest-window plant carrying ripe fruit in full colour. The models themselves
   are in crops-real.js (look C, docs/MAP_STYLE.md §10); this file caches one geometry per crop,
   stage and level of detail, instances it across the farm scaled by the real spacing, and owns
   the material: leaves sway in the vertex shader from the shared clock.
   MARKER: GROVE_CROPS_3D_V1
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { Parts, WIND, DETAIL } from "./toy";
import { plantMaterials, plainSurface } from "./plantkit";
import { realCrop, realGeometry } from "./crops-real";

import { cropFamily } from "./crop-families";
export { cropFamily };

/* ---------- the plant models live in crops-real.js; only the seedling is built here ---------- */
function sprout(P) { // stage 1 (sown): a seedling pair of leaves at the soil
  P.stem([0, 0, 0], [0, .08, 0], .012, .01, 0x8fd47a, { seg: 5 });
  [-1, 1].forEach((s) => P.sphere([.055, .02, .035], 0x9ddc88, { pos: [s * .045, .085, 0], rot: [0, 0, s * .5], seg: 7, rings: 5 }));
}

/* ---------- geometry cache: one buffer per crop family entry and stage ---------- */
const cache = new Map();
/* `tier` is the level of detail for the true-to-life models (crops-real.js): 0 a few plants seen close, up to 4 a
   whole field. Older family models keep their own three levels (`lod`). */
export function cropGeometry(name, stage, tier = 0) {
  const st = Math.max(1, Math.min(5, stage)), key = cropKey(name, st, tier);
  if (cache.has(key)) return cache.get(key);
  let g;
  if (st === 1) { const P = new Parts(); P.detail = tier >= 3 ? .5 : tier >= 1 ? .66 : 1; sprout(P); g = plainSurface(P.build()); }
  else g = realGeometry(realCrop(name), st, tier);
  g.userData.shared = true; cache.set(key, g); return g; // shared across world rebuilds
}
export function cropKey(name, stage, tier = 0) { const st = Math.max(1, Math.min(5, stage)); return st === 1 ? `sprout|${tier >= 3 ? 2 : tier >= 1 ? 1 : 0}` : `real${realCrop(name).idx}|${st}|${tier}`; }
/* how many plants share the map decides how much each one may cost (budgets in docs/MAP_STYLE.md §9) */
export function cropTier(count, phone) { return Math.min(4, (count > 900 ? 4 : count > 300 ? 3 : count > 90 ? 2 : count > 24 ? 1 : 0) + (phone ? 1 : 0)); }
/* the model space is a unit footprint; scale by the plant's real spread in metres */
const SCALE_CAP = { stalk: .55, climber: .55, bush: .7, vine: .95, berry: .7, head: .8, spears: .6, rhubarb: .9, artichoke: .9 };
export function cropScale(size, stage, name = "") { // plants spill a little over their spacing (lush, not sparse), tall crops never balloon with wide spacing
  const cap = SCALE_CAP[cropFamily(name).family] || .8;
  return Math.min(cap, Math.max(.14, size) * 1.3) * (stage === 1 ? 1.25 : 1);
}

/* ---------- material: matte vertex colours, leaves sway from the shared clock ---------- */
let cropMat = null, cropThin = null, cropDepth = null;
export function cropMaterials(TIME) {
  if (cropMat) return { mat: cropMat, thin: cropThin, depth: cropDepth };
  // one material for every crop: matte by default, with veins, shine and light through the leaf where a model asks (plantkit.js)
  const pair = plantMaterials({
    key: "-wind-v2",
    vertexHead: "uniform float uTime; uniform vec3 uWind;",
    vertexExtra: `{ vec3 g3c = instanceMatrix[3].xyz;
  float g3seed = fract(sin(dot(g3c.xz, vec2(12.9898, 78.233))) * 43758.5453);
  float g3ph = dot(g3c.xz, uWind.xy) * .35 - uTime * (1.2 + uWind.z * 1.8);
  float g3gust = .65 + .35 * sin(g3ph);
  float g3flutter = sin(uTime * (2.1 + g3seed) + g3seed * 6.283);
  vec2 g3world = uWind.xy * (.35 + .45 * g3gust) + vec2(-uWind.y, uWind.x) * g3flutter * .12;
  // Convert the shared world wind to the plant's rotated local axes.
  vec2 g3local = vec2(dot(g3world, normalize(instanceMatrix[0].xz)), dot(g3world, normalize(instanceMatrix[2].xz)));
  float g3bend = smoothstep(.02, .65, position.y);
  transformed.xz += g3local * g3bend * .06 * (.5 + uWind.z) * (.8 + .4 * g3seed); }`,
  });
  cropMat = pair.solid; cropThin = pair.thin;
  [cropMat, cropThin].forEach((m) => { const patch = m.onBeforeCompile; m.onBeforeCompile = (sh) => { sh.uniforms.uTime = TIME; sh.uniforms.uWind = WIND; patch(sh); }; });
  cropDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  return { mat: cropMat, thin: cropThin, depth: cropDepth };
}
/* draws every collected plant: items are { key, name, stage, x, y, z, s, ry } in world metres */
export function buildCrops(g, items, TIME, focusBounds) {
  if (!items.length) return;
  const { mat, thin } = cropMaterials(TIME), byKey = new Map(), tier = cropTier(items.length, DETAIL.value < 1); // the whole farm shares one level of detail; phones one step lighter
  items.forEach((it) => { const key = cropKey(it.name, it.stage, tier); it.tier = tier; let l = byKey.get(key); if (!l) { l = []; byKey.set(key, l); } l.push(it); });
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler();
  const box = focusBounds ? new THREE.Box3() : null;
  byKey.forEach((list) => {
    const geo = cropGeometry(list[0].name, list[0].stage, list[0].tier || 0), im = new THREE.InstancedMesh(geo, geo.groups.length ? [mat, thin] : mat, list.length); // true-to-life models: solid parts + leaf blades
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
