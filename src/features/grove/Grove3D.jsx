/* ═══════════════════════════════════════════
   GROVE 3D — the farm map rendered with a real 3D engine (three.js), in the rounded
   "toy farm" look: every object is rounded geometry in one flat matte palette (no
   textures), lit bright and soft under one sun, fading into the page colour. Buildings
   have rounded bodies, chunky roofs with capped ridges, framed windows and brand-green
   doors; the greenhouse is a white frame of soft glass; beds carry real 3D plants that
   grow by stage (crops3d.js); animals are rounded geometry that walks and grazes
   (animals3d.js); every ornament is geometry too (props3d.js). The style rules are
   written down in docs/MAP_STYLE.md. View-only: the designer keeps the flat SVG map.
   MARKER: GROVE_3D_ENGINE_V4_TOY
   ═══════════════════════════════════════════ */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Plus, Minus, Compass, Maximize2, Minimize2, X, ChevronDown, Sprout, House, Trees, PawPrint, Droplets, Warehouse, Hexagon, MapPin } from "lucide-react";
import { pinchIntent, isCoarse } from "./gestures";
import { focusDistance } from "./focus-camera";
import { homeView, fitView, turnLimit } from "./home-view";
import { onCover, coverInset, mergeInset, setCover } from "./cover";
import { COMP } from "../../data/companions";
import { placeLabels } from "./labels";
import { previewGrowthOf, growthSceneStages, growthTransitionStart, growthTransitionDelay, growthTransitionProgress, GROWTH_DURATION_MS, GROWTH_STAGGER_MS, rowAtDate } from "./growth-preview";
import { animalZone, bedRows, layoutPlots, STAGES } from "../quiet/farm-model";
import PlantArt from "../quiet/PlantArt";
import { plantingRows } from "../quiet/planting-plan";
import { plantedRows, plantPosition } from "./aerial-layout";
import { srand } from "./sceneMath";
import { todayLocalKey } from "../../lib/utils";
import { isPlantZone } from "../farm/living/visuals";
import { taskGlyph } from "./zone-tasks";
import { buildHerd, applyLegs, speciesInfo } from "./animals3d";
import { createBrain } from "./herd-brain";
import { buildSwallows, buildButterflies, swallowCount, butterflyCount } from "./fauna-fx";
import { GROUND_TONES, pathTones } from "./palette";
import { TREE_RE } from "./crop-families";
import { PAL, STAGE_COLOR, NIGHT, WIND, DETAIL, setDetail, detailFor, setEnvironment, fillLight, bakeSource, mergeBaked, nightGlow, nightTint, texture, ripple, flat, layered, rbox, box, ball, tube, ring, disc, plane, pill, bar, instances, rboxGeo, sphereGeo, capsuleGeo, cylGeo, discGeo, HPI, clamp, clamp01, smoothstep } from "./toy";
import { cropScale, buildCrops } from "./crops3d";
import { DECO_TREES } from "./trees-real";
import { crownGeo, hedgeGeo } from "./crowns";
import { skyState, FIXED_SKY, vaneAngle, cloudCount, precipCount } from "./sky";
import { WX, buildClouds, buildPrecip, RAIN_SPAN } from "./weather-fx";
import { ORNAMENTS, wheelbarrow, barrel, crates, birdbath, mailbox, scarecrow, tractor, ladder, fruitCrate, rake, lilyPads, reeds, jetty, silo, cloche, hoseReel, hayScatter } from "./props3d";

const CAM = { az: -22, el: 54, fov: 28 };
// Phone UX tier (preview tile, bottom bar, label density): a coarse pointer, i.e. fingers. The dev harness can
// force it (?coarse=1) so Playwright at phone size exercises the phone branches without device emulation.
// The render-quality tier (`mobile` in the engine) is wider: coarse pointer OR a short screen side.
// Phones build a farm's round shapes with fewer segments (toy.js detailFor / setDetail): about half the triangles.
// A balcony or back garden is light enough to keep full detail.
const HARNESS = import.meta.env.DEV && typeof window !== "undefined" ? window.__g3harness || null : null;
// growth stages (farm-model STAGES): Planned, Sown, Seedling, Growing, Maturing, Harvest window
const STAGE_CSS = ["#c3cbc4", "#dcca92", "#a9dd8c", "#5fb24d", "#c1d44f", "#f7c552"];
const AREA_ICONS = { house: House, orchard: Trees, pasture: PawPrint, coop: PawPrint, barn: Warehouse, water: Droplets, beehive: Hexagon, veg: Sprout, raised: Sprout, herbs: Sprout, nursery: Sprout, container: Sprout };
const dayNum = (key) => { const [y, m, d] = String(key || "").split("-").map(Number); return Date.UTC(y || 1970, (m || 1) - 1, d || 1) / 864e5; };
const addDays = (key, n) => { const t = new Date((dayNum(key) + n) * 864e5); return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`; };

/* No textures at all (MAP_STYLE §2): grounding comes from the sun's soft shadow, the mulch under a tree is a flat disc. */

/* ---------- shader effects ----------
   The engine renders on demand, so motion has to be cheap: everything that moves does so in the
   vertex shader from one shared clock. */
const TIME = { value: 0 }; // seconds, shared by every animated material
/* foliage(mat, { sway, freq }) — a gentle wobble of the upper part of tree crowns and hedges */
function foliage(mat, { sway = .05, freq = .25, from = 1.2 } = {}) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: TIME, uSway: { value: sway }, uWind: WIND });
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime; uniform float uSway; uniform vec3 uWind;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
{ float g3ph = dot(position.xz, uWind.xy) * .35 - uTime * (1.2 + uWind.z * 1.8);
  float g3w = sin(g3ph + position.x * ${freq.toFixed(2)}) + .5 * sin(uTime * 2.3 + position.z * ${(freq * 1.4).toFixed(2)});
  float g3a = clamp((position.y - ${from.toFixed(2)}) * .35, 0., 1.) * uSway * (.5 + uWind.z) * 1.6;
  transformed.xz += (uWind.xy * (.7 + .3 * g3w) * .5 + vec2(g3w * .5, 0.)) * g3a; }`);
  };
  mat.customProgramCacheKey = () => `g3f|${sway}|${freq}|${from}`;
  return mat;
}
/* motion(sh) — instanced spheres that hover (bees, anim 1) or rise, grow and fade (smoke, anim 3) */
function motionShader(sh) {
  Object.assign(sh.uniforms, { uTime: TIME, uWind: WIND, uCenter: WX.center });
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nuniform float uTime; uniform vec3 uWind; uniform vec3 uCenter; attribute float g3anim; attribute float g3phase; varying float g3va;")
    .replace("#include <begin_vertex>", `#include <begin_vertex>
g3va = 1.;
if (g3anim > 7.5) { float g3H = floor(g3phase) / 100., g3ph = fract(g3phase); float g3T = 8. + g3ph * 4.; float g3t = fract(uTime / g3T + g3ph); float g3fall = clamp(g3t / .07, 0., 1.); transformed.y -= g3H * g3fall * g3fall; float g3roll = clamp((g3t - .07) / .1, 0., 1.); transformed.x += g3roll * g3H * .12 * cos(g3ph * 6.28); transformed.z += g3roll * g3H * .12 * sin(g3ph * 6.28); g3va = 1. - smoothstep(.8, .92, g3t); }
else if (g3anim > 6.5) { float g3t = fract(uTime * .085 + g3phase); transformed.y += ${RAIN_SPAN.toFixed(1)} * (1. - g3t); transformed.x += sin(uTime * 1.3 + g3phase * 6.28) * .4; transformed.z += cos(uTime * 1.1 + g3phase * 5.1) * .4; transformed.xz += uWind.xy * uWind.z * (1. - g3t) * 2.5 + uCenter.xz; }
else if (g3anim > 5.5) { float g3t = fract(uTime * .65 + g3phase); transformed.y += ${RAIN_SPAN.toFixed(1)} * (1. - g3t); transformed.xz += uWind.xy * uWind.z * (1. - g3t) * 3. + uCenter.xz; }
else if (g3anim > 4.5) { float g3f = sin(uTime * 56.5 + g3phase * 6.28); vec3 g3p0 = position; g3p0.y += abs(position.x) * g3f * .9; g3p0.x *= 1. - abs(g3f) * .5; float g3h = uTime * .7 + g3phase * 6.28; float g3c = cos(g3h), g3s = sin(g3h); transformed = vec3(g3p0.x * g3c + g3p0.z * g3s, g3p0.y, -g3p0.x * g3s + g3p0.z * g3c) + vec3(sin(uTime * .9 + g3phase * 6.28) * .3, sin(uTime * 1.7 + g3phase * 3.) * .2 + .2, cos(uTime * .7 + g3phase * 5.) * .3); }
else if (g3anim > 3.5) { float w1 = .16 + g3phase * .08, w2 = w1 * 1.5, A = 9. + g3phase * 6., B = 6. + g3phase * 4.; vec2 g3c2 = vec2(A * sin(uTime * w1 + g3phase * 6.28), B * sin(uTime * w2)); vec2 g3v = vec2(A * w1 * cos(uTime * w1 + g3phase * 6.28), B * w2 * cos(uTime * w2)); float g3hd = atan(g3v.x, g3v.y); float g3f = sin(uTime * 37.7 + g3phase * 6.28) * .6; vec3 g3p0 = position; g3p0.y += abs(position.x) * sin(g3f); g3p0.x *= cos(g3f); float g3bk = clamp((g3v.x * B * w2 * w2 * sin(uTime * w2) - g3v.y * A * w1 * w1 * sin(uTime * w1 + g3phase * 6.28)) * .6, -.6, .6); g3p0 = vec3(g3p0.x * cos(g3bk) - g3p0.y * sin(g3bk), g3p0.x * sin(g3bk) + g3p0.y * cos(g3bk), g3p0.z); float g3ch = cos(g3hd), g3sh = sin(g3hd); transformed = vec3(g3p0.x * g3ch + g3p0.z * g3sh, g3p0.y, -g3p0.x * g3sh + g3p0.z * g3ch) + vec3(g3c2.x, 9. + g3phase * 4. + sin(uTime * .8 + g3phase * 6.28) * .6, g3c2.y); }
else if (g3anim > 2.5) { float g3t = fract(uTime * .09 + g3phase); transformed *= .5 + g3t * 2.2; transformed.y += g3t * 2.4; transformed.xz += uWind.xy * uWind.z * g3t * 2.6 + vec2(sin(g3t * 5. + g3phase * 6.28) * .16, 0.); g3va = (1. - g3t) * smoothstep(0., .12, g3t) * .7; }
else if (g3anim > .5) { transformed.y += sin(uTime * 2.1 + g3phase * 6.28) * .05; transformed.x += cos(uTime * .9 + g3phase * 6.28) * .07; transformed.z += sin(uTime * 1.3 + g3phase * 3.1) * .05; }`);
  sh.fragmentShader = sh.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying float g3va;")
    .replace("#include <alphatest_fragment>", "diffuseColor.a *= g3va;\n#include <alphatest_fragment>");
}
function motionMat(color, smoke, vertexColors = false) {
  const m = new THREE.MeshLambertMaterial({ color, transparent: smoke, opacity: 1, depthWrite: !smoke, emissive: smoke ? 0xffffff : 0x000000, emissiveIntensity: smoke ? .25 : 0, vertexColors });
  m.forceSinglePass = true; m.onBeforeCompile = motionShader; m.customProgramCacheKey = () => "g3motion"; return m;
}

/* ---------- materials: the palette, memoised flat materials under the names the builders use ---------- */
function materials() {
  const L = (c, n) => layered(flat(c, { rough: .95 }), n);
  return {
    // ground layers (look A: fine shader texture, no images)
    lawn: (color = PAL.lawn) => texture(L(color, 6), "meadow"), soil: (color = PAL.soil) => texture(L(color, 6), "soil"), gravel: texture(L(PAL.gravel, 6), "gravel"), stoneFloor: (color = PAL.stone) => texture(L(color, 6), "stone"), concrete: texture(L(PAL.concrete, 6), "concrete"), earth: (color = PAL.earth) => texture(L(color, 6), "soil"), pavers: texture(L(0xe7e3da, 5), "stone"), hay: texture(flat(PAL.hay, { rough: .95 }), "hay"), hayFloor: texture(L(PAL.straw, 7), "hay"),
    // structure
    // look C (docs/MAP_STYLE.md §11): every structural material carries its own surface
    cream: texture(flat(PAL.cream), "plaster"), white: flat(PAL.white), trim: flat(PAL.trim, { rough: .8 }), panel: texture(flat(PAL.panel), "planks"), stone: texture(flat(PAL.stone), "stone"), stoneDark: texture(flat(PAL.stoneDark), "stone"), rock: texture(nightTint(flat(PAL.rock), .6, [.12, .15, .24]), "concrete"), concreteSolid: texture(flat(PAL.concrete), "concrete"),
    wood: texture(flat(PAL.wood), "wood"), woodMid: texture(flat(PAL.woodMid), "wood"), woodDark: texture(flat(PAL.woodDark), "wood"), woodPale: texture(flat(PAL.woodPale), "wood"), bark: texture(flat(0x7c583c), "wood"),
    roofClay: texture(flat(PAL.terracotta, { variant: "roof" }), "roof"), roofSlate: texture(flat(PAL.slate, { variant: "roof" }), "slate"), // tiled roofs
    terracotta: texture(flat(PAL.terracotta), "clay"), sheet: texture(flat(PAL.slate, { variant: "sheet" }), "zinc"), slate: flat(PAL.slate), slateDark: flat(PAL.slateDark), zinc: texture(flat(PAL.zinc, { rough: .6, metal: .15 }), "zinc"), metal: texture(flat(PAL.metal, { rough: .5, metal: .3 }), "metal"), dark: flat(PAL.dark), ink: flat(0x4a3f36),
    barn: texture(flat(PAL.barn), "planks"), barnDark: texture(flat(PAL.barnDark), "planks"), green: flat(PAL.green), greenLight: flat(PAL.greenLight), greenDeep: flat(PAL.greenDeep), brass: flat(0xd9b35c, { rough: .4, metal: .5 }), red: flat(0xd9574a),
    glass: nightTint(nightGlow(flat(PAL.glass, { transparent: true, opacity: .34, rough: .12, physical: true, env: 1.5, side: THREE.DoubleSide, depthWrite: false }), 2.0), .8, [1, .62, .25]), // the greenhouse glows warm after dark
    winGlass: nightTint(nightGlow(flat(0x9fc9dc, { rough: .18, metal: .05, physical: true, env: 1.4 }), .55, [1, .62, .22]), .92, [1, .66, .24]), // lit windows are warm amber after dark (look A), not blown out to white
    lamp: nightGlow(flat(0xd9b35c, { rough: .4, metal: .5 }), 1.3),
    bulb: nightGlow(flat(0xfff1d0, { rough: .35 }), 2.6), wire: flat(0xb9b1a3, { rough: .7 }), // festoon string lights: a pale cord (a dark one broke into black dashes at a distance)
    // an apartment block's windows: some flats are home after dark (warm amber, not blown out to white), some are not
    winLit: nightTint(nightGlow(flat(PAL.winGlass, { rough: .18, metal: .05, physical: true, env: 1.4, variant: "winLit" }), .55, [1, .62, .22]), .92, [1, .66, .24]), // the pane itself turns amber, so the glow is not washed out by blue glass
    winDark: nightTint(flat(PAL.winGlass, { rough: .18, metal: .05, physical: true, env: 1.4, variant: "winDark" }), .82, [.1, .14, .26]),
    facadeB: texture(flat(PAL.plasterPeach, { variant: "facadeB" }), "plaster"), facadeC: texture(flat(PAL.plasterStone, { variant: "facadeC" }), "plaster"),
    road: nightTint(texture(flat(PAL.asphalt, { rough: .96, variant: "road" }), "gravel"), .78, [.1, .13, .23]), kerb: nightTint(flat(PAL.kerb, { variant: "kerb" }), .7, [.15, .19, .31]), roadLine: nightTint(flat(PAL.white, { variant: "roadLine" }), .55, [.2, .25, .4]),
    shutter: texture(flat(PAL.woodMid, { variant: "shutter" }), "planks"),
    facade: texture(flat(PAL.plaster, { variant: "facade" }), "plaster"), tileA: texture(flat(PAL.stone, { variant: "tile" }), "tile"), tileB: texture(flat(PAL.concrete, { variant: "tile" }), "tile"),
    rug: flat(0xc98a63, { rough: 1 }), rugIn: flat(0xeee0c8, { rough: 1 }), bin: flat(0x4f6e45, { rough: .7 }), nLawn: texture(layered(flat(0x9cb55a, { rough: .96, variant: "nlawn" }), 2), "lawn"),
    water: flat(PAL.water, { rough: .14, metal: 0, physical: true, env: 1.4 }), pondWater: ripple(flat(PAL.water, { rough: .14, metal: 0, physical: true, env: 1.4, variant: "pond" }), { time: TIME, ripple: WX.ripple }),
    yard: texture(flat(PAL.yard, { rough: .95 }), "soil"), yardRim: flat(PAL.yardRim, { rough: .95 }),
    solar: flat(PAL.solar, { rough: .25, metal: .3, physical: true, env: 1.3 }), solarFrame: flat(PAL.solarFrame, { rough: .5, metal: .2 }),
    hedge: texture(nightTint(foliage(flat(PAL.hedge, { rough: .95 }), { sway: .02, freq: .6, from: .4 }), .55, [.07, .17, .12]), "hedge"),
    leaf: [...PAL.leaf, PAL.leafOlive, PAL.leafCitrus].map((c) => texture(nightTint(foliage(flat(c, { rough: .95 }), { sway: .06, freq: .25, from: 1.2 }), .55, [.07, .17, .12]), "hedge")), // 0-3 greens, 4 silvery olive, 5 deep citrus / fig
    tuft: nightTint(flat(0x6f9440, { rough: 1 }), .6, [.06, .12, .1]), flower: PAL.flower.map((c) => nightTint(flat(c, { rough: .9 }), .75, [.12, .14, .22])), flowerStem: flat(0x6fa05a, { rough: 1 }),
    compost: PAL.compost.map((c) => flat(c, { rough: 1 })), hive: PAL.hive.map((c) => flat(c)), pot: texture(flat(PAL.pot), "clay"), potRim: texture(flat(PAL.potRim), "clay"), mulch: texture(layered(flat(PAL.mulch, { rough: 1 }), 13), "soil"), mulchRim: layered(flat(PAL.soilLight, { rough: 1 }), 12),
    netting: flat(0xffffff, { transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false, rough: 1 }), shade: flat(0xeef2e6, { rough: .95 }),
    hit: new THREE.MeshBasicMaterial({ visible: false }),
    blob: new THREE.ShaderMaterial({ // soft round contact shadow (radial falloff in the shader, no texture); merged by bake()
      transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -8,
      vertexShader: "varying vec2 vU; void main() { vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
      fragmentShader: "varying vec2 vU; void main() { float r = length(vU - .5) * 2., a = pow(clamp(1. - r, 0., 1.), 1.3) * .42; gl_FragColor = vec4(.13, .16, .05, a); }",
    }),
    glow: new THREE.MeshLambertMaterial({ color: 0xffc83d, emissive: 0xffb300, emissiveIntensity: .55, transparent: true, opacity: .95 }),
    stageTag: STAGE_COLOR.map((c, i) => flat(c, { rough: .6, emissive: i === 5 ? 0x8a6a10 : 0x000000, ei: 1 })), tagPole: flat(PAL.tagPole),
    fruit: (color) => flat(color, { rough: .45, emissive: color, ei: .1 }), fruitDrop: (color) => Object.assign(motionMat(color, false), { transparent: true }),
    select: layered(new THREE.MeshBasicMaterial({ color: 0xf7c552, transparent: true, opacity: .22, depthWrite: false }), 14),
    selectEdge: layered(new THREE.MeshBasicMaterial({ color: 0xf7c552, transparent: true, opacity: .95, depthWrite: false }), 15),
    pick: layered(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .3, depthWrite: false }), 16),
    pickEdge: layered(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .95, depthWrite: false }), 17),
    smoke: motionMat(PAL.smoke, true), bee: motionMat(PAL.bee, false), rain: Object.assign(motionMat(0xeef6f9, false), { transparent: true, opacity: .75 }), snow: motionMat(0xffffff, false), swallow: motionMat(0xffffff, false, true), butterfly: motionMat(0xffffff, false),
  };
}

/* ---------- geometry helpers ---------- */
function hipRoofGeo(w, d, rise, ov, hipIn) {
  const W = w + 2 * ov, D = d + 2 * ov, e = Math.min(W, D) / 2 * (hipIn ? 1 : 0), along = W >= D;
  const A = [-W / 2, 0, -D / 2], B = [W / 2, 0, -D / 2], C = [W / 2, 0, D / 2], Dd = [-W / 2, 0, D / 2];
  const R1 = along ? [-W / 2 + e, rise, 0] : [0, rise, -D / 2 + e], R2 = along ? [W / 2 - e, rise, 0] : [0, rise, D / 2 - e];
  const faces = along
    ? [[A, B, R2], [A, R2, R1], [C, Dd, R1], [C, R1, R2], [Dd, A, R1], [B, C, R2]]
    : [[A, B, R1], [B, C, R2], [B, R2, R1], [C, Dd, R2], [Dd, A, R1], [Dd, R1, R2]];
  const pos = [];
  faces.forEach((tri) => { // wind every triangle counter-clockwise seen from above so the lit face points up
    const [a, b, c] = tri, ux = b[0] - a[0], uz = b[2] - a[2], vx = c[0] - a[0], vz = c[2] - a[2];
    (uz * vx - ux * vz < 0 ? [a, c, b] : tri).forEach((p) => pos.push(p[0], p[1], p[2]));
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
  return { geo, corners: [A, B, C, Dd], ridge: [R1, R2], along, W, D };
}
function hipHeight(x, z, W, D, rise) { // height of a hip roof surface at (x, z) measured from its centre
  const along = W >= D, e = Math.min(W, D) / 2;
  const t1 = 1 - Math.abs(along ? z : x) / (Math.min(W, D) / 2);
  const t2 = 1 - Math.max(0, Math.abs(along ? x : z) - (Math.max(W, D) / 2 - e)) / e;
  return rise * Math.max(0, Math.min(t1, t2));
}
function ribbonGeo(pts, width) {
  const pos = [], idx = []; const hw = width / 2;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    let dx = next.xM - prev.xM, dz = next.yM - prev.yM; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    pos.push(p.xM - dz * hw, 0, p.yM + dx * hw, p.xM + dz * hw, 0, p.yM - dx * hw);
    if (i) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
function contact() { /* retired 2026-10-05: blurred AO patches broke the flat-colour rule; the sun's soft shadow grounds objects */ }

/* ---------- reusable structures ---------- */
function tree(g, x, z, r, seed, M, y = 0, leafIdx = null) {
  // a marker now; once the world is assembled plantDecoTrees makes it a true-to-life model (on the property) or a toy crown (backdrop)
  const mk = new THREE.Object3D(); mk.position.set(x, y, z); mk.userData.decoTree = { x, z, r, seed, y, leafIdx }; g.add(mk);
  if (M.blob) disc(g, r * 1.12, M.blob, x, y + .028, z, { seg: 20, cast: false, receive: false }); // a soft dark patch grounds every tree
}
/* a mass of leaves (crowns.js): billowed, flatter underneath, its shade baked in. sc = [x, y, z] radii in metres */
function clump(g, habit, variant, mat, x, y, z, sc, ry = 0, cast = true) {
  const m = new THREE.Mesh(crownGeo(habit, variant), mat); m.position.set(x, y, z); m.scale.set(sc[0], sc[1], sc[2]); m.rotation.y = ry; m.castShadow = cast; m.receiveShadow = true; g.add(m); return m;
}
const TREE_HABITS = ["round", "round", "wide", "round", "tall", "wide"];
function toyTree(g, x, z, r, seed, M, y = 0, leafIdx = null) { // a backdrop tree: one billowed crown in the leafy hedge surface, cheap per pixel
  if (y) { const tg = new THREE.Group(); tg.position.y = y; g.add(tg); g = tg; }
  const th = r * .55 + .3, leaf = M.leaf[leafIdx ?? Math.floor(srand(seed + 3) * 4)], spin = srand(seed) * 6.28;
  const habit = TREE_HABITS[Math.floor(srand(seed + 11) * TREE_HABITS.length)], tall = habit === "tall", k = r * (1.04 + srand(seed + 13) * .1), top = th + r * (tall ? 1.15 : .9);
  // a trunk that thickens to the ground and leans a little, with three limbs reaching up into the crown
  const trunk = tube(g, r * .075, r * .15, th + r * .6, M.bark, x, (th + r * .6) / 2, z, { seg: 12 }); trunk.rotation.z = (srand(seed + 7) - .5) * .08; trunk.rotation.x = (srand(seed + 8) - .5) * .06;
  [0, 2.2, 4.3].forEach((a, i) => pill(g, [x, th + r * .15, z], [x + Math.cos(spin + a) * r * .42, th + r * (.62 + i * .08), z + Math.sin(spin + a) * r * .42], r * .04, M.bark, { seg: 7, cast: false }));
  clump(g, habit, Math.floor(srand(seed + 5) * 3), leaf, x, top, z, [k, k * (.94 + srand(seed + 17) * .14), k], spin);
}
/* Trees standing on the property are look-C models (trees-real.js), drawn with the crops and orchard trees: instanced,
   swaying, their own level of detail. Backdrop trees (border, street, neighbours, countryside) are billowed toy crowns (crowns.js) in
   the leafy surface: fifty look-C crowns cost a third more frame time on a farm, all of it per-pixel leaf shading. */
function plantDecoTrees(world, ctx, M) {
  const marks = []; world.updateMatrixWorld(true); world.traverse((o) => { if (o.userData.decoTree) marks.push(o); });
  const inv = new THREE.Matrix4().copy(world.matrixWorld).invert(), P = new THREE.Vector3();
  marks.forEach((o) => {
    const d = o.userData.decoTree, parent = o.parent; P.setFromMatrixPosition(o.matrixWorld).applyMatrix4(inv); o.removeFromParent();
    if (ctx.fW == null || (P.x >= 0 && P.x <= ctx.fW && P.z >= 0 && P.z <= ctx.fH)) ctx.plants.push({ name: DECO_TREES[d.leafIdx ?? Math.floor(srand(d.seed + 3) * 4)] || "oak", tree: true, deco: true, stage: 4, x: P.x, y: P.y, z: P.z, s: d.r, ry: srand(d.seed) * 6.28 });
    else toyTree(parent, d.x, d.z, d.r, d.seed, M, d.y, d.leafIdx);
  });
}
/* Fruit trees are the decoration tree scaled by growth stage, plus fruit on the crown: small and green
   while maturing, full colour in the harvest window. Fruit is collected farm-wide, one instanced mesh per colour. */
const FRUIT = { apple: [0xe0453a, .085], pear: [0xd1cf5e, .08], peach: [0xf09a62, .08], plum: [0x6a4690, .065], cherry: [0xc8202f, .045], apricot: [0xf4a64c, .07], lemon: [0xf6d93c, .08], orange: [0xf5922e, .09], citrus: [0xf5922e, .085], fig: [0x6a4468, .07], olive: [0x4a6a3e, .035], walnut: [0x7f9a55, .055], almond: [0x9bb067, .05], hazelnut: [0xb08a5a, .045], chestnut: [0x8f6b4c, .06], quince: [0xe8d25a, .08], persimmon: [0xf07a2e, .08], pomegranate: [0xc83a3a, .085], avocado: [0x3f5f33, .095] };
function fruitTree(g, ctx, x, z, size, stage, name, seed, M, off) {
  const grow = [0, 0, .3, .55, .82, 1][stage] || 0, r = Math.max(.32, Math.min(1.7, size * .42)) * grow;
  const key = Object.keys(FRUIT).find((k) => name.includes(k)) || "apple", [color, fr] = FRUIT[key];
  // the tree itself is a true-to-life model (trees-real.js), drawn with the crops: one instanced mesh per species
  ctx.plants.push({ name: key, tree: true, stage, x: off[0] + x, y: 0, z: off[1] + z, s: r, ry: srand(seed) * 6.28 });
  { const mr = Math.min(1.1, r * .8 + .2); disc(g, mr + .08, M.mulchRim, x, .013, z, { seg: 28 }); disc(g, mr, M.mulch, x, .016, z, { seg: 28 }); }
  if (stage < 4) pill(g, [x + .22, 0, z + .1], [x + .2, Math.min(1.5, r * 1.4 + .6), z + .08], .022, M.woodDark, { seg: 6 }); // stake for young trees
  if (stage < 5) return; // like the crop rows, a tree shows its harvest: fruit and a gold halo appear only in the harvest window
  ctx.growth.glows.push({ p: [off[0] + x, .012, off[1] + z], tree: true, s: [r * 2.2 + 1.2, r * 2.2 + 1.2, 1] });
  const top = r * .55 + .3 + r * .9;
  if (ctx.fruitDrop) { const dl = ctx.fruitDrop.get(color) || []; ctx.fruitDrop.set(color, dl); const dropY = top - r * .25, h = Math.max(.3, dropY - .05); const ds = fr * Math.min(1, .55 + r * .4); dl.push({ p: [off[0] + x + .35 * r, dropY, off[1] + z + .25 * r], s: ds, phase: Math.floor(h / ds * 100) + srand(seed * 5 + 2) }); } // the fall is written in instance-local units
}
function buildFruit(g, ctx, M) { ctx.fruit.forEach((list, color) => instances(g, sphereGeo(10, 8), M.fruit(color), list, { cast: false })); }
/* Fences are collected in world coordinates and drawn as a handful of instanced meshes for the whole
   farm (posts, rails, pickets, caps) instead of a set per zone. */
function fence(ctx, segs, { pickets = false, post = 1.05, off = [0, 0] } = {}) {
  const F = pickets ? ctx.fences.picket : ctx.fences.plain, [ox, oz] = off;
  segs.forEach(([a, b]) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < .05) return;
    const ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]), n = Math.max(2, Math.ceil(len / (pickets ? .26 : 1.3)) + 1);
    for (let j = 0; j < n; j++) { const t = j / (n - 1), x = ox + a[0] + (b[0] - a[0]) * t, z = oz + a[1] + (b[1] - a[1]) * t; F.posts.push(pickets ? { p: [x, .42, z], ry } : { p: [x, post / 2, z], s: [1, post, 1] }); if (pickets) F.caps.push({ p: [x, .86, z] }); }
    (pickets ? [.3, .64] : [.5, .92]).forEach((h) => F.rails.push({ p: [ox + (a[0] + b[0]) / 2, h, oz + (a[1] + b[1]) / 2], ry, s: [len, 1, 1] }));
  });
}
function buildFences(g, ctx, M) {
  const P = ctx.fences.plain, K = ctx.fences.picket;
  instances(g, capsuleGeo(.07, .86, 10, 3), M.woodDark, P.posts);
  instances(g, rboxGeo(1, .11, .09, .04, 1), M.woodMid, P.rails);
  instances(g, rboxGeo(.09, .84, .035, .016, 1), M.white, K.posts);
  instances(g, sphereGeo(8, 6), M.white, K.caps.map((c) => ({ ...c, s: .055 })), { cast: false });
  instances(g, rboxGeo(1, .07, .04, .018, 1), M.woodPale, K.rails);
  const R = ctx.fences.rail; // balcony railing
  if (R) { instances(g, capsuleGeo(.035, .95, 10, 3), M.zinc, R.posts); instances(g, cylGeo(.013, .013, .82, 8), M.zinc, R.bars, { cast: false }); instances(g, rboxGeo(1, .07, .11, .03, 1), M.white, R.rails); }
}
function gate(g, x, z, width, ry, M, { pickets = false } = {}) {
  const gg = new THREE.Group(); gg.position.set(x, 0, z); gg.rotation.y = ry; g.add(gg);
  const pm = M.woodDark, fm = M.green, inner = width - .04;
  [-1, 1].forEach((s) => { rbox(gg, .16, 1.3, .16, pm, s * (width / 2 + .1), .65, 0, { r: .05 }); ball(gg, .11, pm, s * (width / 2 + .1), 1.34, 0, { seg: 10, rings: 8 }); });
  [.3, 1.0].forEach((y) => rbox(gg, inner, .09, .06, fm, 0, y, 0, { r: .025 }));
  const n = pickets ? Math.max(3, Math.round(inner / .2)) : 4;
  for (let i = 0; i < n; i++) { const u = -inner / 2 + .07 + (i / (n - 1)) * (inner - .14); rbox(gg, .07, pickets ? .98 : .88, .05, fm, u, pickets ? .62 : .64, .02, { r: .02 }); }
  pill(gg, [-inner / 2 + .06, .3, .035], [inner / 2 - .06, 1.0, .035], .025, fm, { seg: 7 });
  box(gg, .07, .1, .12, M.metal, inner / 2 + .07, .85, .06, { cast: false });
  return gg;
}
function hedge(g, segs, M, { h = 1.4, t = .8 } = {}) { // a clipped hedge: one run of crowns.js hedgeGeo per side, swelling and dipping a little
  segs.forEach(([a, b], i) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < .3) return;
    const m = new THREE.Mesh(hedgeGeo(len, h, t, Math.round(a[0] * 7 + a[1] * 13 + i * 31)), M.hedge); m.position.set((a[0] + b[0]) / 2, -.02, (a[1] + b[1]) / 2); m.rotation.y = Math.atan2(-(b[1] - a[1]), b[0] - a[0]); m.castShadow = true; m.receiveShadow = true; g.add(m);
  });
}
function shelter(g, x, z, w, d, M, ry = 0) { // open-sided field shelter: chunky capsule posts, a rounded plank back wall, a thick rounded mono-pitch roof
  const sg = new THREE.Group(); sg.position.set(x, 0, z); sg.rotation.y = ry; g.add(sg);
  const hi = 2.4, lo = 1.9;
  [[-w / 2, -d / 2, hi], [w / 2, -d / 2, hi], [-w / 2, d / 2, lo], [w / 2, d / 2, lo], [0, -d / 2, hi], [0, d / 2, lo]].forEach(([px, pz, ph]) => {
    pill(sg, [px, 0, pz], [px, ph, pz], .09, M.woodDark, { seg: 12 });
    rbox(sg, .3, .1, .3, M.stoneDark, px, .05, pz, { r: .04, cast: false }); // a rounded foot pad
  });
  const pl = 4, ph = (hi - .35) / pl; // back wall: stacked rounded planks
  for (let i = 0; i < pl; i++) rbox(sg, w, ph - .03, .14, i % 2 ? M.woodMid : M.wood, 0, .12 + ph * (i + .5), -d / 2 + .05, { r: .05 });
  const ang = Math.atan2(hi - lo, d), slope = Math.hypot(d + .6, hi - lo), ry0 = (hi + lo) / 2 + .14;
  rbox(sg, w + .6, .24, slope, M.sheet, 0, ry0, 0, { rx: ang, r: .1, seg: 2 }); // a corrugated sheet roof
  pill(sg, [-w / 2 - .3, hi + .26, -d / 2 - .3], [w / 2 + .3, hi + .26, -d / 2 - .3], .13, M.slateDark, { seg: 14 }); // rounded ridge cap
  rbox(sg, w + .6, .1, .12, M.trim, 0, lo + .02, d / 2 + .3, { r: .04, cast: false }); // white fascia on the low edge
  ball(sg, [w * .36, .3, d * .34], M.hay, 0, .16, .1, { seg: 16, rings: 10 });
  rbox(sg, .9, .55, .5, M.woodMid, w / 2 - .7, .3, -d / 2 + .45, { r: .1 }); ball(sg, [.38, .18, .2], M.hay, w / 2 - .7, .6, -d / 2 + .45, { seg: 12, rings: 8 }); // hay rack
  return sg;
}
function solarPanels(g, cx, cz, W, D, H, rise, M) { // a grid of panels on the roof slope that faces the camera
  const along = W >= D, e = Math.min(W, D) / 2;
  const slopeLen = Math.hypot(e, rise), ang = Math.atan2(rise, e), pw = .8, ph = 1.25;
  const across = (along ? W : D) - e - 1.2, n = Math.min(7, Math.floor(across / (pw + .06))); if (n < 2) return;
  const rows = slopeLen > 3.4 ? 2 : 1, items = [], frames = [], shift = Math.max(0, (across - n * (pw + .06)) / 2 - .2);
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
    const u = (i - (n - 1) / 2) * (pw + .06) - shift, t = rows === 1 ? .5 : .3 + r * .34;
    const y = H + rise * (1 - t), off = e * t;
    if (along) { items.push({ p: [cx + u, y + .07, cz + off], rx: ang }); frames.push({ p: [cx + u, y + .05, cz + off], rx: ang }); }
    else { items.push({ p: [cx - off, y + .07, cz + u], rz: ang }); frames.push({ p: [cx - off, y + .05, cz + u], rz: ang }); }
  }
  instances(g, rboxGeo(along ? pw : ph, .04, along ? ph : pw, .015, 1), M.solar, items, { cast: false });
  instances(g, rboxGeo(along ? pw + .08 : ph + .08, .04, along ? ph + .08 : pw + .08, .02, 1), M.solarFrame, frames, { cast: false });
}
function smooth(pts, iterations = 2) { // Chaikin corner-cutting so paths turn on curves instead of right angles
  let out = pts;
  for (let k = 0; k < iterations; k++) {
    if (out.length < 3) return out;
    const next = [out[0]];
    for (let i = 0; i < out.length - 1; i++) {
      const a = out[i], b = out[i + 1], L = Math.hypot(b.xM - a.xM, b.yM - a.yM), f = Math.min(.25, 1.2 / Math.max(L, .01));
      next.push({ xM: a.xM + (b.xM - a.xM) * f, yM: a.yM + (b.yM - a.yM) * f }, { xM: a.xM + (b.xM - a.xM) * (1 - f), yM: a.yM + (b.yM - a.yM) * (1 - f) });
    }
    next.push(out[out.length - 1]); out = next;
  }
  return out;
}
function fixtures(w, d) { // places a mesh on a face of a w × d footprint: f = S | N | W | E, u along the face, off outward
  return (m, f, u, y, off = 0, { rx = 0, rz = 0 } = {}) => {
    const ry = f === "S" ? 0 : f === "N" ? Math.PI : f === "W" ? -HPI : HPI;
    if (f === "S") m.position.set(u, y, d / 2 + off);
    else if (f === "N") m.position.set(-u, y, -d / 2 - off);
    else if (f === "W") m.position.set(-w / 2 - off, y, u);
    else m.position.set(w / 2 + off, y, -u);
    m.rotation.set(rx, ry, rz, "YXZ"); m.castShadow = true; m.receiveShadow = true; return m;
  };
}
const rm = (w, h, d, mat, r) => new THREE.Mesh(rboxGeo(w, h, d, r), mat);
/* look A: vertical board battens on a red plank wall, one thin darker strip every ~0.42 m, skipping openings.
   The wall runs from (x0, z0) to (x1, z1); out = its outward normal; skip = [[from, to], …] in metres along the wall. */
function battens(g, x0, z0, x1, z1, y0, h, mat, out, skip = []) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / .42), ry = Math.atan2(-(z1 - z0), x1 - x0);
  for (let i = 1; i < n; i++) {
    const s = (i / n) * len; if (skip.some(([a, b]) => s > a - .08 && s < b + .08)) continue;
    box(g, .05, h, .035, mat, x0 + (x1 - x0) * i / n + out[0] * .025, y0 + h / 2, z0 + (z1 - z0) * i / n + out[1] * .025, { ry, cast: false });
  }
}
function windowAt(dg, put, f, u, y, W, Hh, M, { shutters = false, sill = true } = {}) {
  dg.add(put(rm(W + .2, Hh + .2, .1, M.trim, .035), f, u, y, .04));
  dg.add(put(rm(W, Hh, .04, M.winGlass, .012), f, u, y, .085));
  dg.add(put(rm(.04, Hh, .025, M.trim, 0), f, u, y, .105)); dg.add(put(rm(W, .04, .025, M.trim, 0), f, u, y, .105));
  if (sill) dg.add(put(rm(W + .32, .08, .2, M.trim, .03), f, u, y - Hh / 2 - .1, .1));
  if (shutters) [-1, 1].forEach((s) => dg.add(put(rm(W * .46, Hh + .16, .05, M.panel, .02), f, u + s * (W / 2 + .12 + W * .23), y, .03)));
}
function doorAt(dg, put, f, u, W, Hh, kind, M, d) {
  dg.add(put(rm(W + .22, Hh + .12, .1, kind === "shed" ? M.woodDark : M.trim, .035), f, u, Hh / 2 + .04, .04));
  if (kind === "barn") {
    dg.add(put(rm(W * 1.9, .12, .1, M.metal, .03), f, u, Hh + .18, .12));
    [-1, 1].forEach((s) => dg.add(put(rm(W / 2 - .04, Hh, .08, M.white, .03), f, u + s * W / 4, Hh / 2, .07)));
    [-1, 1].forEach((s) => dg.add(put(rm(W / 2 - .18, .07, .03, M.barnDark, .012), f, u + s * W / 4, Hh / 2, .115, { rz: s * Math.atan2(W / 2 - .1, Hh - .2) })));
    dg.add(put(rm(.06, .24, .05, M.metal, .02), f, u - .1, Hh * .48, .12));
    return;
  }
  dg.add(put(rm(W, Hh, .07, M.green, .025), f, u, Hh / 2, .07));
  if (kind === "house") {
    [[.22, -.32], [-.22, -.32], [.22, .28], [-.22, .28]].forEach(([dx, dy]) => dg.add(put(rm(.3, .58, .016, M.greenDeep, .006), f, u + dx, Hh / 2 + dy, .108)));
    { const knob = put(new THREE.Mesh(sphereGeo(10, 8), M.brass), f, u + W * .36, Hh * .48, .11); knob.scale.setScalar(.04); dg.add(knob); }
    // two rounded stone steps and a small canopy over the door
    dg.add(put(rm(W + .6, .16, .44, M.concreteSolid, .05), f, u, .08, .22));
    dg.add(put(rm(W + .9, .1, .44, M.concreteSolid, .04), f, u, .05, .64));
    dg.add(put(rm(W + .9, .08, .64, M.slate, .03), f, u, Hh + .36, .32, { rx: .28 }));
    if (f === "S") [-1, 1].forEach((s) => pill(dg, [u + s * (W / 2 + .06), Hh + .04, d / 2], [u + s * (W / 2 + .06), Hh + .3, d / 2 + .58], .022, M.metal, { seg: 6 }));
  } else {
    dg.add(put(rm(W - .1, .08, .025, M.greenDeep, .01), f, u, Hh - .14, .11)); dg.add(put(rm(W - .1, .08, .025, M.greenDeep, .01), f, u, .14, .11));
    dg.add(put(rm(.06, .2, .04, M.metal, .015), f, u + W * .36, Hh * .48, .115));
  }
}
function hipRoof(g, cx, cz, w, d, H, rise, ov, roofMat, capMat, M) {
  const { geo, corners, ridge, along, W, D } = hipRoofGeo(w, d, rise, ov, true);
  const roof = new THREE.Mesh(geo, roofMat); roof.position.set(cx, H, cz); roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
  const under = new THREE.Mesh(geo, roofMat); under.position.set(cx, H - .16, cz); under.castShadow = false; under.receiveShadow = false; g.add(under); // a thick roof: a second shell a little lower reads as its edge
  const at = (p) => [cx + p[0], H + p[1], cz + p[2]];
  // rounded ridge and hip caps
  if (Math.hypot(ridge[1][0] - ridge[0][0], ridge[1][2] - ridge[0][2]) > .05) pill(g, at(ridge[0]), at(ridge[1]), .1, capMat, { seg: 10 });
  corners.forEach((c, i) => { const r = along ? (i === 0 || i === 3 ? ridge[0] : ridge[1]) : (i < 2 ? ridge[0] : ridge[1]); pill(g, at(c), at(r), .075, capMat, { seg: 8 }); });
  // fascia all round, gutter along the front, downpipes
  [[cx, cz + D / 2, W, .07], [cx, cz - D / 2, W, .07], [cx - W / 2, cz, .07, D], [cx + W / 2, cz, .07, D]].forEach(([x, z, bw, bd]) => rbox(g, bw + .07, .18, bd + .07, M.trim, x, H - .08, z, { r: .03, cast: false }));
  pill(g, [cx - W / 2, H - .2, cz + D / 2 + .08], [cx + W / 2, H - .2, cz + D / 2 + .08], .055, M.zinc, { seg: 8, cast: false });
  [[cx - W / 2 + .14, cz + D / 2 + .08], [cx + W / 2 - .14, cz + D / 2 + .08]].forEach(([x, z]) => tube(g, .04, .04, H - .3, M.zinc, x, (H - .3) / 2 + .1, z, { seg: 8, cast: false }));
  return roof;
}
function gableRoof(g, cx, cz, w, d, H, rise, ov, roofMat, wallMat, alongX, capMat, M, { thick = .16, gutters = true } = {}) {
  const L = alongX ? w + 2 * ov : d + 2 * ov, span = alongX ? d + 2 * ov : w + 2 * ov;
  const slope = Math.hypot(span / 2, rise) + thick * .5, ang = Math.atan2(rise, span / 2);
  [-1, 1].forEach((side) => {
    const off = side * span / 4;
    rbox(g, alongX ? L : slope, thick, alongX ? slope : L, roofMat, cx + (alongX ? 0 : off), H + rise / 2 + thick / 2, cz + (alongX ? off : 0), { rx: alongX ? side * ang : 0, rz: alongX ? 0 : -side * ang, r: thick * .4, seg: 2 });
  });
  const ry = H + rise + thick * .7;
  if (alongX) pill(g, [cx - L / 2, ry, cz], [cx + L / 2, ry, cz], .1, capMat, { seg: 10 }); else pill(g, [cx, ry, cz - L / 2], [cx, ry, cz + L / 2], .1, capMat, { seg: 10 });
  const tri = new THREE.Shape(); tri.moveTo(-span / 2 + ov, 0); tri.lineTo(span / 2 - ov, 0); tri.lineTo(0, rise); tri.closePath();
  [-1, 1].forEach((side) => {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), wallMat);
    if (alongX) { m.position.set(cx + side * (w / 2 - .005), H, cz); m.rotation.y = side > 0 ? HPI : -HPI; }
    else { m.position.set(cx, H, cz + side * (d / 2 - .005)); m.rotation.y = side > 0 ? 0 : Math.PI; }
    m.castShadow = true; g.add(m);
    [-1, 1].forEach((k) => { // rounded barge boards along the gable edges
      const a = alongX ? [cx + side * (w / 2 + .03), H, cz + k * span / 2] : [cx + k * span / 2, H, cz + side * (d / 2 + .03)];
      const b = alongX ? [cx + side * (w / 2 + .03), H + rise + thick, cz] : [cx, H + rise + thick, cz + side * (d / 2 + .03)];
      pill(g, a, b, .05, M.trim, { seg: 6, cast: false });
    });
  });
  [-1, 1].forEach((side) => { // fascia + gutters along the two eaves, downpipes on the sunny one
    if (alongX) { rbox(g, L, .16, .08, M.trim, cx, H + .03, cz + side * span / 2, { r: .03, cast: false }); if (gutters) pill(g, [cx - L / 2, H - .08, cz + side * (span / 2 + .07)], [cx + L / 2, H - .08, cz + side * (span / 2 + .07)], .055, M.zinc, { seg: 8, cast: false }); }
    else { rbox(g, .08, .16, L, M.trim, cx + side * span / 2, H + .03, cz, { r: .03, cast: false }); if (gutters) pill(g, [cx + side * (span / 2 + .07), H - .08, cz - L / 2], [cx + side * (span / 2 + .07), H - .08, cz + L / 2], .055, M.zinc, { seg: 8, cast: false }); }
  });
  if (gutters) {
    const pts = alongX ? [[cx - L / 2 + .15, cz + span / 2 + .07], [cx + L / 2 - .15, cz + span / 2 + .07]] : [[cx - span / 2 - .07, cz + L / 2 - .15], [cx - span / 2 - .07, cz - L / 2 + .15]];
    pts.forEach(([x, z]) => tube(g, .04, .04, H - .2, M.zinc, x, (H - .2) / 2 + .1, z, { seg: 8, cast: false }));
  }
}
function building(g, w, d, kind, M, { clay = false, tag = (m) => m, ctx = null, off = [0, 0], yard = true } = {}) {
  const cx = w / 2, cz = d / 2, house = kind === "house", small = Math.min(w, d) < 4, alongX = w >= d;
  const H = house ? 3.0 : small ? 2.3 : 2.6;
  const wallMat = house ? M.cream : M.barn; // sheds and stores: barn red with white trim (look A)
  contact(g, M, cx, cz, w, d);
  tag(rbox(g, w + .16, .34, d + .16, M.stoneDark, cx, .17, cz, { r: .08 }));
  tag(rbox(g, w, H, d, wallMat, cx, H / 2, cz, { r: Math.min(.24, Math.min(w, d) * .08), seg: 2 }));
  const rise = Math.min(w, d) / 2 * (house ? .6 : .55);
  const dg = new THREE.Group(); dg.position.set(cx, 0, cz); g.add(dg);
  const put = fixtures(w, d);
  if (house) {
    const ov = .5;
    tag(hipRoof(g, cx, cz, w, d, H, rise, ov, clay ? M.roofClay : M.roofSlate, clay ? M.terracotta : M.slateDark, M));
    // chimney with a rounded cap and a thread of soft smoke
    const chx = w * .3 * (alongX ? 1 : .4), chz = -d * .18 * (alongX ? .4 : 1);
    const hh = hipHeight(chx, chz, w + 2 * ov, d + 2 * ov, rise);
    rbox(g, .6, 1.25, .6, M.cream, cx + chx, H + hh - .2 + .62, cz + chz, { r: .08 });
    rbox(g, .74, .12, .74, M.stoneDark, cx + chx, H + hh + .48, cz + chz, { r: .04, cast: false });
    [-.13, .13].forEach((o) => tube(g, .1, .11, .32, M.terracotta, cx + chx + o, H + hh + .68, cz + chz, { seg: 12 }));
    if (ctx) for (let i = 0; i < 6; i++) ctx.motion.smoke.push({ p: [off[0] + cx + chx, H + hh + .8, off[1] + cz + chz], s: .22, phase: i / 6 });
    // door, windows
    const door = .98, doorH = 2.1, wy = 1.5, ww = .9, wh = 1.1;
    doorAt(dg, put, "S", 0, door, doorH, "house", M, d);
    if (ctx) (ctx.glowPools ||= []).push({ x: off[0] + cx, z: off[1] + d + 1.0, r: Math.min(3.2, w * .38) }); // porch light pool after dark
    for (let k = 0; ; k++) { const u = door / 2 + .6 + ww / 2 + k * 1.95; if (u + ww / 2 + .9 > w / 2) break; windowAt(dg, put, "S", u, wy, ww, wh, M, { shutters: true }); windowAt(dg, put, "S", -u, wy, ww, wh, M, { shutters: true }); }
    const nE = Math.max(0, Math.floor((d - 1.0) / 2.0));
    for (let i = 0; i < nE; i++) { const u = (i - (nE - 1) / 2) * 2.0; windowAt(dg, put, "W", u, wy, ww, wh, M); windowAt(dg, put, "E", u, wy, ww, wh, M); }
    const nN = Math.max(0, Math.floor((w - 1.0) / 2.2));
    for (let i = 0; i < nN; i++) windowAt(dg, put, "N", (i - (nN - 1) / 2) * 2.2, wy, ww, wh, M);
    dg.add(put(rm(.1, .16, .1, M.lamp, .03), "S", door / 2 + .32, doorH - .2, .07)); // a lamp beside the door (glows at night)
    // window boxes with flowers under the front windows, a doormat on the step, a downpipe down the front corner
    for (let k = 0; ; k++) { const u = door / 2 + .6 + ww / 2 + k * 1.95; if (u + ww / 2 + .9 > w / 2) break; [u, -u].forEach((uu) => { dg.add(put(rm(ww + .1, .2, .22, M.woodDark, .04), "S", uu, wy - wh / 2 - .26, .16)); for (let i = 0; i < 4; i++) { const b = put(new THREE.Mesh(sphereGeo(9, 7), M.flower[(k * 4 + i) % M.flower.length]), "S", uu - ww / 2 + .12 + i * (ww - .24) / 3, wy - wh / 2 - .1, .2); b.scale.set(.07, .06, .07); dg.add(b); } }); }
    dg.add(put(rm(door * .9, .025, .5, M.woodDark, .008), "S", 0, .17, .4, { cast: false }));
    pill(dg, [w / 2 - .12, .05, d / 2 + ov + .03], [w / 2 - .12, H + .02, d / 2 + ov + .03], .035, M.trim, { seg: 8, cast: false });
    solarPanels(g, cx, cz, w + 2 * ov, d + 2 * ov, H, rise, M);
    // paved apron with a clipped hedge border, round bushes at the corners and flowers by the door
    // (not for the house behind a back garden: its patio and the garden fences take that place)
    const ap = 1.3;
    if (yard) {
    plane(g, w + 2 * ap, d + 2 * ap, M.pavers, cx, .009, cz);
    const hx0 = -ap + .3, hx1 = w + ap - .3, hz0 = -ap + .3, hz1 = d + ap - .3, gapW = 2.2;
    hedge(g, [[[hx0, hz0], [hx1, hz0]], [[hx0, hz0], [hx0, hz1]], [[hx1, hz0], [hx1, hz1]], [[hx0, hz1], [cx - gapW / 2, hz1]], [[cx + gapW / 2, hz1], [hx1, hz1]]], M, { h: .55, t: .5 });
    [[hx0 + .7, hz0 + .7], [hx1 - .7, hz0 + .7], [hx0 + .7, hz1 - .7], [hx1 - .7, hz1 - .7]].forEach(([x, zz], i) => ORNAMENTS.bush(g, x, zz, { seed: i + 2, s: .8 }));
    ORNAMENTS.flowers(g, cx - door / 2 - .9, d + .55, { seed: 3, s: .7 }); ORNAMENTS.flowers(g, cx + door / 2 + .9, d + .55, { seed: 5, s: .7 });
    if (ctx) ctx.details.push({ kind: "barrel", x: off[0] + w + ap - .55, z: off[1] + d * .5 - .2, ry: 0 }, { kind: "birdbath", x: off[0] + hx0 + 1.7, z: off[1] + d + ap - .9 });
    }
  } else {
    gableRoof(g, cx, cz, w, d, H, rise, .4, clay ? M.roofClay : M.roofSlate, wallMat, alongX, clay ? M.terracotta : M.slateDark, M);
    const wide = w > 2.4;
    doorAt(dg, put, "S", wide ? -w * .18 : 0, .95, Math.min(1.95, H - .3), "shed", M, d);
    if (wide) windowAt(dg, put, "S", w * .25, H * .58, .7, .7, M, { sill: true });
    if (d > 2.6) windowAt(dg, put, "W", 0, H * .58, .7, .7, M, { sill: true });
    { // look A: red board walls with darker battens (the door and windows stay clear)
      const by = .36, bh = H - .44, du = cx + (wide ? -w * .18 : 0), sk = [[du - .55, du + .55]]; if (wide) sk.push([cx + w * .25 - .45, cx + w * .25 + .45]);
      battens(g, 0, d, w, d, by, bh, M.barnDark, [0, 1], sk); battens(g, 0, 0, 0, d, by, bh, M.barnDark, [-1, 0], d > 2.6 ? [[cz - .45, cz + .45]] : []);
      battens(g, w, 0, w, d, by, bh, M.barnDark, [1, 0]); battens(g, 0, 0, w, 0, by, bh, M.barnDark, [0, -1]);
    }
    // white corner boards and a crate stack beside the shed
    [[0, 0], [w, 0], [0, d], [w, d]].forEach(([x, zz]) => rbox(g, .14, H - .1, .14, M.trim, x, H / 2 - .05, zz, { r: .05, cast: false }));
    if (ctx) ctx.details.push({ kind: "crates", x: off[0] + w + .55, z: off[1] + d * .3, ry: .3 });
    if (w >= 2.2) { const wp = ORNAMENTS.woodpile; if (wp) wp(g, -.55, d * .55, { seed: 4 }); rake(g, -.28, d * .18, { ry: HPI }); }
    tube(g, .26, .24, .7, M.greenDeep, w + .35, .35, d * .75, { seg: 16 }); ring(g, .265, .02, M.dark, w + .35, .68, d * .75, { tube: 5, seg: 18, cast: false }); // water butt
  }
  dg.traverse((m) => { if (m.isMesh) tag(m); });
  return { H, rise };
}

/* ---------- animal housing: chicken coop and barn ----------
   Both are a building at the back of the zone with a fenced outdoor area in front (toward the
   camera), inside the zone's own footprint, so the flock or herd can be seen indoors and out.
   Walls are hollow slabs with real openings, so the inside (bedding, roosts, stalls, loft) shows
   through the open doors. MARKER: GROVE_3D_HOUSING_V2 */
function slabWall(len, H, openings, at) { // solid pieces between openings, a header above each; at(u, y0, uw, uh)
  let u = 0; const ops = [...openings].sort((a, b) => a.x0 - b.x0);
  ops.forEach((o) => { const x0 = Math.max(u, o.x0), x1 = Math.min(len, o.x1); if (x1 <= x0) return; if (x0 > u + .01) at(u, 0, x0 - u, H); if (o.h < H - .02) at(x0, o.h, x1 - x0, H - o.h); u = x1; });
  if (u < len - .01) at(u, 0, len - u, H);
}
function meshFence(g, ctx, segs, M, { h = 1.6, off = [0, 0] } = {}) { // poultry netting: round posts, a top rail, a soft translucent mesh between
  const posts = [];
  segs.forEach(([a, b]) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < .05) return;
    const ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]), n = Math.max(2, Math.ceil(len / 1.4) + 1), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    for (let j = 0; j < n; j++) { const t = j / (n - 1); posts.push({ p: [a[0] + (b[0] - a[0]) * t, h / 2, a[1] + (b[1] - a[1]) * t] }); }
    rbox(g, len, .08, .08, M.wood, mx, h - .04, mz, { ry, r: .03, cast: false });
    rbox(g, len, .06, .06, M.wood, mx, .14, mz, { ry, r: .025, cast: false });
    plane(g, len, h - .2, M.netting, mx, (h - .2) / 2 + .14, mz, { rx: 0, ry, cast: false, receive: false });
  });
  instances(g, capsuleGeo(.05, h - .1, 8, 3), M.woodDark, posts);
  ctx.tufts && tuftsIn(ctx, Math.min(16, posts.length), 5, (i) => { const p = posts[i]; return p ? [p.p[0] + .12, p.p[2] + .1] : [null]; }, { off });
}
function coopZone(g, z, ctx, tag) {
  const { M } = ctx, w = z.wM, d = z.hM, cx = w / 2, off = [z.xM, z.yM];
  // the run: pale worn grass, bare earth where the birds scratch by the house
  tag(plane(g, w, d, M.lawn(0xc8ddb0), cx, .01, d / 2));
  const hw = clamp(w * .55, 1.6, Math.min(5.5, w - .7)), hd = clamp(d * .4, 1.4, 3.0), hx = cx - hw / 2, hz = .35, floorY = .45, H = 1.5, t = .08;
  const hcx = cx, hcz = hz + hd / 2, wallMat = M.wood, trim = M.trim;
  contact(g, M, hcx, hcz, hw, hd);
  plane(g, hw + 1.2, hd + 1.6, M.earth(0xd8c6a6), hcx, .012, hcz + .3);
  // legs and floor
  [[hx + .1, hz + .1], [hx + hw - .1, hz + .1], [hx + .1, hz + hd - .1], [hx + hw - .1, hz + hd - .1], [hcx, hz + .1], [hcx, hz + hd - .1]].forEach(([x, zz]) => tag(rbox(g, .13, floorY, .13, M.woodDark, x, floorY / 2, zz, { r: .04 })));
  tag(rbox(g, hw + .1, .08, hd + .1, M.woodMid, hcx, floorY - .04, hcz, { r: .03 }));
  plane(g, hw - .12, hd - .12, M.hayFloor, hcx, floorY + .004, hcz); // deep-litter bedding
  // walls: hollow, with a pop door and a keeper's door on the front
  const popU = hw * .2, popW = .4, popH = .44, doorU = hw * .7, doorW = Math.min(.74, hw * .4), doorH = Math.min(1.36, H - .12);
  const wallS = (u, y0, uw, uh) => tag(rbox(g, uw, uh, t, wallMat, hx + u + uw / 2, floorY + y0 + uh / 2, hz + hd - t / 2, { r: .02, seg: 1 }));
  slabWall(hw, H, [{ x0: popU - popW / 2, x1: popU + popW / 2, h: popH }, { x0: doorU - doorW / 2, x1: doorU + doorW / 2, h: doorH }], wallS);
  tag(rbox(g, hw, H, t, wallMat, hcx, floorY + H / 2, hz + t / 2, { r: .02, seg: 1 }));
  tag(rbox(g, t, H, hd, wallMat, hx + t / 2, floorY + H / 2, hcz, { r: .02, seg: 1 })); tag(rbox(g, t, H, hd, wallMat, hx + hw - t / 2, floorY + H / 2, hcz, { r: .02, seg: 1 }));
  [[hx, hz], [hx + hw, hz], [hx, hz + hd], [hx + hw, hz + hd]].forEach(([x, zz]) => rbox(g, .1, H + .04, .1, trim, x, floorY + H / 2, zz, { r: .035, cast: false }));
  const rise = Math.max(.42, hd * .32);
  gableRoof(g, hcx, hcz, hw, hd, floorY + H, rise, .34, M.roofSlate, wallMat, true, M.slateDark, M, { thick: .12, gutters: false });
  // pop door: a dark opening, the sliding hatch pushed up above it, and a cleated ramp down to the run
  const px = hx + popU, fz = hz + hd;
  plane(g, popW - .02, popH - .02, M.ink, px, floorY + popH / 2, fz + .002, { rx: 0, cast: false });
  rbox(g, popW + .12, popH * .55, .04, M.woodDark, px, floorY + popH + popH * .3, fz + .035, { r: .015, cast: false });
  [-1, 1].forEach((s) => rbox(g, .04, popH * 1.4, .05, M.metal, px + s * (popW / 2 + .08), floorY + popH * .75, fz + .035, { r: .015, cast: false }));
  const rl = Math.hypot(1.3, floorY), ra = Math.atan2(floorY, 1.3);
  tag(rbox(g, .42, .05, rl, M.woodMid, px, floorY / 2 + .01, fz + .65, { rx: ra, r: .02 }));
  const cleats = []; for (let k = -3; k <= 3; k++) { const tt = k * .17; cleats.push({ p: [px, floorY / 2 + .045 - tt * Math.sin(ra), fz + .65 + tt * Math.cos(ra)], rx: ra }); }
  instances(g, rboxGeo(.38, .035, .035, .012, 1), M.woodDark, cleats, { cast: false });
  // keeper's door, swung open against the wall; the inside shows through it
  const dx = hx + doorU;
  plane(g, doorW - .02, doorH - .02, M.ink, dx, floorY + doorH / 2, fz + .002, { rx: 0, cast: false });
  rbox(g, doorW + .14, .09, .06, trim, dx, floorY + doorH + .045, fz + .025, { r: .025, cast: false });
  { const leaf = new THREE.Group(); leaf.position.set(dx + doorW / 2, floorY, fz + .04); leaf.rotation.y = -1.9; g.add(leaf); rbox(leaf, doorW, doorH, .05, M.green, doorW / 2, doorH / 2, 0, { r: .02 }); rbox(leaf, doorW - .12, .07, .015, M.greenDeep, doorW / 2, doorH - .13, .03, { r: .006, cast: false }); rbox(leaf, doorW - .12, .07, .015, M.greenDeep, doorW / 2, .13, .03, { r: .006, cast: false }); }
  // inside: two roost bars on A-frame supports at the back, a feed hopper by the door
  const rz0 = hz + hd * .32, rz1 = hz + hd * .55, rh0 = floorY + .5, rh1 = floorY + .72;
  [hx + .25, hx + hw - .25].forEach((x) => { pill(g, [x, floorY, rz0 - .15], [x, rh1 + .04, rz1 - .1], .022, M.woodDark, { seg: 6 }); pill(g, [x, floorY, rz1 + .25], [x, rh1 + .04, rz1 - .1], .022, M.woodDark, { seg: 6 }); });
  pill(g, [hx + .2, rh0, rz0], [hx + hw - .2, rh0, rz0], .03, M.wood, { seg: 8 }); pill(g, [hx + .2, rh1, rz1], [hx + hw - .2, rh1, rz1], .03, M.wood, { seg: 8 });
  tube(g, .11, .1, .3, M.zinc, hx + hw - .35, floorY + .15, fz - .35, { seg: 14 });
  // nest boxes hang off the side wall: a rounded box with a sloping lid, one nest per 3-4 hens
  { const nn = Math.max(2, Math.min(4, Math.round(hd / .4))), nl = nn * .36, nx = hx - .25, nz = hz + hd / 2, ny = floorY + .12;
    tag(rbox(g, .5, .4, nl, wallMat, nx, ny + .2, nz, { r: .03 })); rbox(g, .52, .05, nl + .06, trim, nx, ny + .02, nz, { r: .015, cast: false });
    rbox(g, .6, .05, nl + .12, M.slate, nx - .04, ny + .47, nz, { rz: .38, r: .02 }); }
  // window with a top-hung shutter propped open
  { const wx = hx + hw, wy = floorY + H * .6, wz = hz + hd * .4, ww = .5, wh = .45;
    rbox(g, .05, wh + .12, ww + .12, trim, wx + .02, wy, wz, { r: .02, cast: false }); plane(g, ww - .02, wh - .02, M.ink, wx + .05, wy, wz, { rx: 0, ry: HPI, cast: false });
    const sh = new THREE.Group(); sh.position.set(wx + .07, wy + wh / 2 + .05, wz); sh.rotation.z = -.9; g.add(sh); rbox(sh, .04, wh + .08, ww + .08, M.woodMid, 0, -(wh + .08) / 2, 0, { r: .015 });
    pill(g, [wx + .07, wy - wh / 2, wz + ww / 2 + .02], [wx + .5, wy + .05, wz + ww / 2 + .02], .015, M.metal, { seg: 5 }); }
  // the run: netting round the whole zone, a gate on the front, a hanging feeder, a bell drinker,
  // a dust bath, an outdoor perch and a lidded feed bin by the house
  const gw = Math.min(1.0, w * .3), gx = Math.min(w - gw / 2 - .3, hx + hw + Math.max(.6, (w - hx - hw) / 2));
  meshFence(g, ctx, [[[0, 0], [w, 0]], [[0, 0], [0, d]], [[w, 0], [w, d]], [[0, d], [gx - gw / 2 - .05, d]], [[gx + gw / 2 + .05, d], [w, d]]], M, { off });
  gate(g, gx, d, gw, 0, M, { pickets: true });
  const runZ0 = fz + .5, runZ1 = d - .35, runW = w - .7;
  if (runZ1 - runZ0 > 1.0) {
    const fx = clamp(hx + hw * .35, .6, w - .6), fzz = runZ0 + (runZ1 - runZ0) * .35;
    pill(g, [fx, 0, fzz], [fx, 1.3, fzz], .04, M.woodDark, { seg: 7 }); pill(g, [fx, 1.28, fzz], [fx + .3, 1.28, fzz], .025, M.woodDark, { seg: 6 }); bar(g, [fx + .3, 1.28, fzz], [fx + .3, .62, fzz], .008, M.metal, { seg: 4 });
    tube(g, .14, .14, .3, M.zinc, fx + .3, .47, fzz, { seg: 16 }); tube(g, .21, .18, .07, M.green, fx + .3, .3, fzz, { seg: 16 });
    const bx = clamp(hx + hw * .9, .6, w - .6), bzz = runZ0 + (runZ1 - runZ0) * .6;
    tube(g, .07, .16, .26, M.white, bx, .17, bzz, { seg: 14 }); tube(g, .18, .18, .05, M.green, bx, .03, bzz, { seg: 16 }); tube(g, .025, .025, .1, M.green, bx, .35, bzz, { seg: 6 });
    if (runW > 2.4) { const dbx = clamp(w * .25, .7, w - .7), dbz = runZ1 - .5; disc(g, .45, M.earth(0xe6d9bd), dbx, .014, dbz, { seg: 20 }); [[-.3, .1], [.25, -.2]].forEach(([a, b]) => ball(g, [.09, .06, .08], M.rock, dbx + a, .05, dbz + b, { seg: 9, rings: 7 })); }
    if (runW > 3) { const pzz = runZ0 + (runZ1 - runZ0) * .8, p0 = clamp(w * .6, 1, w - 1.8), p1 = p0 + 1.2; [p0, p1].forEach((x) => pill(g, [x, 0, pzz], [x, .56, pzz], .04, M.woodDark, { seg: 7 })); pill(g, [p0 - .1, .56, pzz], [p1 + .1, .56, pzz], .035, M.bark, { seg: 8 }); }
    tuftsIn(ctx, Math.min(24, Math.round(w * d / 5)), z.id.length * 7 + 3, (i) => [.4 + srand(i * 5 + 2) * (w - .8), runZ0 + srand(i * 3 + 1) * (runZ1 - runZ0)], { off });
    ORNAMENTS.flowers(g, .45, d - .5, { seed: z.id.length, s: .55 });
  }
  tube(g, .22, .22, .55, M.zinc, hx + hw + .36, .275, hz + .4, { seg: 16 }); tube(g, .24, .24, .05, M.zinc, hx + hw + .36, .575, hz + .4, { seg: 16, cast: false });
  return { arena: { x0: .35, x1: w - .35, z0: Math.min(runZ0, d - 1.2), z1: runZ1 }, home: { x: px, z: fz + .55 }, inside: [{ x: hx + hw * .4, y: floorY, z: hz + hd * .45 }, { x: hx + hw * .75, y: floorY, z: hz + hd * .7 }] };
}
function barnZone(g, z, ctx, tag) {
  const { M } = ctx, w = z.wM, d = z.hM, cx = w / 2, off = [z.xM, z.yM];
  // the barn takes the back of the zone; the rest is the yard. Small zones are all barn.
  let bd = clamp(d * .5, 3, 9); const yard = d - bd >= 2.4; if (!yard) bd = d;
  const bw = w, bcz = bd / 2, small = Math.min(bw, bd) < 4, H = small ? 2.6 : 4.0, t = .14, alongX = bw >= bd, base = .32;
  const wallMat = M.barn, trim = M.trim, floorY = base + .005;
  contact(g, M, cx, bcz, bw, bd);
  tag(rbox(g, bw + .16, base, bd + .16, M.stoneDark, cx, base / 2, bcz, { r: .08 }));
  plane(g, bw - .1, bd - .1, M.earth(0xb7a289), cx, floorY, bcz); // packed earth floor, dark under the roof
  // hollow walls; the front one has the big doorway
  const dw = Math.min(3.2, bw * .42), dh = Math.min(H * .74, 3.0), wh = H - base;
  tag(rbox(g, bw, wh, t, wallMat, cx, base + wh / 2, t / 2, { r: .03, seg: 1 }));
  tag(rbox(g, t, wh, bd, wallMat, t / 2, base + wh / 2, bcz, { r: .03, seg: 1 })); tag(rbox(g, t, wh, bd, wallMat, bw - t / 2, base + wh / 2, bcz, { r: .03, seg: 1 }));
  slabWall(bw, wh, [{ x0: cx - dw / 2, x1: cx + dw / 2, h: dh - base }], (u, y0, uw, uh) => tag(rbox(g, uw, uh, t, wallMat, u + uw / 2, base + y0 + uh / 2, bd - t / 2, { r: .03, seg: 1 })));
  { const bh = wh - .1; // look A: board battens on the red walls, clear of the big doorway
    battens(g, 0, bd, bw, bd, base, bh, M.barnDark, [0, 1], [[cx - dw / 2, cx + dw / 2]]); battens(g, 0, 0, 0, bd, base, bh, M.barnDark, [-1, 0]);
    battens(g, bw, 0, bw, bd, base, bh, M.barnDark, [1, 0]); battens(g, 0, 0, bw, 0, base, bh, M.barnDark, [0, -1]); }
  [[0, 0], [bw, 0], [0, bd], [bw, bd]].forEach(([x, zz]) => rbox(g, .18, H, .18, trim, x, H / 2, zz, { r: .06, cast: false }));
  if (!small && bw >= 7) { const sr = Math.min(.9, bd * .16); silo(g, bw - sr - .4, -sr - .45, { r: sr, h: H + 1.4 }); } // a feed silo behind the barn, by the back corner
  const rise = Math.min(bw, bd) / 2 * .7;
  gableRoof(g, cx, bcz, bw, bd, H, rise, .4, z.color === "clay" ? M.roofClay : M.roofSlate, wallMat, alongX, z.color === "clay" ? M.terracotta : M.slateDark, M, { thick: .18 });
  // sliding door on an overhead track, rolled open to one side
  const fz = bd, tz = fz + .18, ty = dh + .3;
  rbox(g, dw * 2.05, .09, .09, M.metal, cx + dw * .45, ty, tz, { r: .03, cast: false });
  [[cx - dw / 2 - .1], [cx + dw / 2 + .1], [cx + dw * 1.35]].forEach(([x]) => rbox(g, .1, .18, .1, M.metal, x, ty - .04, tz - .09, { r: .03, cast: false }));
  { const lx = cx + dw * .98, ly = base + (dh - base) / 2 + .02, lz = fz + .1, pw = dw - .08, ph = dh - base + .06;
    tag(rbox(g, pw, ph, .08, M.white, lx, ly, lz, { r: .03 }));
    [lx - pw / 4, lx + pw / 4].forEach((x) => { const bl = Math.hypot(pw / 2 - .05, ph - .2) - .1, ba = Math.atan2(pw / 2 - .05, ph - .2); rbox(g, pw / 2 - .05, .1, .03, M.barnDark, x, ly + ph / 2 - .1, lz + .05, { r: .012, cast: false }); rbox(g, pw / 2 - .05, .1, .03, M.barnDark, x, ly - ph / 2 + .1, lz + .05, { r: .012, cast: false }); rbox(g, .1, bl, .03, M.barnDark, x, ly, lz + .05, { rz: ba, r: .012, cast: false }); rbox(g, .1, bl, .03, M.barnDark, x, ly, lz + .05, { rz: -ba, r: .012, cast: false }); });
    [-1, 1].forEach((s) => { rbox(g, .08, .14, .08, M.metal, lx + s * pw * .35, ty - .08, tz - .05, { r: .025, cast: false }); bar(g, [lx + s * pw * .35, ty - .12, tz - .07], [lx + s * pw * .35, ly + ph / 2 - .02, lz], .018, M.metal, { seg: 5 }); }); }
  // inside: stalls with rounded plank partitions and straw bedding down one side, a feed passage with a
  // trough along the back wall, water buckets, a hay loft with a ladder over the back half
  const stallD = Math.min(2.4, bw * .38), nStall = Math.max(1, Math.floor((bd - .6) / 2.0)), stallL = (bd - .6) / nStall, sx0 = t, hasLoft = !small && bd > 4.5;
  const inside = [];
  for (let i = 0; i < nStall; i++) {
    const z0 = .3 + i * stallL, zc = z0 + stallL / 2;
    plane(g, stallD - .1, stallL - .1, M.hayFloor, sx0 + stallD / 2, floorY + .004, zc);
    if (i) tag(rbox(g, stallD, 1.25, .08, M.wood, sx0 + stallD / 2, base + .62, z0, { r: .03 }));
    rbox(g, .08, 1.25, stallL - .3, M.wood, sx0 + stallD, base + .62, zc, { r: .03 }); // stall front, half-height, leaves a gap for the gate
    rbox(g, .1, 1.3, .1, M.woodDark, sx0 + stallD, base + .65, z0 + .05, { r: .035, cast: false });
    tube(g, .13, .11, .3, M.zinc, sx0 + stallD - .25, base + .15, z0 + .3, { seg: 12 });
    if (inside.length < 2 && (!yard || stallL > 1.6)) inside.push({ x: sx0 + stallD * .5, y: base, z: zc });
  }
  tag(rbox(g, stallD, 1.25, .08, M.wood, sx0 + stallD / 2, base + .62, .3, { r: .03 })); // back partition of the first stall
  rbox(g, bw - stallD - .8, .42, .44, M.woodDark, sx0 + stallD + (bw - stallD - .8) / 2 + .2, base + .21, t + .25, { r: .06 }); ball(g, [(bw - stallD - .9) / 2, .1, .15], M.hay, sx0 + stallD + (bw - stallD - .8) / 2 + .2, base + .42, t + .25, { seg: 12, rings: 6, cast: false });
  [0, 1].forEach((k) => rbox(g, .9, .5, .5, M.hay, bw - .75, base + .25 + k * .5, bd - 1.2 - k * .1, { ry: k * .15, r: .12 }));
  if (hasLoft) {
    const ly = H * .55, ld = bd * .48;
    tag(rbox(g, bw - 2 * t, .12, ld, M.woodMid, cx, ly, t + ld / 2, { r: .03 }));
    rbox(g, bw - 2 * t, .1, .1, M.woodDark, cx, ly - .1, t + ld, { r: .03, cast: false });
    for (let k = 0; k < Math.min(6, Math.floor(bw / 1.1)); k++) rbox(g, .9, .5, .5, M.hay, t + .6 + k * 1.05, ly + .32, t + .5 + (k % 2) * .55, { ry: (k % 3) * .1, r: .12 });
    const lxx = bw - .6; [-.2, .2].forEach((s) => pill(g, [lxx + s, base, t + ld + .9], [lxx + s, ly + .3, t + ld - .1], .03, M.woodDark, { seg: 6 }));
    for (let k = 1; k < 8; k++) { const f = k / 8; pill(g, [lxx - .2, base + (ly + .3 - base) * f, t + ld + .9 - f], [lxx + .2, base + (ly + .3 - base) * f, t + ld + .9 - f], .02, M.woodDark, { seg: 5 }); }
  }
  // loft door and hoist beam on the gable end, windows beside the door, a cupola with a weather vane
  const dg = new THREE.Group(); dg.position.set(cx, 0, bcz); g.add(dg); const put = fixtures(bw, bd);
  if (bw > dw + 2.6) [-1, 1].forEach((s) => windowAt(dg, put, "S", s * (dw / 2 + 1.0), H * .6, .7, .7, M, { sill: false }));
  if (!small) {
    const gf = alongX ? "W" : "S", gy = H + rise * .32;
    dg.add(put(rm(1.05, 1.2, .08, trim, .03), gf, 0, gy, .04)); dg.add(put(rm(.86, 1.0, .06, M.barnDark, .02), gf, 0, gy, .08));
    const bx = alongX ? -bw / 2 : 0, bz = alongX ? 0 : bd / 2;
    pill(dg, [bx, H + rise * .8, bz], [bx - (alongX ? .75 : 0), H + rise * .8, bz + (alongX ? 0 : .75)], .055, M.woodDark, { seg: 7 });
    const cy = H + rise + .38;
    rbox(g, .75, .62, .75, M.white, cx, cy, bcz, { r: .08 });
    [-1, 1].forEach((s) => { for (let i = 0; i < 3; i++) rbox(g, .5, .05, .04, M.slateDark, cx, cy - .18 + i * .16, bcz + s * .38, { r: .012, cast: false }); });
    const cap = new THREE.Mesh(hipRoofGeo(.75, .75, .32, .12, true).geo, M.slateDark); cap.position.set(cx, cy + .31, bcz); cap.castShadow = true; g.add(cap);
    bar(g, [cx, cy + .6, bcz], [cx, cy + 1.1, bcz], .018, M.metal, { seg: 6, cast: false });
    const vane = new THREE.Group(); vane.position.set(cx, cy + 1.08, bcz); vane.rotation.y = .6; g.add(vane); // the arrow's tip points to local −x; applySky turns it into the wind
    rbox(vane, .34, .05, .02, M.metal, 0, 0, 0, { r: .008, cast: false }); rbox(vane, .12, .12, .02, M.metal, .17, 0, 0, { r: .008, cast: false });
    if (ctx.vanes) { ctx.vanes.push(vane); vane.children.forEach((m) => ctx.keep.push(m)); }
  }
  dg.traverse((m) => { if (m.isMesh) tag(m); });
  // the yard: trampled earth, a concrete apron at the door, post-and-rail fence with a gate,
  // water trough, hay rack, a lean-to shelter beside the door, a muck heap in the far corner
  let arena;
  if (yard) {
    const y0 = bd, yd = d - bd, ycz = bd + yd / 2;
    tag(plane(g, w, yd, M.earth(), cx, .011, ycz));
    plane(g, dw + 1.6, 2.4, M.concrete, cx, .014, y0 + 1.2);
    disc(g, 1, M.earth(0xb9a68c), w - 1.6, .013, y0 + 1.6, { seg: 20, sx: 1.1, sz: .8 }); // mud round the trough
    const gw = Math.min(2.4, w * .3);
    fence(ctx, [[[0, y0], [0, d]], [[w, y0], [w, d]], [[0, d], [cx - gw / 2 - .1, d]], [[cx + gw / 2 + .1, d], [w, d]]], { off });
    gate(g, cx, d, gw, 0, M);
    tag(rbox(g, 1.4, .5, .62, M.zinc, w - 1.3, .25, y0 + 1.0, { r: .08 })); plane(g, 1.3, .52, M.water, w - 1.3, .48, y0 + 1.0);
    pill(g, [w - .02, .05, y0 + .4], [w - .02, .75, y0 + .4], .028, M.zinc, { seg: 7 }); pill(g, [w - .02, .75, y0 + .4], [w - 1.0, .75, y0 + .4], .028, M.zinc, { seg: 7 }); pill(g, [w - 1.0, .75, y0 + .4], [w - 1.0, .55, y0 + .8], .028, M.zinc, { seg: 7 });
    if (w > 5) { const hx = 1.1, hzz = y0 + 1.0; rbox(g, 1.3, .95, .8, M.woodMid, hx, .48, hzz, { r: .06 }); ball(g, [.6, .25, .32], M.hay, hx, .95, hzz, { seg: 12, rings: 7 }); for (let k = 0; k < 6; k++) bar(g, [hx - .55 + k * .22, .5, hzz + .42], [hx - .45 + k * .22, .95, hzz + .42], .014, M.metal, { seg: 5 }); }
    const lw = (w - dw) / 2 - .9;
    if (lw >= 1.8 && yd > 3.2) { const sx = lw / 2 + .3, sg = new THREE.Group(); sg.position.set(sx, 0, y0 + 1.1); g.add(sg); const hi = 2.3, lo = 1.9, sd = 2.0; [[-lw / 2, -sd / 2, hi], [lw / 2, -sd / 2, hi], [-lw / 2, sd / 2, lo], [lw / 2, sd / 2, lo]].forEach(([px, pz, ph]) => rbox(sg, .16, ph, .16, M.woodDark, px, ph / 2, pz, { r: .05 })); const ang = Math.atan2(hi - lo, sd); rbox(sg, lw + .4, .12, Math.hypot(sd + .4, hi - lo), M.slate, 0, (hi + lo) / 2 + .06, 0, { rx: ang, r: .05 }); plane(g, lw - .2, sd - .2, M.hayFloor, sx, .013, y0 + 1.1); }
    if (yd > 3 && w > 4) { const mx = w - 1.0, mz = d - 1.0; ball(g, [.95, .42, .8], M.compost[1], mx, .04, mz, { seg: 16, rings: 10 }); pill(g, [mx - .9, .02, mz + .2], [mx - 1.05, 1.5, mz + .45], .022, M.wood, { seg: 6 }); }
    if (yd > 2.8) { const sx = clamp(cx - dw / 2 - .8, .6, w - .6), szz = d - .8; pill(g, [sx, 0, szz], [sx, .75, szz], .05, M.woodDark, { seg: 8 }); rbox(g, .24, .2, .24, M.trim, sx, .86, szz, { r: .05 }); }
    ORNAMENTS.haybale(g, w - .95, y0 + 2.6, { seed: z.id.length + 1, s: .85 });
    if (w >= 6 && yd >= 4) ctx.details.push({ kind: "tractor", x: off[0] + Math.min(w - 2.2, cx + dw / 2 + 1.9), z: off[1] + y0 + yd * .55, ry: .35 });
    tuftsIn(ctx, Math.min(30, Math.round(w * yd / 4)), z.id.length * 11 + 5, (i) => [.4 + srand(i * 5 + 2) * (w - .8), y0 + .6 + srand(i * 3 + 1) * (yd - 1.0)], { off });
    arena = { x0: .4, x1: w - .4, z0: y0 + 1.3, z1: d - .45 };
    if (arena.z1 - arena.z0 < 1.2) arena.z0 = y0 + .5;
  } else {
    plane(g, w + 1.0, 2.2, M.concrete, cx, .008, d + 1.0);
    const tx = Math.min(w / 2 - .5, dw / 2 + 1.2);
    tag(rbox(g, 1.2, .46, .52, M.zinc, cx + tx, .23, d + .35, { r: .07 })); plane(g, 1.1, .42, M.water, cx + tx, .44, d + .35);
    if (w > 4) { rbox(g, .9, .5, .5, M.hay, cx - tx, .25, d + .35, { r: .12 }); rbox(g, .9, .5, .5, M.hay, cx - tx + .08, .75, d + .3, { r: .12 }); }
    arena = { x0: .3, x1: w - .3, z0: d + .5, z1: d + 2.6 };
  }
  return { arena, inside };
}

/* ---------- zones ---------- */
/* Every plant of a zone (position, size, crop, stage) plus one segment per planted row carrying the
   plot's growth state — the segments drive the stage markers, harvest glow and tooltips. */
function plantingsOf(z, plots, crops, today, actualToday) {
  const out = [], rows = [], vertical = z.rowAxis === "vertical", orchard = z.type === "orchard";
  const push = (x, y, size, crop, stage) => out.push({ x, y, size, crop, stage });
  const info = (plot) => {
    const g = previewGrowthOf(plot, crops.get(plot.crop), today, actualToday);
    const left = plot.harvestDate && !g.waiting ? Math.round(dayNum(plot.harvestDate) - dayNum(today)) : null;
    return { id: plot.id, crop: plot.crop, name: plot.name, count: plot.plantCount || plot.qty || 0, stage: g.index, progress: g.progress, estimated: g.estimated, left, status: plot.status };
  };
  layoutPlots(z, plots).filter((p) => p.layout.version === 2 && p.layout.pattern !== "scatter").forEach((plot) => {
    const pi = info(plot);
    plantingRows(z, plot).forEach((row) => {
      const n = Math.min(90, row.points.length), size = Math.min(row.gapM * .95, row.pitchM * 1.15 * (row.points.length / Math.max(1, n)), .85);
      for (let j = 0; j < n; j++) { const q = row.points[Math.floor(((j + .5) * row.points.length) / n)]; push(q.xM, q.yM, size, plot.crop, pi.stage); }
      if (row.points.length) {
        const rv = !!row.vertical, al = row.points.map((q) => (rv ? q.yM : q.xM)), cr = row.points.map((q) => (rv ? q.xM : q.yM));
        rows.push({ ...pi, vertical: rv, c: cr.reduce((a, b) => a + b, 0) / cr.length, a0: Math.min(...al) - row.pitchM * .4, a1: Math.max(...al) + row.pitchM * .4, gap: row.gapM, size });
      }
    });
  });
  const v1 = plantedRows(z, plots).filter((r) => r.planting?.layout.version !== 2);
  const cross = vertical ? z.wM : z.hM, along = vertical ? z.hM : z.wM;
  const gap = cross / bedRows(z), margin = Math.min(.14, along * .07);
  v1.forEach((row, i) => {
    if (!row.planting) return;
    const pos = row.atM ?? (i + .5) * gap, start = row.pitch ? 0 : margin, length = row.pitch ? row.planting.layout.lengthM : (along - margin * 2) * row.fraction;
    const pi = info(row.planting);
    const n = Math.min(orchard ? 12 : 90, row.count || (row.planting && !row.planting.plantCount ? 4 : 0));
    const size = Math.min((row.pitch || gap) * .95, (length / Math.max(1, n)) * 1.15, orchard ? 4 : .85);
    for (let j = 0; j < n; j++) { const at = start + plantPosition(row, j, n) * length; push(vertical ? pos : at, vertical ? at : pos, size, row.planting.crop, pi.stage); }
    rows.push({ ...pi, vertical, c: pos, a0: start, a1: start + length, gap: row.pitch || gap, size });
  });
  plots.filter((p) => p.zone === z.id && p.status !== "harvested" && p.layout?.pattern === "scatter").forEach((p) => {
    const pi = info(p), pts = p.layout.points || [];
    pts.forEach((q) => push(q.xM, q.yM, Math.min(4, (p.layout.spacingCM / 100) * .9), p.crop, pi.stage));
    if (pts.length) { const cx = pts.reduce((a, q) => a + q.xM, 0) / pts.length, cy = pts.reduce((a, q) => a + q.yM, 0) / pts.length; rows.push({ ...pi, vertical: false, c: cy, a0: cx, a1: cx, gap: .5, size: .5, scatter: true }); }
  });
  return { plants: out, rows };
}
function rowLines(z) { // centre lines of the bed rows, in zone-local metres
  const vertical = z.rowAxis === "vertical", cross = vertical ? z.wM : z.hM, along = vertical ? z.hM : z.wM, n = bedRows(z), gap = cross / n, out = [];
  for (let i = 0; i < n; i++) { const c = (i + .5) * gap; out.push(vertical ? { x: c, z: along / 2, len: along, ry: HPI, gap } : { x: along / 2, z: c, len: along, ry: 0, gap }); }
  return out;
}
function soilMound(w, d, h, mat) {
  const geo = new THREE.PlaneGeometry(w, d, 10, 8), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / w + .5, v = p.getY(i) / d + .5; p.setZ(i, h * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -HPI; m.receiveShadow = true; return m;
}
function tuftsIn(ctx, count, seed, area, { y = 0, off = [0, 0] } = {}) { // area: () => [x, z]; collected farm-wide, drawn once
  for (let i = 0; i < count; i++) { const [x, z] = area(i); if (x == null) continue; const s = .7 + srand(seed + i) * .7, ry = srand(seed + i + 5) * 3; ctx.tufts.push({ p: [off[0] + x, y, off[1] + z], ry, s }); }
}
const tuftGeos = new Map();
function tuftGeo() { // a clump of seven thin bent blades of different heights, merged: grass tufts and wild flowers are instanced from it
  if (tuftGeos.has("t")) return tuftGeos.get("t");
  const parts = [];
  for (let i = 0; i < 7; i++) { // two upright blades in the middle, five leaning out round them; each bends over toward its tip
    const mid = i < 2, a = (i / 7) * 6.28 + srand(i + 61) * .8, h = (mid ? .34 : .2) + srand(i + 71) * .12, lean = mid ? .08 + i * .1 : .38 + srand(i + 81) * .3, c = new THREE.ConeGeometry(.02, h, 3, 2, true), q = c.attributes.position;
    c.translate(0, h / 2, 0); for (let k = 0; k < q.count; k++) { const y = q.getY(k) / h; q.setZ(k, q.getZ(k) + y * y * h * .32); } c.rotateX(lean); c.rotateY(a); c.translate(Math.sin(a) * .035, 0, Math.cos(a) * .035); c.computeVertexNormals(); parts.push(c);
  }
  const g = mergeGeometries(parts, false); parts.forEach((p) => p.dispose()); g.userData.shared = true; tuftGeos.set("t", g); return g;
}
function buildLife(g, ctx, M) { // flower heads and festoon bulbs collected by balconyLife / gardenLife / windowBoxes
  (ctx.lifeHeads || []).forEach((list, k) => instances(g, sphereGeo(8, 6), M.flower[k], list, { cast: false, receive: false }));
  if (ctx.lifeBulbs?.length) instances(g, sphereGeo(10, 8), M.bulb, ctx.lifeBulbs, { cast: false, receive: false });
}
function buildTufts(g, ctx, M) { instances(g, tuftGeo(), M.tuft, ctx.tufts, { cast: false, receive: true }); }
/* warm light pools on the ground in front of lit doors and round the greenhouse after dark (look A). One instanced
   disc, additive, fading with NIGHT: invisible by day, no lights added to the scene (cheap on phones). */
let glowPoolMat = null;
function buildGlowPools(g, ctx) {
  const pools = ctx.glowPools || []; if (!pools.length) return;
  glowPoolMat ??= new THREE.ShaderMaterial({
    uniforms: { uNight: NIGHT }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: "varying vec2 vP; void main() { vP = position.xy; vec4 p = vec4(position, 1.);\n#ifdef USE_INSTANCING\np = instanceMatrix * p;\n#endif\ngl_Position = projectionMatrix * modelViewMatrix * p; }",
    fragmentShader: "uniform float uNight; varying vec2 vP; void main() { float r = length(vP), a = pow(max(0., 1. - r * r), 1.6) * uNight * .6; gl_FragColor = vec4(vec3(1., .68, .3), a); }",
  });
  const im = instances(g, discGeo(1, 28), glowPoolMat, pools.map((q) => ({ p: [q.x, (q.y || 0) + .09, q.z], rx: -HPI, s: [q.r, q.r, 1] })), { cast: false, receive: false });
  if (im) { im.renderOrder = 20; im.frustumCulled = false; glowPoolMat.polygonOffset = true; glowPoolMat.polygonOffsetFactor = -2; glowPoolMat.polygonOffsetUnits = -40; }
}
function pots(ctx, items, plantsList, off = [0, 0]) { // items: [{x, y, z}] — pot + soil + a small 3D plant, collected farm-wide
  items.forEach((it, i) => { const [crop, stage] = plantsList[i % plantsList.length]; ctx.pots.push({ x: off[0] + it.x, y: it.y, z: off[1] + it.z }); ctx.plants.push({ name: crop, stage, x: off[0] + it.x, y: it.y + .2, z: off[1] + it.z, s: cropScale(.3, stage, crop), ry: srand(i + 11) * 6.28 }); });
}
function buildPots(g, ctx, M) {
  const items = ctx.pots; if (!items.length) return;
  instances(g, cylGeo(.13, .1, .22, 14), M.pot, items.map((it) => ({ p: [it.x, it.y + .11, it.z] })));
  instances(g, new THREE.TorusGeometry(.13, .02, 6, 16), M.potRim, items.map((it) => ({ p: [it.x, it.y + .215, it.z], rx: HPI })), { cast: false });
  instances(g, new THREE.CircleGeometry(.12, 12), M.soil(PAL.soilDark), items.map((it) => ({ p: [it.x, it.y + .2, it.z], rx: -HPI })), { cast: false });
}
function benchSlatted(g, M, bx, bz, bw, bd, y = .8) {
  const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => ({ p: [bx + sx * (bw / 2 - .1), y / 2, bz + sz * (bd / 2 - .1)] }));
  instances(g, rboxGeo(.08, y, .08, .03, 1), M.woodDark, legs);
  rbox(g, bw, .07, .09, M.woodDark, bx, y - .07, bz - bd / 2 + .12, { r: .025, cast: false }); rbox(g, bw, .07, .09, M.woodDark, bx, y - .07, bz + bd / 2 - .12, { r: .025, cast: false });
  const n = Math.max(3, Math.round(bd / .12)), slats = [];
  for (let i = 0; i < n; i++) slats.push({ p: [bx, y, bz - bd / 2 + (i + .5) * (bd / n)], s: [bw, 1, .72] });
  instances(g, rboxGeo(1, .04, bd / n, .015, 1), M.wood, slats);
}
function plantAt(ctx, name, stage, x, z, y, size) {
  // Slight, stable variation gives rows a lived-in appearance without changing
  // planting positions or letting the visual growth change between renders.
  const variation = .94 + srand(x * 19 + z * 37 + 4) * .12;
  ctx.plants.push({ name, stage, x, y, z, s: cropScale(size, stage, name) * variation, ry: srand(x * 7 + z * 13) * 6.28 });
}

function buildZone(z, ctx) {
  const { data, crops, M } = ctx;
  const g = new THREE.Group(); g.position.set(z.xM, 0, z.yM);
  const w = z.wM, d = z.hM, cx = w / 2, cz = d / 2, plant = isPlantZone(z.type), oval = z.shape === "oval", off = [z.xM, z.yM];
  const tag = (m) => { m.userData.zoneId = z.id; return m; }; // taps use the zone hit box, not the detail meshes
  const plots = data.garden?.plots || [];
  const grown = plant ? plantingsOf(z, plots, crops, ctx.todayKey, ctx.actualToday) : { plants: [], rows: [] };
  let plants = grown.plants; const prows = grown.rows;
  let floor = 0, housing = null;
  if (z.type === "raised" || z.type === "herbs" || z.type === "veg") {
    if (z.type === "raised") {
      const H = .4, t = .07, bm = M.wood;
      // chunky rounded boards on every side, round-capped corner posts, a soil mound, drip lines
      [[cx, 0, w + .1, t, 0], [cx, d, w + .1, t, 0], [0, cz, t, d, HPI], [w, cz, t, d, HPI]].forEach(([x, zz, bw, bd]) => tag(rbox(g, bw, H, bd, bm, x, H / 2, zz, { r: .03, seg: 1 })));
      [[0, 0], [w, 0], [0, d], [w, d]].forEach(([x, zz]) => { tag(rbox(g, .13, H + .1, .13, M.woodDark, x, (H + .1) / 2, zz, { r: .04 })); ball(g, .085, M.woodDark, x, H + .12, zz, { seg: 10, rings: 8 }); });
      floor = H - .07;
      const soil = soilMound(w - .04, d - .04, .05, M.soil()); soil.position.set(cx, floor, cz); tag(soil); g.add(soil);
      const lines = rowLines(z); instances(g, rboxGeo(1, .025, .025, .01, 1), M.dark, lines.map((l) => ({ p: [l.x, floor + .05, l.z], ry: l.ry, s: [l.len - .3, 1, 1] })), { cast: false });
      if (prows.length && prows.every((r) => r.stage <= 2) && Math.min(w, d) <= 1.8) cloche(g, cx, cz, { ry: w >= d ? HPI : 0, len: Math.max(w, d) - .4, w: Math.min(w, d) - .1, y: floor + .02 }); // young plants under a cloche
    } else if (z.type === "herbs") {
      const H = .22, sm = M.stone;
      [[cx, 0, w + .24, .24], [cx, d, w + .24, .24], [0, cz, .24, d], [w, cz, .24, d]].forEach(([x, zz, bw, bd]) => tag(rbox(g, bw, H, bd, sm, x, H / 2, zz, { r: .07 })));
      floor = H - .06;
      const soil = soilMound(w, d, .04, M.soil()); soil.position.set(cx, floor, cz); tag(soil); g.add(soil);
      const lines = rowLines(z); // pale gravel strips between the rows
      for (let i = 1; i < lines.length; i++) { const a = lines[i - 1], b = lines[i]; rbox(g, a.ry ? .16 : (a.len - .2), .02, a.ry ? (a.len - .2) : .16, M.gravel, (a.x + b.x) / 2, floor + .045, (a.z + b.z) / 2, { r: .008, cast: false }); }
    } else {
      // in-ground vegetable rows: soft ridges and furrows, a low rounded board edge
      const soil = plane(g, w, d, M.soil(PAL.soilLight), cx, .012, cz); tag(soil);
      const lines = rowLines(z), rh = .12;
      instances(g, new THREE.CylinderGeometry(1, 1, 1, 14, 1, false, 0, Math.PI), M.soil(), lines.map((l) => ({ p: [l.x, .01, l.z], ry: l.ry, rz: HPI, s: [rh, l.len - .2, Math.min(.34, l.gap * .42)] })));
      floor = rh - .02;
      [[cx, -.03, w + .1, .08], [cx, d + .03, w + .1, .08], [-.03, cz, .08, d], [w + .03, cz, .08, d]].forEach(([x, zz, bw, bd]) => tag(rbox(g, bw, .12, bd, M.woodDark, x, .06, zz, { r: .03, cast: false })));
    }
  } else if (z.type === "container") {
    const patio = plane(g, w, d, M.stoneFloor(0xe4e0d6), cx, .012, cz); tag(patio);
    plants = plants.slice(0, 30);
    // the pot each plant would get, shrunk so neighbouring pots never overlap
    const near = (p) => plants.reduce((m, q) => (q === p ? m : Math.min(m, Math.hypot(q.x - p.x, q.y - p.y))), 9);
    const potR = (p) => Math.min(Math.max(.16, Math.min(.34, (p.size || .6) * .42)), near(p) * .47);
    // A narrow strip (troughs along a railing or wall) or plants packed too close for their own pots: long
    // rounded troughs, about a metre each, along the strip's length, with every plant inside them.
    if (Math.min(w, d) <= .8 || plants.some((p) => potR(p) < .12)) {
      const alongX = w >= d, L = alongX ? w : d, D = alongX ? d : w, nSeg = Math.max(1, Math.round(L / 1.0)), seg = L / nSeg, H = .32;
      // A one-row strip along a balcony's front railing hangs ON the railing, just under the handrail, so the
      // plants show above it instead of hiding behind the balusters (the usual European railing planter).
      const hang = ctx.env === "balcony" && alongX && D <= .8 && z.yM + d >= ctx.fH - .45;
      const nRows = hang ? 1 : Math.max(1, Math.round(D / .6)), rowD = D / nRows, tD = hang ? Math.min(.34, D) : Math.min(.5, rowD - .06);
      const base = hang ? .6 : 0, hangC = hang ? (ctx.fH - z.yM) - .08 - tD / 2 : 0;
      for (let r = 0; r < nRows; r++) for (let k = 0; k < nSeg; k++) {
        const a = (k + .5) * seg, c = hang ? hangC : (r + .5) * rowD, x = alongX ? a : c, zz = alongX ? c : a, tl = seg - .07;
        tag(rbox(g, alongX ? tl : tD, H, alongX ? tD : tl, M.pot, x, base + H / 2, zz, { r: .05 }));
        rbox(g, (alongX ? tl : tD) + .03, .045, (alongX ? tD : tl) + .03, M.potRim, x, base + H - .01, zz, { r: .02, cast: false });
        rbox(g, (alongX ? tl : tD) - .07, .03, (alongX ? tD : tl) - .07, M.soil(PAL.soilDark), x, base + H - .005, zz, { r: .012, cast: false }); // soil just above the trough's top, inside the rim
        if (hang) [-1, 1].forEach((sd) => { const bx = x + sd * (tl / 2 - .14); rbox(g, .05, .5, .05, M.zinc, bx, base + .25, zz + tD / 2 + .04, { r: .02, cast: false }); rbox(g, .05, .05, .16, M.zinc, bx, base + .47, zz + tD / 2 + .04, { r: .02, cast: false }); }); // hooks over the rail
        else [-1, 1].forEach((sd) => rbox(g, alongX ? .08 : tD - .06, .03, alongX ? tD - .06 : .08, M.stoneDark, x + (alongX ? sd * (tl / 2 - .12) : 0), .015, zz + (alongX ? 0 : sd * (tl / 2 - .12)), { r: .012, cast: false })); // little feet
      }
      if (hang) { // the plants move into the hanging trough with it
        const squeeze = (v) => hangC + (v - d / 2) * Math.max(0, tD - .12) / Math.max(.01, d);
        plants.forEach((p) => { p.y = squeeze(p.y); }); prows.forEach((r) => { if (!r.vertical) r.c = squeeze(r.c); });
      }
      floor = base + H - .02;
    } else {
    const potted = plants.length ? plants : [];
    if (!potted.length) { const nx = Math.max(1, Math.floor(w / .8)), nz = Math.max(1, Math.floor(d / .8)); for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) potted.push({ x: ((i + .5) * w) / nx, y: ((j + .5) * d) / nz, size: .6 }); }
    potted.forEach((p) => {
      const r = plants.length ? potR(p) : Math.max(.16, Math.min(.34, (p.size || .6) * .42));
      if (ctx.env === "balcony") {
        disc(g, r * 1.12, M.potRim, p.x, .018, p.y, { seg: 24 });
        ring(g, r * 1.12, .018, M.potRim, p.x, .028, p.y, { tube: 6, seg: 24, cast: false });
      }
      tag(tube(g, r, r * .78, .34, M.pot, p.x, .17, p.y, { seg: 24, open: ctx.env === "balcony" }));
      if (ctx.env === "balcony") tube(g, r * .96, r * .86, .07, flat(PAL.potRim, { side: THREE.DoubleSide }), p.x, .305, p.y, { seg: 24, open: true, cast: false });
      ring(g, r, .028, M.potRim, p.x, .34, p.y, { tube: 7, seg: 20, cast: false });
      disc(g, r * .9, M.soil(PAL.soilDark), p.x, ctx.env === "balcony" ? .29 : .345, p.y, { seg: 24 });
    });
    floor = ctx.env === "balcony" ? .29 : .34;
    }
  } else if (z.type === "orchard" || z.type === "pasture") {
    const pm = M.lawn(z.type === "orchard" ? PAL.orchard : PAL.pasture);
    if (oval && z.type === "pasture") {
      tag(disc(g, 1, pm, cx, .01, cz, { seg: 44, sx: w / 2, sz: d / 2 }));
      const pts = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * 6.283; pts.push([cx + Math.cos(a) * w / 2, cz + Math.sin(a) * d / 2]); }
      fence(ctx, pts.map((p, i) => [p, pts[(i + 1) % 40]]).filter((_, i) => i !== 10), { off });
    } else {
      tag(plane(g, w, d, pm, cx, .01, cz));
      const gw = Math.min(1.5, w * .28), segs = [[[0, 0], [w, 0]], [[0, 0], [0, d]], [[w, 0], [w, d]], [[0, d], [cx - gw / 2 - .1, d]], [[cx + gw / 2 + .1, d], [w, d]]];
      fence(ctx, segs, { pickets: z.type === "orchard", off });
      gate(g, cx, d, gw, 0, M, { pickets: z.type === "orchard" });
    }
    tuftsIn(ctx, Math.min(60, Math.round(w * d / 4)), z.id.length * 13, (i) => [.3 + srand(i * 7 + 1) * (w - .6), .3 + srand(i * 5 + 2) * (d - .6)], { off });
    if (z.type === "orchard") { const ripe = plants.find((p) => p.stage >= 5 && TREE_RE.test((p.crop || "").toLowerCase())); if (ripe) { const fk = Object.keys(FRUIT).find((k) => ripe.crop.toLowerCase().includes(k)) || "apple"; ladder(g, ripe.x + .55, ripe.y + .5, { ry: -.6, h: Math.min(2.4, Math.max(1.4, (ripe.size || 2) * .5 + .6)) }); fruitCrate(g, ripe.x + 1.0, ripe.y + 1.1, { ry: .3, fruit: FRUIT[fk][0], seed: z.id.length }); } }
    if (z.type === "pasture" && w > 3 && d > 3) {
      tag(rbox(g, 1.3, .48, .58, M.zinc, w - 1.0, .24, .55, { r: .08 })); plane(g, 1.2, .48, M.water, w - 1.0, .46, .55);
      if (w >= 7 && d >= 5) shelter(g, w - 2.9, 1.9, 4.2, 2.6, M);
      if (w * d > 60) { rbox(g, 1.2, .95, .8, M.woodMid, 1.0, .48, .7, { r: .06 }); ball(g, [.55, .25, .32], M.hay, 1.0, .95, .7, { seg: 12, rings: 7 }); ORNAMENTS.haybale(g, 2.4, .9, { seed: z.id.length, s: .8 }); hayScatter(g, 1.2, 1.5, { seed: z.id.length, r: 1.0 }); }
    }
  } else if (z.type === "water") {
    const rimH = .5, t = .34, sm = M.stone, cm = M.stoneDark;
    contact(g, M, cx, cz, w + .3, d + .3);
    if (oval) {
      const wall = tube(g, 1, 1, rimH, sm, cx, rimH / 2, cz, { seg: 44, open: true }); wall.scale.set(w / 2 + t, 1, d / 2 + t); wall.material = flat(PAL.stone, { side: THREE.DoubleSide }); tag(wall);
      const inner = tube(g, 1, 1, rimH, sm, cx, rimH / 2, cz, { seg: 44, open: true, cast: false }); inner.scale.set(w / 2, 1, d / 2); inner.material = wall.material;
      const cop = new THREE.Mesh(new THREE.TorusGeometry(1, t / (w / 2) / 2, 10, 44), cm); cop.rotation.x = -HPI; cop.position.set(cx, rimH, cz); cop.scale.set(w / 2 + t / 2, d / 2 + t / 2, 1); cop.castShadow = true; cop.receiveShadow = true; tag(cop); g.add(cop);
      { const pw = new THREE.Mesh(new THREE.RingGeometry(.001, 1, 44, 10), M.pondWater); pw.rotation.x = -HPI; pw.position.set(cx, rimH - .14, cz); pw.scale.set(w / 2, d / 2, 1); pw.receiveShadow = true; g.add(pw); tag(pw); } // dense enough to ripple
    } else {
      [[cx, 0, w + t, t], [cx, d, w + t, t], [0, cz, t, d], [w, cz, t, d]].forEach(([x, zz, bw, bd]) => { tag(rbox(g, bw, rimH, bd, sm, x, rimH / 2, zz, { r: .1 })); tag(rbox(g, bw + .1, .1, bd + .1, cm, x, rimH + .02, zz, { r: .045, cast: false })); });
      { const pw = new THREE.Mesh(new THREE.PlaneGeometry(w, d, Math.max(4, Math.round(w * 3)), Math.max(4, Math.round(d * 3))), M.pondWater); pw.rotation.x = -HPI; pw.position.set(cx, rimH - .14, cz); pw.receiveShadow = true; g.add(pw); tag(pw); }
    }
    // lily pads on the water, reeds at the rim, a short jetty on bigger ponds
    lilyPads(g, cx - w * .18, cz + d * .12, { seed: z.id.length, n: Math.min(6, Math.max(3, Math.round(w * d / 8))), y: rimH - .13, r: Math.min(w, d) * .22 });
    reeds(g, oval ? cx + w * .36 : w - .3, oval ? cz - d * .3 : .35, { seed: z.id.length + 1, h0: rimH + .35 }); reeds(g, oval ? cx - w * .38 : .35, oval ? cz + d * .22 : d - .35, { seed: z.id.length + 2, n: 5, h0: rimH + .3 });
    if (w >= 4 && d >= 3) jetty(g, cx + w * .22, d + t / 2 + .05, { ry: Math.PI, len: Math.min(1.6, d * .35), y: rimH + .02 });
    // inlet pipe with a tap wheel, and an overflow pipe on the far side
    pill(g, [w + t / 2 + .25, .05, cz], [w + t / 2 + .25, rimH + .32, cz], .05, M.zinc, { seg: 10 });
    pill(g, [w + t / 2 + .25, rimH + .32, cz], [w - .3, rimH + .32, cz], .05, M.zinc, { seg: 10 });
    ring(g, .12, .025, M.green, w + t / 2 + .25, rimH + .1, cz, { tube: 7, seg: 16 });
    bar(g, [w + t / 2 + .25, rimH + .1, cz], [w + t / 2 + .25, rimH + .34, cz], .02, M.metal, { seg: 6 });
    pill(g, [-t / 2 - .1, rimH - .2, cz + d * .3], [-t / 2 - .5, rimH - .2, cz + d * .3], .05, M.zinc, { seg: 10 });
  } else if (z.type === "greenhouse") {
    const H = 2.25, kw = .48, alongX = w >= d, rise = Math.max(.6, Math.min(w, d) * .3), F = M.trim;
    (ctx.glowPools ||= []).push({ x: off[0] + cx, z: off[1] + cz, r: Math.max(w, d) * .62 }); // the lit greenhouse spills warm light after dark
    contact(g, M, cx, cz, w, d, .006);
    tag(plane(g, w, d, M.soil(), cx, .01, cz));
    rbox(g, alongX ? w - .2 : .9, .03, alongX ? .9 : d - .2, M.gravel, cx, .02, cz, { r: .01, cast: false });
    // door on the gable end that faces the camera (W when the house runs along x, else S)
    const doorF = alongX ? "W" : "S", dw = .95, km = M.woodPale;
    const kneeS = [[cx, 0, w + .12, .12], [cx, d, w + .12, .12], [0, cz, .12, d], [w, cz, .12, d]];
    kneeS.forEach(([x, zz, bw, bd], i) => {
      const isDoorWall = (doorF === "W" && i === 2) || (doorF === "S" && i === 1);
      if (!isDoorWall) { tag(rbox(g, bw, kw, bd, km, x, kw / 2, zz, { r: .04 })); return; }
      if (doorF === "W") { const s = (d - dw) / 2; tag(rbox(g, .12, kw, s, km, 0, kw / 2, s / 2, { r: .04 })); tag(rbox(g, .12, kw, s, km, 0, kw / 2, d - s / 2, { r: .04 })); }
      else { const s = (w - dw) / 2; tag(rbox(g, s, kw, .12, km, s / 2, kw / 2, d, { r: .04 })); tag(rbox(g, s, kw, .12, km, w - s / 2, kw / 2, d, { r: .04 })); }
    });
    const gh = H - kw, gy = kw + gh / 2;
    const wallS = new THREE.Mesh(rboxGeo(w, gh, .02, 0), M.glass); wallS.position.set(cx, gy, d); g.add(wallS); tag(wallS);
    const wallN = wallS.clone(); wallN.position.set(cx, gy, 0); g.add(wallN);
    const wallW = new THREE.Mesh(rboxGeo(.02, gh, d, 0), M.glass); wallW.position.set(0, gy, cz); g.add(wallW); tag(wallW);
    const wallE = wallW.clone(); wallE.position.set(w, gy, cz); g.add(wallE);
    [[0, 0], [w, 0], [0, d], [w, d]].forEach(([x, zz]) => rbox(g, .12, H, .12, F, x, H / 2, zz, { r: .04 }));
    const nS = Math.max(1, Math.round(w / .95)), nW = Math.max(1, Math.round(d / .95)), posts = [];
    for (let i = 1; i < nS; i++) posts.push({ p: [(w * i) / nS, H / 2, d] }, { p: [(w * i) / nS, H / 2, 0] });
    for (let i = 1; i < nW; i++) posts.push({ p: [0, H / 2, (d * i) / nW] }, { p: [w, H / 2, (d * i) / nW] });
    instances(g, rboxGeo(.07, H, .07, .025, 1), F, posts, { cast: false });
    [kw, (kw + H) / 2 + .1, H].forEach((y) => { rbox(g, w + .08, .08, .08, F, cx, y, d, { r: .03, cast: false }); rbox(g, w + .08, .08, .08, F, cx, y, 0, { r: .03, cast: false }); rbox(g, .08, .08, d + .08, F, 0, y, cz, { r: .03, cast: false }); rbox(g, .08, .08, d + .08, F, w, y, cz, { r: .03, cast: false }); });
    const L = alongX ? w : d, span = alongX ? d : w, slope = Math.hypot(span / 2, rise), ang = Math.atan2(rise, span / 2), nR = Math.max(2, Math.round(L / .95));
    [-1, 1].forEach((side) => {
      const rx = alongX ? side * ang : 0, rz = alongX ? 0 : -side * ang;
      const px = alongX ? cx : cx + side * span / 4, pz = alongX ? cz + side * span / 4 : cz, py = H + rise / 2;
      const slab = new THREE.Mesh(rboxGeo(alongX ? L + .1 : slope, .02, alongX ? slope : L + .1, 0), M.glass);
      slab.position.set(px, py, pz); slab.rotation.set(rx, 0, rz, "YXZ"); g.add(slab); tag(slab);
      const rafters = []; for (let i = 0; i <= nR; i++) { const t = (i / nR) * L; rafters.push({ p: alongX ? [t, py, pz] : [px, py, t], rx, rz }); }
      instances(g, rboxGeo(alongX ? .07 : slope, .08, alongX ? slope : .07, .025, 1), F, rafters, { cast: false });
    });
    if (alongX) pill(g, [-.07, H + rise, cz], [L + .07, H + rise, cz], .07, F, { seg: 10 }); else pill(g, [cx, H + rise, -.07], [cx, H + rise, L + .07], .07, F, { seg: 10 });
    const tri = new THREE.Shape(); tri.moveTo(-span / 2, 0); tri.lineTo(span / 2, 0); tri.lineTo(0, rise); tri.closePath();
    [-1, 1].forEach((side) => {
      const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), M.glass);
      if (alongX) { m.position.set(cx + side * w / 2, H, cz); m.rotation.y = side > 0 ? HPI : -HPI; } else { m.position.set(cx, H, cz + side * d / 2); m.rotation.y = side > 0 ? 0 : Math.PI; }
      g.add(m);
      rbox(g, .07, rise, .07, F, alongX ? cx + side * w / 2 : cx, H + rise / 2, alongX ? cz : cz + side * d / 2, { r: .025, cast: false });
      [-1, 1].forEach((k) => { const a = alongX ? [cx + side * w / 2, H, cz + k * span / 2] : [cx + k * span / 2, H, cz + side * d / 2]; const b = alongX ? [cx + side * w / 2, H + rise, cz] : [cx, H + rise, cz + side * d / 2]; pill(g, a, b, .035, F, { seg: 6, cast: false }); });
    });
    // roof vent, propped open on the sunny slope
    { const a = ang + .5, vs = slope * .45, vl = Math.min(1.2, L * .3), hx = alongX ? cx - L * .2 : cx + Math.cos(a) * vs / 2, hz = alongX ? cz + Math.cos(a) * vs / 2 : cz - L * .2, hy = H + rise - Math.sin(a) * vs / 2;
      const pane = new THREE.Mesh(rboxGeo(alongX ? vl : vs, .02, alongX ? vs : vl, 0), M.glass); pane.position.set(hx, hy, hz); pane.rotation.set(alongX ? a : 0, 0, alongX ? 0 : -a, "YXZ"); g.add(pane);
      rbox(g, alongX ? vl : .05, .05, alongX ? .05 : vl, F, hx, hy, hz, { rx: alongX ? a : 0, rz: alongX ? 0 : -a, r: .02, cast: false });
      [-1, 1].forEach((k) => rbox(g, alongX ? .05 : vs, .05, alongX ? vs : .05, F, alongX ? hx + k * vl / 2 : hx, hy, alongX ? hz : hz + k * vl / 2, { rx: alongX ? a : 0, rz: alongX ? 0 : -a, r: .02, cast: false }));
    }
    // door with a step
    { const dgg = new THREE.Group(); dgg.position.set(cx, 0, cz); g.add(dgg); const put = fixtures(w, d);
      dgg.add(put(rm(dw + .16, 2.0, .08, M.green, .03), doorF, 0, 1.0, .04)); dgg.add(put(rm(dw - .04, 1.86, .02, M.glass, 0), doorF, 0, 1.0, .085));
      dgg.add(put(rm(dw - .04, .05, .04, M.green, .01), doorF, 0, 1.0, .09)); dgg.add(put(rm(.05, 1.86, .04, M.green, .01), doorF, 0, 1.0, .09));
      dgg.add(put(rm(.05, .18, .04, M.metal, .015), doorF, dw * .36, .95, .105)); dgg.add(put(rm(dw + .5, .12, .5, M.concreteSolid, .04), doorF, 0, .06, .25));
      dgg.traverse((m) => { if (m.isMesh) tag(m); }); }
    // benches along the long walls with potted seedlings, a water barrel in a corner
    const bl = L - 2.2, bw = .75;
    if (bl > 1.2 && span > 2.6) [-1, 1].forEach((side) => {
      const bx = alongX ? cx : cx + side * (span / 2 - .5), bz = alongX ? cz + side * (span / 2 - .5) : cz;
      benchSlatted(g, M, bx, bz, alongX ? bl : bw, alongX ? bw : bl, .8);
      const n = Math.min(12, Math.floor(bl / .42)), items = [];
      for (let i = 0; i < n; i++) { const t = -bl / 2 + (i + .5) * (bl / n); items.push({ x: alongX ? bx + t : bx + (srand(i + 3) - .5) * .3, y: .82, z: alongX ? bz + (srand(i + 3) - .5) * .3 : bz + t }); }
      pots(ctx, items, [["Basil", 2], ["Lettuce", 3], ["Tomato", 2], ["Pepper", 3], ["Basil", 3]], off);
    });
    hoseReel(g, alongX ? .45 : w - .45, alongX ? d - .45 : .45, { ry: alongX ? HPI : Math.PI });
    tube(g, .3, .3, .8, M.woodMid, alongX ? w - .5 : .5, .4, alongX ? .55 : d - .55, { seg: 18 }); [.3, .65].forEach((k) => ring(g, .305, .02, M.dark, alongX ? w - .5 : .5, .8 * k, alongX ? .55 : d - .55, { tube: 5, seg: 20, cast: false }));
    floor = 0;
  } else if (z.type === "coop") {
    housing = coopZone(g, z, ctx, tag);
  } else if (z.type === "barn") {
    housing = barnZone(g, z, ctx, tag);
  } else if (z.type === "yard") { // Yard / parking: a pale gravel slab with a lighter rim and white bay lines along the long side
    tag(rbox(g, w, .06, d, M.yardRim, cx, .03, cz, { r: .025, cast: false }));
    tag(rbox(g, w - .2, .05, d - .2, M.yard, cx, .06, cz, { r: .02, cast: false }));
    const long = Math.max(w, d), nb = long >= 5 ? Math.floor(long / 2.6) - 1 : 0;
    for (let i = 0; i < nb; i++) { const u = (i + 1) * 2.6; if (w >= d) rbox(g, .14, .02, d - .7, M.white, u, .1, cz, { r: .006, cast: false }); else rbox(g, w - .7, .02, .14, M.white, cx, .1, u, { r: .006, cast: false }); }
  } else if (z.type === "house" || z.type === "storage") {
    building(g, w, d, z.type, M, { clay: z.color === "clay", tag, ctx, off });
  } else if (z.type === "compost") {
    const H = 1.05, bays = Math.max(1, Math.min(3, Math.floor(w / 1.1))), bw = w / bays;
    contact(g, M, cx, cz, w, d, .009);
    tag(plane(g, w + .4, d + .4, M.earth(0xcbbba2), cx, .012, cz));
    // slatted bays: rounded slats with gaps, round-capped posts
    const slatWall = (x, zz, len, ry, h = H) => { const n = Math.max(3, Math.round(h / .22)); for (let i = 0; i < n; i++) tag(rbox(g, len, .14, .05, M.wood, x, .11 + i * (h / n), zz, { ry, r: .02, seg: 1 })); };
    slatWall(cx, 0, w + .1, 0); slatWall(cx, d, w + .1, 0, H * .5);
    for (let i = 0; i <= bays; i++) { slatWall((w * i) / bays, cz, d, HPI); rbox(g, .12, H + .12, .12, M.woodDark, (w * i) / bays, (H + .12) / 2, 0, { r: .04 }); rbox(g, .12, H + .12, .12, M.woodDark, (w * i) / bays, (H + .12) / 2, d, { r: .04 }); }
    for (let i = 0; i < bays; i++) { const rr = Math.min(bw, d) * .44, hh = .28 + (2 - Math.min(2, i)) * .16; tag(ball(g, [rr, hh, Math.min(d * .44, rr)], M.compost[Math.min(2, i)], (i + .5) * bw, .04, cz, { seg: 16, rings: 10 })); }
    // pitchfork leaning on the end wall
    pill(g, [w + .12, .02, d * .55], [w + .3, 1.55, d * .35], .022, M.wood, { seg: 6 });
    [-.06, 0, .06].forEach((o) => bar(g, [w + .12 + o, .02, d * .55 + o], [w + .13 + o, .3, d * .52 + o], .008, M.metal, { seg: 4 }));
  } else if (z.type === "beehive") {
    tag(plane(g, w, d, M.gravel, cx, .012, cz));
    const cols = Math.max(1, Math.min(6, Math.floor(Math.max(w, d) / .8))), rows = Math.min(2, Math.max(1, Math.floor(Math.min(w, d) / 1.4))), alongX = w >= d;
    let k = 0;
    for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) {
      const u = ((i + .5) * Math.max(w, d)) / cols, v = ((r + .5) * Math.min(w, d)) / rows, x = alongX ? u : v, zz = alongX ? v : u, ry = alongX ? 0 : HPI, hm = M.hive[k++ % M.hive.length];
      const hg = new THREE.Group(); hg.position.set(x, 0, zz); hg.rotation.y = ry; g.add(hg);
      [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]].forEach(([a, b]) => rbox(hg, .06, .3, .06, M.woodDark, a, .15, b, { r: .02 }));
      rbox(hg, .52, .06, .52, M.woodDark, 0, .33, 0, { r: .02 });
      rbox(hg, .48, .28, .48, hm, 0, .5, 0, { r: .05 }); rbox(hg, .48, .22, .48, hm, 0, .77, 0, { r: .05 });
      rbox(hg, .56, .07, .56, M.zinc, 0, .915, 0, { r: .03 });
      rbox(hg, .34, .03, .13, M.woodDark, 0, .37, .3, { r: .01 }); box(hg, .2, .025, .01, M.ink, 0, .39, .24, { cast: false });
      hg.traverse((m) => { if (m.isMesh) tag(m); });
    }
    if (w * d > 3) ORNAMENTS.flowers(g, w - .5, d - .45, { seed: z.id.length + 2, s: .6 });
    for (let i = 0; i < Math.min(8, cols * 2); i++) ctx.motion.bees.push({ p: [off[0] + .3 + srand(i * 3 + z.id.length) * (w - .6), .6 + srand(i * 5) * .7, off[1] + .3 + srand(i * 7 + 1) * (d - .6)], s: .05, phase: srand(i * 13 + 2) });
  } else if (z.type === "nursery") {
    tag(plane(g, w, d, M.gravel, cx, .012, cz));
    const long = w >= d, benches = Math.max(1, Math.floor((long ? d : w) / 1.3));
    for (let i = 0; i < benches; i++) {
      const c0 = ((i + .5) * (long ? d : w)) / benches, bx = long ? cx : c0, bz = long ? c0 : cz, bw = long ? w - .5 : .8, bd = long ? .8 : d - .5;
      benchSlatted(g, M, bx, bz, bw, bd, .8);
      const len = long ? bw : bd, n = Math.min(14, Math.floor(len / .36)), items = [];
      for (let j = 0; j < n; j++) { const t = -len / 2 + (j + .5) * (len / n), o = (srand(i * 9 + j) - .5) * .32; items.push({ x: long ? bx + t : bx + o, y: .82, z: long ? bz + o : bz + t }); }
      pots(ctx, items, [["Tomato", 2], ["Basil", 3], ["Lettuce", 2], ["Pepper", 2], ["Lavender", 4]], off);
    }
    if (Math.min(w, d) > 2.2) { // shade frame: round posts, rails, a soft translucent cloth
      const sh = 2.2; [[.2, .2], [w - .2, .2], [.2, d - .2], [w - .2, d - .2]].forEach(([x, zz]) => pill(g, [x, 0, zz], [x, sh, zz], .045, M.metal, { seg: 8 }));
      rbox(g, w - .2, .06, .06, M.metal, cx, sh, .2, { r: .02, cast: false }); rbox(g, w - .2, .06, .06, M.metal, cx, sh, d - .2, { r: .02, cast: false }); rbox(g, .06, .06, d - .2, M.metal, .2, sh, cz, { r: .02, cast: false }); rbox(g, .06, .06, d - .2, M.metal, w - .2, sh, cz, { r: .02, cast: false });
      const sl = w >= d, span = (sl ? d : w) - .3, run = (sl ? w : d) - .3, ns = Math.max(3, Math.round(span / .7)), sw = span / ns * .36;
      for (let i = 0; i < ns; i++) { const o = -span / 2 + (i + .5) * span / ns; rbox(g, sl ? run : sw, .035, sl ? sw : run, M.shade, sl ? cx : cx + o, sh + .05, sl ? cz + o : cz, { r: .015, cast: true, receive: false }); }
    }
    ORNAMENTS.wateringcan(g, w - .45, d - .35, { seed: z.id.length });
  }
  // growth visualisation per planted row: a wooden row marker with a tag in the stage colour at the
  // row's head, a gold glow on rows in their harvest window, and an invisible box per row that feeds
  // the hover/tap tooltip
  const lift = floor > 0 ? floor + .02 : 0, G = ctx.growth, [ox, oz] = off;
  prows.forEach((r) => {
    const tree = TREE_RE.test((r.crop || "").toLowerCase());
    const len = Math.max(0, r.a1 - r.a0), mid = (r.a0 + r.a1) / 2, x = r.vertical ? r.c : mid, zz = r.vertical ? mid : r.c, ry = r.vertical ? HPI : 0;
    if (r.stage === 5 && !tree) G.glows.push({ p: [ox + x, lift + .07, oz + zz], ry, s: [len + .5, clamp(r.gap * 1.15, .5, 1.3), 1] }); // trees get their own halo each
    const hx = r.vertical ? r.c : r.a0 - .16, hz = r.vertical ? r.a1 + .16 : r.c, big = r.stage === 5 ? 1.35 : 1;
    G.poles.push({ p: [ox + hx, lift + .27, oz + hz] });
    G.tags[r.stage].push({ p: [ox + hx, lift + .52, oz + hz], ry: r.vertical ? 0 : HPI, s: [big, big, 1] });
    const hw = Math.max(.35, Math.min(.6, r.gap)); // never thinner than a finger: dense rows (7 cm apart) overlap, the nearest wins
    const hit = new THREE.Mesh(new THREE.BoxGeometry(r.vertical ? hw : len + .4, .5, r.vertical ? len + .4 : hw), M.hit);
    hit.position.set(x, lift + .25, zz); hit.userData.plot = { ...r, zone: z.name, zoneId: z.id }; g.add(hit); ctx.plotHits.push(hit);
  });
  // crops: real plants, collected farm-wide and instanced per crop and stage
  const cap = 700;
  const capped = plants.length > cap ? plants.filter((_, i) => i % Math.ceil(plants.length / cap) === 0) : plants;
  capped.forEach((p, i) => {
    const name = p.crop.toLowerCase();
    if (p.stage < 1) return; // planned: the row marker alone says what is coming
    if (TREE_RE.test(name) && p.stage >= 2) { fruitTree(g, ctx, p.x, p.y, p.size, p.stage, name, z.id.length * 31 + i * 7 + 1, M, off); return; }
    plantAt(ctx, p.crop, p.stage, ox + p.x + (srand(i) - .5) * .05, oz + p.y + (srand(i + 7) - .5) * .05, lift, p.size);
  });
  // animals: real geometry, collected farm-wide into one animated mesh (see animals3d.js). Each
  // zone offers an arena — the ground the herd may roam — clear of the shelter, trough and feeder.
  const animals = (data.livestock?.animals || []).filter((a) => animalZone(a, data.zones)?.id === z.id);
  if (animals.length) {
    let A;
    if (housing) A = housing.arena;
    else if (z.type === "pasture") {
      const top = w >= 7 && d >= 5 ? 3.4 : w > 3 && d > 3 ? 1.3 : .35;
      A = oval ? { x0: cx - w * .3, x1: cx + w * .3, z0: Math.max(cz - d * .3, top), z1: cz + d * .3 } : { x0: .35, x1: w - .35, z0: top, z1: d - .35 };
      if (A.z1 - A.z0 < 1.5) A.z0 = oval ? cz - d * .3 : .35;
    } else A = { x0: .4, x1: w - .4, z0: .4, z1: d - .4 };
    const arena = { x0: z.xM + A.x0, x1: z.xM + A.x1, z0: z.yM + A.z0, z1: z.yM + A.z1 };
    const inside = housing?.inside || []; let used = 0; // a few animals stand indoors, on the house floor or in a stall
    const home = housing?.home ? { x: z.xM + housing.home.x, z: z.yM + housing.home.z } : null;
    const pond = (data.zones || []).find((q) => q.type === "water" && q.xM < arena.x1 + 1 && q.xM + q.wM > arena.x0 - 1 && q.yM < arena.z1 + 1 && q.yM + q.hM > arena.z0 - 1);
    const ins = pond ? Math.max(.4, Math.min(pond.wM, pond.hM) * .22) : 0, water = pond && pond.wM > 2 * ins + .5 && pond.hM > 2 * ins + .5 ? { x0: pond.xM + ins, x1: pond.xM + pond.wM - ins, z0: pond.yM + ins, z1: pond.yM + pond.hM - ins, y: .36 } : null;
    animals.slice(0, 5).forEach((a, i) => {
      if (a.type === "Bee") return;
      const bird = /chicken|duck|goose|turkey|quail|guinea/i.test(a.type), n = Math.min(bird ? 12 : 9, a.count || 1);
      for (let j = 0; j < n; j++) {
        if (j === 0 && n >= 3 && used < inside.length) { const p = inside[used++]; ctx.herd.push({ type: a.type, zone: z.id, x: z.xM + p.x, y: p.y, z: z.yM + p.z, heading: srand(i * 17 + 5) * 6.283, arena: null, home: null, water: null, seed: z.id.length * 97 + i * 13 + 50, variant: i % 4 }); continue; }
        const x = arena.x0 + (arena.x1 - arena.x0) * (.08 + srand(i * 31 + j + 10) * .84);
        const zz = arena.z0 + (arena.z1 - arena.z0) * (.1 + srand(i * 29 + j + 5) * .8);
        ctx.herd.push({ type: a.type, zone: z.id, x, z: zz, heading: srand(i * 17 + j * 3 + 1) * 6.283, arena, home, water, seed: z.id.length * 97 + i * 13 + j, variant: (i + j) % 4 });
      }
    });
  }
  return g;
}
function buildGrowth(g, ctx, M) { // stage markers and harvest halos for the whole farm
  const G = ctx.growth;
  // harvest halos: a clean gold frame round each row in its harvest window, a gold ring round a tree
  G.glows.forEach((h) => {
    if (h.tree) { ring(g, h.s[0] / 2, .05, M.glow, h.p[0], h.p[1] + .03, h.p[2], { tube: 6, seg: 36, cast: false, receive: false }); return; }
    const fg = new THREE.Group(); fg.position.set(h.p[0], h.p[1], h.p[2]); fg.rotation.y = h.ry || 0; g.add(fg);
    const w = h.s[0], d = h.s[1], t = clamp(Math.min(w, d) * .085, .04, .09); // a slim frame on a trough or pot row, the full bar on a field row
    [[0, -d / 2, w + t, t], [0, d / 2, w + t, t], [-w / 2, 0, t, d + t], [w / 2, 0, t, d + t]].forEach(([x, z, bw, bd]) => rbox(fg, bw, .05, bd, M.glow, x, 0, z, { r: .022, seg: 1, cast: false, receive: false }));
  });
  instances(g, capsuleGeo(.022, .48, 7, 2), M.tagPole, G.poles, { cast: false });
  G.tags.forEach((list, st) => instances(g, rboxGeo(.22, .14, .035, .03, 1), M.stageTag[st], list, { cast: false }));
}
function buildMotion(g, ctx, M) { // chimney smoke, bees and falling fruit: instanced spheres animated in the vertex shader
  const jobs = [["smoke", M.smoke, 3, ctx.motion.smoke], ["bees", M.bee, 1, ctx.motion.bees]];
  if (ctx.fruitDrop && !ctx.device?.reduced) ctx.fruitDrop.forEach((list, color) => jobs.push(["drop", M.fruitDrop(color), 8, list]));
  jobs.forEach(([key, mat, anim, list]) => {
    if (!list.length) return;
    const geo = new THREE.SphereGeometry(1, 10, 8), im = new THREE.InstancedMesh(geo, mat, list.length), M4 = new THREE.Matrix4(), S = new THREE.Vector3(), Q = new THREE.Quaternion(), P = new THREE.Vector3();
    const an = new Float32Array(list.length), ph = new Float32Array(list.length);
    list.forEach((it, i) => { P.set(it.p[0], it.p[1], it.p[2]); S.set(it.s, key === "bees" ? it.s * .7 : it.s, key === "bees" ? it.s * 1.3 : it.s); M4.compose(P, Q, S); im.setMatrixAt(i, M4); an[i] = anim; ph[i] = it.phase; });
    geo.setAttribute("g3anim", new THREE.InstancedBufferAttribute(an, 1)); geo.setAttribute("g3phase", new THREE.InstancedBufferAttribute(ph, 1));
    im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.castShadow = key === "bees"; // the shadow map is static: moving fruit must not cast im.receiveShadow = false; if (key === "smoke") im.renderOrder = 2;
    g.add(im);
  });
}

/* ---------- terrain ----------
   The farm sits on a flat apron; beyond it the land rolls away in low hills (only rising, so the flat
   overlay planes stay hidden under them). The grid is denser near the farm, coarse far away. The
   ground is one flat colour with soft patches painted into the vertices — no texture. */
function terrainHeightFn(fW, fH, margin) {
  const flat = Math.max(margin * 1.7, 4) + 30, ramp = 70; // wide flat apron, then a slow rise
  return (x, z) => {
    const d = Math.max(0, -x - flat, x - fW - flat, -z - flat, z - fH - flat);
    if (d <= 0) return 0;
    const m = smoothstep(0, ramp, d), amp = 2.5 + Math.min(7, d * .05);
    const n = .5 * Math.sin(x * .041 + 1.7) * Math.cos(z * .036 + .4) + .3 * Math.sin(x * .097 - z * .071 + 2.1) + .2 * Math.sin((x + z) * .16 + .9) + .12 * Math.sin(x * .31) * Math.sin(z * .27 + 1.1);
    return m * amp * Math.pow(clamp01(n * .5 + .5), 1.35);
  };
}
function terrainGeo(fW, fH, E, height, colors, N = 84) {
  const GW = fW + E * 2, GH = fH + E * 2, cx = fW / 2, cz = fH / 2, warp = (t) => .08 * t + .92 * t * t * t;
  const [cA, cB, cDry] = colors.map((c) => new THREE.Color(c)), pos = [], colr = [], idx = [], tmp = new THREE.Color();
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const x = cx + warp((i / N) * 2 - 1) * (GW / 2), z = cz + warp((j / N) * 2 - 1) * (GH / 2), h = height(x, z);
    pos.push(x, h, z);
    const patch = clamp01(.5 + .5 * (Math.sin(x * .13 + 1.1) * Math.cos(z * .11 + .3) + .5 * Math.sin((x - z) * .23 + 2.0))); // soft field patches
    tmp.copy(cA).lerp(cB, patch * .8).lerp(cDry, clamp01(h / 4.5) * .6);
    colr.push(tmp.r, tmp.g, tmp.b);
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(colr, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
const hexN = (v) => (Array.isArray(v) ? v.map(hexN) : typeof v === "string" ? parseInt(v.slice(1), 16) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, hexN(x)])));
const GROUNDS = hexN(GROUND_TONES); // shared with the flat map (palette.js)
/* a balcony: a slab jutting out of a tall cream apartment facade, two storeys above a courtyard lawn.
   The facade runs past both ends of the balcony and down to the ground, with the neighbours' windows on
   this floor and the floors below — so it reads as a balcony on a
   building, not a box on the ground. Our own wall keeps its glazed door and windows; the slim rounded
   metal railing (capsule posts, thin balusters, a chunky white handrail) runs along the three open sides. */
const BALCONY_DROP = 6.2; // our floor to the courtyard: two storeys
const STOREY = 3.1;
function balconyRailing(ctx, fW, fH, y0) {
  [[[0, 0], [0, fH]], [[fW, 0], [fW, fH]], [[0, fH], [fW, fH]]].forEach(([a, b]) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(len / 1.2) + 1), ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
    for (let j = 0; j < n; j++) { const u = j / (n - 1); ctx.fences.rail.posts.push({ p: [a[0] + (b[0] - a[0]) * u, y0 + .5, a[1] + (b[1] - a[1]) * u] }); }
    const nb = Math.max(2, Math.round(len / .14)); for (let j = 1; j < nb; j++) { const u = j / nb; ctx.fences.rail.bars.push({ p: [a[0] + (b[0] - a[0]) * u, y0 + .52, a[1] + (b[1] - a[1]) * u] }); }
    ctx.fences.rail.rails.push({ p: [(a[0] + b[0]) / 2, y0 + 1.04, (a[1] + b[1]) / 2], ry, s: [len + .1, 1, 1] }, { p: [(a[0] + b[0]) / 2, y0 + .1, (a[1] + b[1]) / 2], ry, s: [len, .6, .6] });
  });
}
function balconyEdge(world, ctx, fW, fH, M) {
  // our slab: shallow rounded floor tiles with narrow joints on a pale slab with a visible nose
  rbox(world, fW + .2, .24, fH + .2, M.stoneDark, fW / 2, -.14, fH / 2, { r: .07 });
  const nx = Math.max(1, Math.min(40, Math.ceil(fW / .75))), nz = Math.max(1, Math.min(40, Math.ceil(fH / .75))), tw = fW / nx, td = fH / nz;
  for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) {
    rbox(world, tw - .018, .025, td - .018, (x + z) % 3 === 0 ? M.tileB : M.tileA, (x + .5) * tw, -.009, (z + .5) * td, { r: .009, seg: 1, cast: false });
  }
  rbox(world, fW + .5, .16, .5, M.concreteSolid, fW / 2, -.06, fH + .1, { r: .06, cast: false }); // slab nose
  // the facade: past both ends of the balcony, a storey above it (a parapet with a white coping) and down to the courtyard
  const t = .3, wz = -t / 2 - .05, side = Math.max(2.6, Math.min(6, fW * .7)), x0 = -side, x1 = fW + side, top = STOREY, drop = BALCONY_DROP;
  rbox(world, x1 - x0, top + drop, t, M.facade, (x0 + x1) / 2, (top - drop) / 2, wz, { r: .08, seg: 2 });
  rbox(world, x1 - x0 + .1, .16, t + .16, M.white, (x0 + x1) / 2, top + .02, wz, { r: .05, cast: false });
  // the building behind the wall: seen along the balcony (the phone's home view) a bare wall read as a film set.
  // A block 7 m deep with a flat gravel roof, a white coping all round and two roof lights.
  { const D = 7, bz = wz - t / 2 - D / 2 + .02, cx = (x0 + x1) / 2, L = x1 - x0;
    rbox(world, L, top + drop, D, M.facade, cx, (top - drop) / 2, bz, { r: .08, seg: 2 });
    rbox(world, L - .5, .08, D - .3, M.concreteSolid, cx, top - .1, bz, { r: .03, cast: false });
    rbox(world, L + .1, .16, .3, M.white, cx, top + .02, bz - D / 2 + .13, { r: .05, cast: false });
    [x0 + .13, x1 - .13].forEach((ex) => rbox(world, .3, .16, D + t, M.white, ex, top + .02, bz + t / 2, { r: .05, cast: false }));
    const nl = Math.max(1, Math.min(3, Math.round(L / 7)));
    for (let i = 0; i < nl; i++) { const lx = x0 + (i + .5) * L / nl; rbox(world, 1.2, .22, 1.2, M.trim, lx, top + .02, bz - .6, { r: .06, cast: false }); rbox(world, .98, .06, .98, M.winDark, lx, top + .14, bz - .6, { r: .03, cast: false }); } }
  [0, -STOREY].forEach((y) => rbox(world, x1 - x0 + .04, .12, .08, M.trim, (x0 + x1) / 2, y - .32, .02, { r: .03, cast: false })); // a white band at each floor line
  // depth on the front: a stone plinth at street level, a cornice under the coping, a zinc downpipe at each end,
  // and stone corbels carrying our slab
  rbox(world, x1 - x0 + .1, 1.0, .14, M.stone, (x0 + x1) / 2, -drop + .5, .03, { r: .04, cast: false });
  rbox(world, x1 - x0 + .18, .16, .22, M.trim, (x0 + x1) / 2, top - .24, .05, { r: .05, cast: false });
  [x0 + .42, x1 - .42].forEach((px) => { pill(world, [px, top - .4, .12], [px, -drop + .3, .12], .055, M.zinc, { seg: 8, cast: false }); rbox(world, .2, .14, .2, M.zinc, px, top - .42, .12, { r: .04, cast: false }); });
  { const nc = Math.max(2, Math.min(5, Math.round(fW / 2.2))); for (let i = 0; i < nc; i++) { const cx = fW * (i + .5) / nc; rbox(world, .2, .34, Math.min(.7, fH * .5), M.stoneDark, cx, -.43, Math.min(.7, fH * .5) / 2 - .02, { r: .06, cast: false }); } }
  const sills = []; // the neighbours' window boxes: flowers on some of the other flats' sills (life, without a second balcony)
  // a window: white frame, glass, sill. Ours are lit after dark; about half the neighbours' are (the rest go dark),
  // some of theirs have wooden shutters folded back, some a window box. `lite` builds the far blocks' with fewer faces.
  const win = (wx, wy, theirs = false, lite = false) => {
    const k = Math.round(wx * 7 + wy * 13), seg = lite ? 1 : undefined, lit = !theirs || srand(k + 409) < .48;
    rbox(world, 1.1, 1.15, .1, M.trim, wx, wy, .02, { r: .04, seg }); rbox(world, .9, .95, .04, lit ? M.winLit : M.winDark, wx, wy, .08, { r: .015, seg, cast: false }); rbox(world, 1.3, .1, .22, M.trim, wx, wy - .61, .1, { r: .04, seg, cast: false });
    if (theirs && srand(k + 405) < .42) [-1, 1].forEach((sd) => rbox(world, .3, 1.08, .05, M.shutter, wx + sd * .73, wy, .05, { r: .02, seg: 1, cast: false }));
    if (theirs && !lite && srand(k + 401) < .55) sills.push([wx, wy - .5]);
  };
  // our own wall: a green glazed door, a threshold, skirting, and windows when there is room
  const dx = Math.min(fW * .25, 1.6), dW = 1.0, dH = 2.15;
  rbox(world, dW + .2, dH + .1, .1, M.green, dx, (dH + .1) / 2, .02, { r: .04 }); rbox(world, dW - .16, dH - .2, .04, M.winLit, dx, dH / 2 + .02, .08, { r: .015, cast: false });
  rbox(world, .06, .2, .06, M.metal, dx + dW * .36, 1.0, .1, { r: .02, cast: false });
  rbox(world, dW + .16, .06, .3, M.stoneDark, dx, .025, .12, { r: .025, cast: false });
  rbox(world, fW, .13, .05, M.trim, fW / 2, .065, .015, { r: .015, cast: false });
  for (let k = 0; k < Math.min(3, Math.floor((fW - dx - 1.4) / 2.2)); k++) win(dx + 1.9 + k * 2.2, 1.55);
  // the neighbours' windows on this floor, either side of the balcony
  for (let wx = -1.2; wx > x0 + .7; wx -= 2.3) win(wx, 1.55, true);
  for (let wx = fW + 1.2; wx < x1 - .7; wx += 2.3) win(wx, 1.55, true);
  // the floors below: a row of windows each (not a second balcony — that read as "which one is mine?")
  const n = Math.floor((x1 - x0 - 1.0) / 2.3), off = (x1 - x0 - (n - 1) * 2.3) / 2;
  [-STOREY, -STOREY * 2].forEach((fy) => { for (let i = 0; i < n; i++) win(x0 + off + i * 2.3, fy + 1.55, true); });
  windowBoxes(world, sills, M);
  balconyRailing(ctx, fW, fH, 0);
  // the courtyard: a paved strip along the foot of the building, a few trees on the lawn in front
  rbox(world, x1 - x0 + 4, .06, 1.6, M.concreteSolid, (x0 + x1) / 2, -drop + .03, .8, { r: .03, cast: false });
  const nt = Math.max(2, Math.min(4, Math.round((x1 - x0) / 5)));
  for (let i = 0; i < nt; i++) { const x = x0 + (i + .5) * (x1 - x0) / nt + (srand(i + 51) - .5) * 1.2, z = fH + 2.6 + srand(i + 57) * 3.2; tree(world, x, z, 1.35 + srand(i + 53) * .4, i + 61, M, -drop); }
  { const cg = new THREE.Group(); cg.position.y = -drop; world.add(cg); // shrubs along the foot of the building and two benches on the paving
    for (let x = x0 + .6; x < x1 - .4; x += 1.1 + srand(Math.round(x * 3) + 451) * .5) { const r = .38 + srand(Math.round(x * 7) + 455) * .16, k = Math.abs(Math.round(x * 11)); clump(cg, "shrub", k % 3, M.leaf[k % 4], x, r * .62, 1.9 + srand(Math.round(x * 5) + 453) * .3, [r * 1.35, r * 1.25, r * 1.2], k); clump(cg, "shrub", (k + 1) % 3, M.leaf[(k + 1) % 4], x + r * .75, r * .42, 2.05, [r * .9, r * .85, r * .9], k * 2); }
    ORNAMENTS.bench(cg, x0 + (x1 - x0) * .3, .9, { ry: 0 }); ORNAMENTS.bench(cg, x0 + (x1 - x0) * .72, .9, { ry: 0 }); }
  balconyTown(world, ctx, fW, fH, M, x0, x1, win);
}
/* The town round a balcony (2026-11-09): the block no longer stands in a meadow. A clipped hedge closes the
   courtyard, then a pavement, a street with a dashed centre line and the far pavement with street trees and
   lamps (warm pools after dark); a neighbouring block stands either side of ours on the same building line,
   one a storey taller, one a storey lower, in two other plaster tones. Everything sits two storeys down. */
function balconyTown(world, ctx, fW, fH, M, x0, x1, win) {
  const drop = BALCONY_DROP, top = STOREY, cg = new THREE.Group(); cg.position.y = -drop; world.add(cg);
  const sx0 = -28, sx1 = fW + 28, sw = sx1 - sx0, sc = (sx0 + sx1) / 2, zc = fH + 8.4; // the street runs well past the view on the flat ground
  rbox(cg, sw, .7, .6, M.hedge, sc, .33, zc, { r: .28, seg: 2 });
  rbox(cg, sw, .1, 1.9, M.kerb, sc, .05, zc + 1.45, { r: .04, cast: false });
  rbox(cg, sw, .04, 5.6, M.road, sc, .02, zc + 5.2, { r: .015, cast: false });
  rbox(cg, sw, .1, 1.9, M.kerb, sc, .05, zc + 8.95, { r: .04, cast: false });
  for (let x = sx0 + 1.5; x < sx1 - 1.5; x += 3.2) rbox(cg, 1.5, .012, .14, M.roadLine, x, .046, zc + 5.2, { r: .005, seg: 1, cast: false, receive: false });
  // street lamps on the near pavement, street trees on the far one
  [fW / 2 - 6.5, fW / 2 + 6.5].forEach((lx) => {
    pill(cg, [lx, 0, zc + 1.2], [lx, 3.3, zc + 1.2], .06, M.zinc, { seg: 8 }); pill(cg, [lx, 3.3, zc + 1.2], [lx, 3.45, zc + 1.9], .045, M.zinc, { seg: 6, cast: false });
    ball(cg, [.17, .13, .17], M.bulb, lx, 3.36, zc + 2.0, { seg: 10, rings: 8, cast: false });
    (ctx.glowPools ||= []).push({ x: lx, y: -drop, z: zc + 2.3, r: 3.1 });
  });
  for (let i = 0, x = sx0 + 5; x < sx1 - 3; i++, x += 7.5 + srand(i + 941) * 2.5) tree(cg, x, zc + 9.2, 1.05 + srand(i + 943) * .3, i + 947, M);
  // the neighbours: [which end, length, storeys above ours, plaster]
  [[-1, 9.2, 1, M.facadeB], [1, 8.4, -1, M.facadeC]].forEach(([sd, L, up, mat], bi) => {
    const gapB = 3.4, bx0 = sd < 0 ? x0 - gapB - L : x1 + gapB, bx1 = bx0 + L, cx = (bx0 + bx1) / 2, bTop = top + up * STOREY, D = 7, bz = -.05 - D / 2;
    rbox(world, L, bTop + drop, D, mat, cx, (bTop - drop) / 2, bz, { r: .08, seg: 2 });
    rbox(world, L - .5, .08, D - .5, M.concreteSolid, cx, bTop - .1, bz, { r: .03, cast: false });
    [[cx, bz + D / 2 - .13, L + .1, .3], [cx, bz - D / 2 + .13, L + .1, .3], [bx0 + .13, bz, .3, D], [bx1 - .13, bz, .3, D]].forEach(([px, pz, w, d]) => rbox(world, w, .16, d, M.white, px, bTop + .02, pz, { r: .05, seg: 1, cast: false }));
    rbox(world, L + .1, 1.0, .14, M.stone, cx, -drop + .5, .03, { r: .04, seg: 1, cast: false });
    const n = Math.max(2, Math.floor((L - 1.0) / 2.3)), off = (L - (n - 1) * 2.3) / 2;
    for (let fy = -STOREY * 2; fy <= bTop - STOREY + .01; fy += STOREY) for (let i = 0; i < n; i++) { if (fy === -STOREY * 2 && i === (bi ? n - 1 : 0)) { rbox(world, 1.2, 2.2, .1, M.green, bx0 + off + i * 2.3, fy + 1.1, .02, { r: .04, seg: 1 }); continue; } win(bx0 + off + i * 2.3, fy + 1.55, true, true); } // a green street door on the ground floor
    tree(cg, sd < 0 ? x0 - gapB / 2 : x1 + gapB / 2, 1.4, 1.2, 951 + bi, M); // a tree in the gap between the blocks
  });
}
function balconyHangingPot(world, ctx, x, z, seed, M) {
  const angle = srand(seed) * Math.PI * 2, px = x + Math.cos(angle) * .45, pz = z - Math.sin(angle) * .45;
  pill(world, [x, 0, z], [x, 1.75, z], .045, M.woodDark, { seg: 8 });
  pill(world, [x, 1.7, z], [px, 1.7, pz], .03, M.woodDark, { seg: 8 });
  const swing = new THREE.Group(); swing.position.set(px, 1.7, pz); world.add(swing);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    pill(swing, [0, 0, 0], [Math.cos(a) * .15, -.28, Math.sin(a) * .15], .006, M.metal, { seg: 5 });
  }
  tube(swing, .16, .12, .2, M.pot, 0, -.38, 0, { seg: 20 });
  ring(swing, .16, .02, M.potRim, 0, -.28, 0, { tube: 8, seg: 24 });
  disc(swing, .145, M.soil(PAL.soilDark), 0, -.29, 0, { seg: 20 });
  buildCrops(swing, [{ name: "Strawberry", stage: 5, x: 0, y: -.29, z: 0, s: .36, ry: angle }], TIME);
  swing.traverse((mesh) => { if (mesh.isMesh) ctx.keep.push(mesh); });
  (ctx.hanging ||= []).push({ group: swing, phase: srand(seed + 11) * Math.PI * 2 });
}
/* a back garden: the house stands along the far edge with a paved patio and a green back door onto the
   garden; a white picket fence runs down both sides (from the house) and across the bottom. No hedge, no
   farm gate, stone pillars, drive or mailbox — those belong to a farm. The patio sits outside the
   garden's own measured area so the space the person typed stays all garden. */
const GARDEN_PATIO = 1.8;
function gardenEdge(world, ctx, fW, fH, M) {
  const P = GARDEN_PATIO;
  rbox(world, fW, .06, P, M.pavers, fW / 2, .03, -P / 2, { r: .02, cast: false });
  rbox(world, fW, .07, .12, M.stoneDark, fW / 2, .035, -.04, { r: .03, cast: false }); // a low edging where the patio meets the lawn
  fence(ctx, [[[0, -P], [0, fH]], [[fW, -P], [fW, fH]], [[0, fH], [fW, fH]]], { pickets: true });
  const hw = Math.max(5, Math.min(11, fW * .8)), hd = Math.max(4.5, Math.min(7, hw * .7)), hx = fW / 2 - hw / 2, hz = -P - hd;
  const hg = new THREE.Group(); hg.position.set(hx, 0, hz); world.add(hg);
  building(hg, hw, hd, "house", M, { ctx, off: [hx, hz], yard: false });
  // the neighbours' houses either side, so the row reads as a street of back gardens
  [-1, 1].forEach((sd) => { const nx = sd < 0 ? hx - hw - .8 : hx + hw + .8, ng = new THREE.Group(); ng.position.set(nx, 0, hz); world.add(ng); building(ng, hw, hd, "house", M, { clay: true, yard: false }); });
  const gw = Math.max(4, Math.min(9, hw * .9)); gardenNeighbours(world, ctx, fW, fH, M, gw);
  ctx.gardenOut = { x0: -gw - .4, x1: fW + gw + .4, z0: hz - 1, z1: fH + 2.7 }; // the neighbours' gardens and the lane: no meadow props there
  // on the patio: a bench against the house and a water butt by the downpipe
  ORNAMENTS.bench(world, fW / 2 + Math.min(hw / 2 - 1.1, 2.2), -P + .45, { ry: 0 }); // against the house, facing the garden
  ctx.details.push({ kind: "barrel", x: hx + .45, z: -P + .4, ry: 0 });
}
/* ---------- balcony and back-garden life (2026-11-09): the small spaces most users actually have ---------- */
// flower heads collected by the helpers below, drawn once per world as one instanced mesh per colour
const flowerHeads = (ctx) => (ctx.lifeHeads ||= PAL.flower.map(() => []));
function headsAt(ctx, x, y, z, n, spread, seed) { const H = flowerHeads(ctx); for (let k = 0; k < n; k++) H[(seed + k) % H.length].push({ p: [x + (srand(seed * 3 + k) - .5) * spread, y + srand(seed * 5 + k) * .06, z + (srand(seed * 7 + k) - .5) * spread * .6], s: .035 + srand(seed * 11 + k) * .02 }); }
function windowBoxes(g, sills, M) { // a terracotta box with greenery and flowers on a sill
  sills.forEach(([x, y], i) => { rbox(g, .95, .2, .22, M.terracotta, x, y, .2, { r: .04, cast: false }); clump(g, "shrub", i % 3, M.leaf[i % 4], x, y + .12, .2, [.44, .17, .12], 0, false);
    const H = PAL.flower; for (let k = 0; k < 5; k++) ball(g, .045, M.flower[(i + k) % H.length], x - .36 + k * .18, y + .24 + srand(i * 5 + k) * .05, .26, { seg: 6, rings: 4, cast: false }); });
}
// a festoon of round bulbs along a sagging wire from a to b (glows after dark through nightGlow on M.bulb)
function festoon(g, a, b, M, { sag = .25, step = .42 } = {}) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(2, Math.round(len / step)), pts = [], bulbs = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u]); }
  for (let i = 1; i <= n; i++) { pill(g, pts[i - 1], pts[i], .008, M.wire, { seg: 4, cap: 1, cast: false }); if (i < n) bulbs.push({ p: [pts[i][0], pts[i][1] - .06, pts[i][2]], s: .06 }); }
  return bulbs;
}
function bistro(g, x, z, ry, M) { // a small round green metal table and two folding chairs
  const c = Math.cos(ry), sn = Math.sin(ry), at = (u, v) => [x + u * c + v * sn, z - u * sn + v * c];
  tube(g, .33, .33, .03, M.green, x, .74, z, { seg: 22 }); tube(g, .025, .025, .72, M.metal, x, .37, z, { seg: 8 }); tube(g, .2, .22, .03, M.metal, x, .015, z, { seg: 16, cast: false });
  [-1, 1].forEach((sd) => { const [cx, cz] = at(sd * .58, 0), cr = ry + (sd > 0 ? Math.PI / 2 : -Math.PI / 2);
    rbox(g, .38, .04, .38, M.green, cx, .46, cz, { ry: cr, r: .015 });
    const [bx, bz] = at(sd * .77, 0); rbox(g, .38, .4, .035, M.green, bx, .68, bz, { ry: cr, r: .015 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([p, q]) => { const [lx, lz] = at(sd * .58 + p * .16, q * .16); pill(g, [lx, 0, lz], [lx, .45, lz], .012, M.metal, { seg: 5, cap: 1, cast: false }); }); });
}
function rug(g, x, z, w, d, ry, M) { rbox(g, w, .012, d, M.rug, x, .007, z, { ry, r: .03, seg: 1, cast: false }); rbox(g, w - .2, .014, d - .2, M.rugIn, x, .009, z, { ry, r: .02, seg: 1, cast: false }); rbox(g, w - .5, .016, d - .5, M.rug, x, .011, z, { ry, r: .02, seg: 1, cast: false }); }
function trellis(g, x, M, ctx, seed) { // a wooden trellis on the wall with a climber growing up it from a pot
  const w = .9, h = 1.9, z = .1;
  for (let i = 0; i <= 3; i++) pill(g, [x - w / 2 + i * w / 3, .35, z], [x - w / 2 + i * w / 3, h + .35, z], .016, M.woodPale, { seg: 5, cap: 1 });
  for (let j = 0; j <= 5; j++) pill(g, [x - w / 2, .4 + j * h / 5, z], [x + w / 2, .4 + j * h / 5, z], .014, M.woodPale, { seg: 5, cap: 1 });
  tube(g, .2, .16, .34, M.pot, x, .17, z + .22, { seg: 18 });
  for (let k = 0; k < 11; k++) { const u = k / 10, lx = x + Math.sin(k * 1.9 + seed) * w * .38, ly = .5 + u * (h - .1), r = .16 - u * .05;
    ball(g, [r * 1.3, r, r * .7], M.leaf[(k + seed) % 4], lx, ly, z + .08, { seg: 9, rings: 6 }); if (k % 2 === 0) headsAt(ctx, lx, ly + .08, z + .16, 2, .2, seed * 17 + k); }
}
function railBox(g, x, z, len, M, ctx, seed) { // a planter hooked over the outside of the railing, flowers spilling over
  rbox(g, len, .2, .2, M.terracotta, x, .86, z, { r: .04 }); clump(g, "shrub", seed % 3, M.leaf[seed % 4], x, .97, z, [len * .5, .16, .12], 0, false);
  headsAt(ctx, x, 1.05, z, Math.round(len * 7), len * .9, seed);
}
function compostBin(g, x, z, M) { rbox(g, .72, .82, .72, M.bin, x, .41, z, { r: .05 }); rbox(g, .78, .07, .78, M.bin, x, .86, z, { r: .03 }); rbox(g, .24, .04, .05, M.dark, x, .9, z + .38, { r: .01, cast: false }); }
function birdFeeder(g, x, z, M) { pill(g, [x, 0, z], [x, 1.5, z], .03, M.woodDark, { seg: 6 }); rbox(g, .32, .2, .32, M.wood, x, 1.6, z, { r: .02 }); pill(g, [x - .22, 1.74, z], [x + .22, 1.74, z], .05, M.barn, { seg: 6 }); rbox(g, .36, .03, .36, M.woodDark, x, 1.49, z, { r: .01, cast: false }); }
function rotaryLine(g, x, z, M, seed) { // a rotary washing line with a few things drying
  pill(g, [x, 0, z], [x, 1.85, z], .025, M.metal, { seg: 6 });
  const arms = 4, R = .85; for (let i = 0; i < arms; i++) { const a = i * Math.PI / 2 + .4; pill(g, [x, 1.85, z], [x + Math.cos(a) * R, 1.75, z + Math.sin(a) * R], .012, M.metal, { seg: 4, cap: 1, cast: false }); }
  const cloth = [M.white, M.rug, M.green, M.rugIn]; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .4 + Math.PI / 4, rr = R * .62; rbox(g, .32, .34, .015, cloth[(i + seed) % 4], x + Math.cos(a) * rr, 1.58, z + Math.sin(a) * rr, { ry: -a + Math.PI / 2, r: .006, seg: 1 }); }
}
function trampoline(g, x, z, M) { ring(g, 1.15, .05, M.dark, x, .62, z, { tube: 8, seg: 32 }); disc(g, 1.05, M.dark, x, .6, z, { seg: 28, cast: true }); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; pill(g, [x + Math.cos(a) * 1.1, 0, z + Math.sin(a) * 1.1], [x + Math.cos(a) * 1.1, .62, z + Math.sin(a) * 1.1], .025, M.metal, { seg: 5, cap: 1 }); } }
function panelFence(g, a, b, M) { // a close-board garden fence: posts and 1.6 m wooden panels
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 1.8)), ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
  for (let i = 0; i <= n; i++) { const u = i / n; rbox(g, .1, 1.7, .1, M.woodDark, a[0] + (b[0] - a[0]) * u, .85, a[1] + (b[1] - a[1]) * u, { r: .02, seg: 1 }); }
  for (let i = 0; i < n; i++) { const u = (i + .5) / n; rbox(g, len / n - .1, 1.55, .04, M.woodMid, a[0] + (b[0] - a[0]) * u, .8, a[1] + (b[1] - a[1]) * u, { ry, r: .01, seg: 1 }); }
}
// a balcony with life on it: a bistro set on a rug, a watering can, festoon lights on the railing, planters on the
// railing, a trellis with a climber on the wall. Everything goes only where nothing of the user's stands.
function balconyLife(g, ctx, fW, fH, M, free) {
  const bulbs = [];
  [[[0, 0], [0, fH]], [[0, fH], [fW, fH]], [[fW, fH], [fW, 0]]].forEach(([a, b]) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(len / 1.2));
    for (let i = 0; i < n; i++) { const u0 = i / n, u1 = (i + 1) / n; bulbs.push(...festoon(g, [a[0] + (b[0] - a[0]) * u0, 1.12, a[1] + (b[1] - a[1]) * u0], [a[0] + (b[0] - a[0]) * u1, 1.12, a[1] + (b[1] - a[1]) * u1], M, { sag: .16, step: .3 })); } });
  ctx.lifeBulbs = (ctx.lifeBulbs || []).concat(bulbs);
  (ctx.glowPools ||= []).push({ x: fW / 2, z: fH * .62, r: Math.min(2.6, fW * .26) }); // the railing lights warm the floor after dark
  // the bistro set + rug: the first free spot, scanning from the far end of the wall
  let placed = null;
  for (let x = fW - .9; x > .8 && !placed; x -= .3) for (let z = .9; z < fH - .6 && !placed; z += .3) if (free(x, z, .85, .55)) placed = [x, z];
  if (placed) { rug(g, placed[0], placed[1], 1.6, 1.0, 0, M); bistro(g, placed[0], placed[1], 0, M); }
  for (let x = .5; x < fW - .4; x += .35) if (free(x, .45, .2, .2) && !(placed && Math.abs(x - placed[0]) < 1.1)) { ORNAMENTS.wateringcan(g, x, .45, { seed: 3 }); break; }
  // planters hooked over the front railing where no trough of the user's already hangs
  let k = 0; for (let x = .7; x < fW - .6 && k < 4; x += 1.6) if (free(x, fH - .35, .4, .3, .05)) { railBox(g, x, fH + .16, .7, M, ctx, 31 + k * 7); k++; }
  // a trellis with a climber on our wall, clear of the door and windows
  const dx = Math.min(fW * .25, 1.6), wins = []; for (let i = 0; i < Math.min(3, Math.floor((fW - dx - 1.4) / 2.2)); i++) wins.push(dx + 1.9 + i * 2.2);
  const spots = [fW - .6, dx - 1.25, dx + .95].filter((x) => x > .55 && x < fW - .45 && Math.abs(x - dx) > .95 && wins.every((w) => Math.abs(x - w) > 1.05) && free(x, .35, .3, .25, .05));
  if (spots.length) trellis(g, spots[0], M, ctx, 5);
}
// a back garden with life: a striped lawn (material), flower borders along the fences, a compost bin, a bird feeder,
// a rotary washing line, stepping stones and a shed where there is room; festoon lights over the patio.
function gardenLife(g, ctx, fW, fH, M, free) {
  const P = GARDEN_PATIO, shrubs = [];
  const tryAt = (spots, hw, hd, fn) => { for (const [x, z] of spots) if (x > hw && x < fW - hw && z > hd && z < fH - hd && free(x, z, hw, hd)) { fn(x, z); return [x, z]; } return null; };
  const shed = fW >= 6 && fH >= 5 ? tryAt([[fW - 1.35, fH - 1.1], [1.35, fH - 1.1]], .85, .7, (x, z) => { const sg = new THREE.Group(); sg.position.set(x - .7, 0, z - .55); building(sg, 1.4, 1.1, "storage", M, { off: [x - .7, z - .55] }); g.add(sg); }) : null;
  const offShed = (x, z) => !shed || Math.abs(x - shed[0]) > 1.05 || Math.abs(z - shed[1]) > .9;
  // flower borders: inside the side and bottom fences, skipping anything of the user's and the paths
  const border = [];
  for (let z = .4; z < fH - .3; z += .45) border.push([.32, z], [fW - .32, z]);
  for (let x = .75; x < fW - .7; x += .45) border.push([x, fH - .32]);
  border.forEach(([x, z], i) => { if (!free(x, z, .18, .18, .05) || !offShed(x, z)) return; if (i % 3 === 0) shrubs.push([x, z, .2 + srand(i + 501) * .12, i]); else { headsAt(ctx, x, .22, z, 3, .26, 520 + i); (ctx.tufts ||= []).push({ p: [x, 0, z], ry: srand(i + 523) * 3, s: .7 }); } });
  shrubs.forEach(([x, z, r, i]) => clump(g, "shrub", i % 3, M.leaf[i % 4], x, r * .66, z, [r * 1.3, r * 1.25, r * 1.2], i * 1.7));
  // props in free corners and along the sides (each tries a few spots; none goes on a bed, pot area or path)
  const side = []; for (let z = fH - .75; z > .7; z -= .35) side.push([.75, z], [fW - .75, z]); for (let x = 1.2; x < fW - 1.1; x += .4) side.push([x, fH - .75], [fW - x, fH - .75]);
  const bin = tryAt(side.filter(([x, z]) => !shed || Math.hypot(x - shed[0], z - shed[1]) > 1.6), .45, .45, (x, z) => compostBin(g, x, z, M));
  const feeder = tryAt([[fW * .5, fH * .62], [fW * .25, fH * .45], [fW * .75, fH * .45], [fW * .5, fH * .3], ...side].filter(([x, z]) => offShed(x, z) && (!bin || Math.hypot(x - bin[0], z - bin[1]) > .9)), .3, .3, (x, z) => birdFeeder(g, x, z, M));
  const lawn = [[fW * .72, fH * .7], [fW * .28, fH * .7], [fW * .7, fH * .35], [fW * .3, fH * .35], [fW * .5, fH * .75]]; for (let z = fH - 1; z > 1.4; z -= .4) for (let x = 1; x < fW - .9; x += .4) lawn.push([x, z]);
  // the washing line's pole needs only a small free patch — its arms and washing hang above head height
  tryAt(lawn.filter(([x, z]) => (!shed || Math.hypot(x - shed[0], z - shed[1]) > 1.7) && (!bin || Math.hypot(x - bin[0], z - bin[1]) > 1.2) && (!feeder || Math.hypot(x - feeder[0], z - feeder[1]) > 1.1)), .35, .35, (x, z) => rotaryLine(g, x, z, M, 2));
  if (bin) { const n = Math.max(2, Math.floor(Math.hypot(bin[0] - fW / 2, bin[1]) / .6)); // stepping stones from the patio to the compost bin
    for (let i = 1; i < n; i++) { const u = i / n, x = fW / 2 + (bin[0] - fW / 2) * u, z = (bin[1] - .5) * u + .2; if (free(x, z, .2, .2, 0)) disc(g, .2 + srand(i + 541) * .05, M.stoneDark, x, .012, z, { seg: 14, sx: 1.2 }); } }
  // festoon lights over the patio: from the house wall out to two posts at the patio's lawn edge
  const bulbs = [], postL = [.25, -.15], postR = [fW - .25, -.15];
  [postL, postR].forEach(([x, z]) => pill(g, [x, 0, z], [x, 2.3, z], .045, M.woodDark, { seg: 6 }));
  bulbs.push(...festoon(g, [postL[0], 2.25, postL[1]], [postR[0], 2.25, postR[1]], M, { sag: .3 }));
  bulbs.push(...festoon(g, [postL[0], 2.25, postL[1]], [fW * .3, 2.4, -P + .05], M, { sag: .2 }));
  bulbs.push(...festoon(g, [postR[0], 2.25, postR[1]], [fW * .7, 2.4, -P + .05], M, { sag: .2 }));
  ctx.lifeBulbs = (ctx.lifeBulbs || []).concat(bulbs);
  (ctx.glowPools ||= []).push({ x: fW / 2, z: -P / 2, r: Math.min(3.4, fW * .32) }); // the lights warm the patio after dark
}
// the gardens next door: their own lawn, patio, a close-board fence, and a shed / tree / trampoline / washing line,
// with a gravel back lane along the bottom — so a back garden sits in a street of gardens, not an open field
function gardenNeighbours(g, ctx, fW, fH, M, gw) {
  const P = GARDEN_PATIO;
  [-1, 1].forEach((sd) => {
    const x0 = sd < 0 ? -gw : fW, x1 = sd < 0 ? 0 : fW + gw, cx = (x0 + x1) / 2, outer = sd < 0 ? x0 : x1;
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(gw - .08, fH + P - .08), M.nLawn); lawn.rotation.x = -HPI; lawn.position.set(cx, .005, (fH - P) / 2); lawn.receiveShadow = true; g.add(lawn);
    rbox(g, gw - .2, .05, P - .2, M.pavers, cx, .025, -P / 2, { r: .02, cast: false });
    panelFence(g, [outer, -P], [outer, fH], M); panelFence(g, [x0, fH], [x1, fH], M);
    if (sd < 0) { const sg = new THREE.Group(); sg.position.set(x0 + .5, 0, fH - 1.7); building(sg, 1.6, 1.2, "storage", M, { off: [x0 + .5, fH - 1.7] }); g.add(sg); tree(g, cx + .4, fH * .45, 1.15, 77, M); rotaryLine(g, cx - .2, fH * .78 - .4, M, 1); }
    else { trampoline(g, cx, fH * .6, M); compostBin(g, x1 - .6, fH - .65, M); tree(g, x1 - 1.3, fH * .25 + .6, 1.0, 83, M); }
  });
  rbox(g, fW + 2 * gw + 6, .04, 2.3, M.gravel, fW / 2, .02, fH + 1.35, { r: .02, cast: false }); // the back lane
}
function buildWorld(ctx) {
  const { data, zones, roads, fW, fH, margin, env, M } = ctx;
  ctx.focusBounds = new Map();
  const world = new THREE.Group();
  const E = Math.max(fW, fH) * 16;
  const heightAt = terrainHeightFn(fW, fH, margin); ctx.heightAt = heightAt;
  const style = data.mapStyle || {}, gm = style.groundMaterial || (env === "balcony" ? "stone" : "meadow");
  // a balcony's own floor is its tiled slab; the land around it is the courtyard lawn two storeys down
  const landGm = env === "balcony" ? "meadow" : gm;
  const colors = landGm === "meadow" ? (GROUNDS.meadow[style.groundColor] || GROUNDS.meadow.natural) : (GROUNDS[landGm] || GROUNDS.stone);
  const ground = new THREE.Mesh(terrainGeo(fW, fH, E, heightAt, colors), texture(nightTint(flat(0xffffff, { rough: .96, vertexColors: true, variant: "land" }), .9, [.07, .12, .24]), "meadow"));
  if (env === "balcony") ground.position.y = -BALCONY_DROP;
  ground.receiveShadow = true; world.add(ground); ctx.ground = ground;
  if (gm === "meadow" && env !== "balcony") {
    // the property inside the hedge: a shade lighter than the meadow, with soft irregular patches painted into the
    // vertices (lusher and drier spots), the same way the outer meadow gets its variety — no stripes, no texture
    const base = new THREE.Color(env === "backyard" && colors[0] === PAL.meadow ? 0x9ab65a : colors[0] === PAL.meadow ? PAL.apron : colors[0]), /* a back garden's lawn is a touch greener */ lush = base.clone().lerp(new THREE.Color(colors[1]), .55), dry = base.clone().lerp(new THREE.Color(colors[2]), .45);
    const N = Math.max(12, Math.min(60, Math.round(Math.max(fW, fH) / 1.2))), geo = new THREE.PlaneGeometry(fW + .6, fH + .6, N, Math.max(8, Math.round(N * fH / fW))), P = geo.attributes.position, col = [], tmp = new THREE.Color();
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i) + fW / 2, y = -P.getY(i) + fH / 2;
      const n = .5 + .5 * (Math.sin(x * .31 + 1.7) * Math.cos(y * .27 + .4) + .5 * Math.sin((x - y) * .47 + 2.0) + .3 * Math.sin(x * .9 + y * .7));
      tmp.copy(base); if (n > .62) tmp.lerp(lush, (n - .62) * 2.2); else if (n < .38) tmp.lerp(dry, (.38 - n) * 1.6);
      col.push(tmp.r, tmp.g, tmp.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const yard = env === "backyard", apron = new THREE.Mesh(geo, texture(nightTint(layered(flat(0xffffff, { rough: .96, vertexColors: true, variant: yard ? "lawnYard" : "apron" }), 3), .3, [.34, .28, .13]), yard ? "lawn" : "meadow")); /* a back garden gets mowing stripes */ apron.rotation.x = -HPI; apron.position.set(fW / 2, .004, fH / 2); apron.receiveShadow = true; world.add(apron); ctx.apron = apron; // kept out of bake(): it carries vertex colours
  }
  // boundary by environment: a balcony is a slab against the building wall with a slim rounded railing;
  // a garden and a farm get the round-capped post-and-rail fence, stone gate pillars and a green gate
  const gap = 2.4, balcony = env === "balcony", farm = env === "farm", garden = env === "backyard";
  if (balcony) balconyEdge(world, ctx, fW, fH, M);
  else if (garden) gardenEdge(world, ctx, fW, fH, M);
  else {
    fence(ctx, [[[0, 0], [fW, 0]], [[0, 0], [0, fH]], [[fW, 0], [fW, fH]], [[0, fH], [fW / 2 - gap / 2 - .25, fH]], [[fW / 2 + gap / 2 + .25, fH], [fW, fH]]], { post: 1.0 });
    [-1, 1].forEach((s) => { const x = fW / 2 + s * (gap / 2 + .12); rbox(world, .5, 1.4, .5, M.stone, x, .7, fH, { r: .12 }); rbox(world, .62, .14, .62, M.stoneDark, x, 1.46, fH, { r: .05, cast: false }); ball(world, .17, M.stoneDark, x, 1.65, fH, { seg: 12, rings: 9 }); });
    gate(world, fW / 2, fH, gap - .3, 0, M);
  }
  if (farm) {
    const ho = .75, hg = gap / 2 + 1.1;
    hedge(world, [[[-ho, -ho], [fW + ho, -ho]], [[-ho, -ho], [-ho, fH + ho]], [[fW + ho, -ho], [fW + ho, fH + ho]], [[-ho, fH + ho], [fW / 2 - hg, fH + ho]], [[fW / 2 + hg, fH + ho], [fW + ho, fH + ho]]], M, { h: 1.3, t: .8 });
    ctx.details.push({ kind: "mailbox", x: fW / 2 + gap / 2 + 1.1, z: fH + 1.4, ry: 0 });
    // flowering bushes dotted along the outside of the hedge
    const nb = Math.min(10, Math.round((fW + fH) / 7));
    for (let i = 0; i < nb; i++) { const edge = i % 4, t = .12 + srand(i + 61) * .76, o = ho + 1.25; const x = edge === 0 ? -o : edge === 1 ? fW + o : t * fW, y = edge === 2 ? -o : edge === 3 ? fH + o : t * fH; if (edge === 3 && Math.abs(x - fW / 2) < 3) continue; ORNAMENTS.bush(world, x, y, { seed: i + 11, s: .7 + srand(i + 3) * .4 }); if (i % 2) ORNAMENTS.flowers(world, x + .8, y + .3, { seed: i + 21, s: .6 }); }
  }
  const drive = farm ? [{ xM: fW / 2, yM: fH - .2 }, { xM: fW / 2, yM: fH + Math.max(margin * 1.6, 3) }] : [];
  // paths: pale rounded ribbons with a soft edge and round ends
  const [pathCol, edgeCol] = hexN(pathTones(ctx.pathTexture, style.pathColor)); // same tones as the flat map
  const roadMat = texture(layered(flat(pathCol, { rough: .95, side: THREE.DoubleSide }), 10), "gravel"), edgeMat = texture(layered(flat(edgeCol, { rough: .95, side: THREE.DoubleSide }), 8), "gravel"), rw = ctx.roadWidth;
  [...roads, drive].forEach((raw) => {
    if (raw.length < 2) return; const line = smooth(raw);
    const e = new THREE.Mesh(ribbonGeo(line, rw + .26), edgeMat); e.position.y = .011; e.receiveShadow = true; world.add(e);
    const m = new THREE.Mesh(ribbonGeo(line, rw), roadMat); m.position.y = .016; m.receiveShadow = true; world.add(m);
    [line[0], line[line.length - 1]].forEach((p) => { disc(world, (rw + .26) / 2, edgeMat, p.xM, .011, p.yM, { seg: 18 }); disc(world, rw / 2, roadMat, p.xM, .016, p.yM, { seg: 18 }); });
  });
  // zones — each one also gets an invisible hit box (its bounding box) for taps, so the detailed
  // geometry can be merged for speed without losing which area was tapped
  zones.forEach((z) => {
    const firstPlant = ctx.plants.length;
    const g = buildZone(z, ctx); world.add(g); g.updateMatrixWorld(true);
    for (let i = firstPlant; i < ctx.plants.length; i++) ctx.plants[i].zoneId = z.id;
    const bb = new THREE.Box3().setFromObject(g), size = new THREE.Vector3(), c = new THREE.Vector3();
    if (bb.isEmpty()) { bb.min.set(z.xM, 0, z.yM); bb.max.set(z.xM + z.wM, .5, z.yM + z.hM); }
    bb.min.y = Math.min(0, bb.min.y); bb.max.y = Math.max(bb.min.y + .6, bb.max.y);
    bb.getSize(size); bb.getCenter(c);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), M.hit); hit.position.copy(c); hit.userData.zoneId = z.id; hit.userData.bounds = { x0: bb.min.x, x1: bb.max.x, z0: bb.min.z, z1: bb.max.z, h: bb.max.y };
    world.add(hit); ctx.hits.push(hit);
    // Separate from hit/selection bounds: tall leaves must fit the camera without
    // expanding invisible tap targets over neighbouring beds.
    hit.userData.focusBounds = bb.clone(); ctx.focusBounds.set(z.id, hit.userData.focusBounds);
  });
  // user-drawn fences and gates
  (data.mapLines || []).filter((l) => l.kind !== "path" && (l.points || []).length > 1).forEach((l) => {
    if (l.kind === "gate") { const a = l.points[0], b = l.points[l.points.length - 1], len = Math.hypot(b.xM - a.xM, b.yM - a.yM); gate(world, (a.xM + b.xM) / 2, (a.yM + b.yM) / 2, Math.max(.8, Math.min(3, len - .2)), Math.atan2(-(b.yM - a.yM), b.xM - a.xM), M); return; }
    fence(ctx, l.points.slice(1).map((p, i) => [[l.points[i].xM, l.points[i].yM], [p.xM, p.yM]]));
  });
  // ornaments — all geometry now (props3d.js); potted ones carry a real plant
  const addPlant = (name, stage, x, z, y, size) => plantAt(ctx, name, stage, x, z, y, size);
  (data.ornaments || []).forEach((o, i) => {
    const seed = (o.id ? o.id.length : 1) + i;
    if (balcony && o.type === "hangpot") { balconyHangingPot(world, ctx, o.xM, o.yM, seed, M); return; }
    if (o.type === "tree") { tree(world, o.xM, o.yM, .95, seed, M); return; }
    if (o.type === "shed") { const g = new THREE.Group(); g.position.set(o.xM - .7, 0, o.yM - .55); building(g, 1.4, 1.1, "storage", M, { off: [o.xM - .7, o.yM - .55] }); world.add(g); return; }
    const fn = ORNAMENTS[o.type] || ORNAMENTS.bench;
    fn(world, o.xM, o.yM, { seed, addPlant });
  });
  const inZone = (x, y, pad = .35) => zones.some((z) => x > z.xM - pad && x < z.xM + z.wM + pad && y > z.yM - pad && y < z.yM + z.hM + pad);
  const freeRect = (x, z, hw, hd, pad = .15) => !zones.some((q) => x + hw + pad > q.xM && x - hw - pad < q.xM + q.wM && z + hd + pad > q.yM && z - hd - pad < q.yM + q.hM)
    && ![[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]].some(([a, b]) => onRoad(x + a * hw, z + b * hd))
    && !(data.ornaments || []).some((o) => Math.abs(o.xM - x) < hw + .7 && Math.abs(o.yM - z) < hd + .7);
  const onRoad = (x, y) => [...roads, drive].some((line) => line.some((p, i) => { if (!i) return false; const a = line[i - 1], dx = p.xM - a.xM, dy = p.yM - a.yM, L2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((x - a.xM) * dx + (y - a.yM) * dy) / L2)); return Math.hypot(x - a.xM - dx * t, y - a.yM - dy * t) < ctx.roadWidth / 2 + .3; }));
  if (balcony) balconyLife(world, ctx, fW, fH, M, freeRect); else if (garden) gardenLife(world, ctx, fW, fH, M, freeRect);
  const outG = (x, y) => ctx.gardenOut && x > ctx.gardenOut.x0 && x < ctx.gardenOut.x1 && y > ctx.gardenOut.z0 && y < ctx.gardenOut.z1; // a garden's neighbours and lane
  // detail props: a wheelbarrow by the first bed, a scarecrow in the biggest vegetable area, and the
  // props the buildings asked for (rain barrel, bird bath, crates, tractor, mailbox) — only on open ground
  const beds = zones.filter((z) => z.type === "veg" || z.type === "raised" || z.type === "herbs");
  if (beds.length && !balcony) { const b = beds[0], left = b.xM - .8, right = b.xM + b.wM + .8; ctx.details.push({ kind: "wheelbarrow", x: left >= .7 || right > fW - .7 ? left : right, z: b.yM + Math.min(b.hM - .4, 1.2), ry: HPI * .9 }); } // the side with room, clear of the boundary fence
  const bigVeg = farm && zones.filter((z) => z.type === "veg" && z.wM >= 3 && z.hM >= 3).sort((a, b) => b.wM * b.hM - a.wM * a.hM)[0];
  if (bigVeg) scarecrow(world, bigVeg.xM + bigVeg.wM - .5, bigVeg.yM + .5, { ry: .4 });
  const DETAIL = { wheelbarrow, barrel, crates, birdbath, mailbox, tractor };
  ctx.details.forEach((dd) => {
    const fn = DETAIL[dd.kind]; if (!fn) return;
    if (dd.kind === "tractor" && !farm) return; // farm machinery only on a farm
    const free = dd.kind === "tractor" || (!inZone(dd.x, dd.z, .2) && !onRoad(dd.x, dd.z)) || dd.kind === "barrel" || dd.kind === "birdbath" || dd.kind === "crates";
    if (free) fn(world, dd.x, dd.z, { ry: dd.ry || 0 });
  });
  // tree border, rocks and wild flowers outside the fence, grass tufts in the open ground
  if (env !== "balcony") {
    const n = Math.min(110, Math.ceil((fW + fH) / 1.8));
    for (let i = 0; i < n; i++) {
      const edge = i % 4, t = srand(i + 91), r = Math.max(1.05, margin * (.4 + srand(i + 25) * .42)), set = Math.max(margin * .83, r + .5) + 1.0;
      const x = edge === 0 ? -set : edge === 1 ? fW + set : t * fW;
      const y = edge === 2 ? -set : edge === 3 ? fH + set * 1.05 : t * fH;
      if (farm && (edge === 3 || edge === 2) && Math.abs(x - fW / 2) < 2.2) continue; // keep the entrance clear
      if (garden && edge === 2) continue; // the house stands on the far side
      if (garden && ctx.gardenOut) { const gx = edge === 0 ? ctx.gardenOut.x0 - r - .4 : edge === 1 ? ctx.gardenOut.x1 + r + .4 : x, gy = edge === 3 ? ctx.gardenOut.z1 + r + .3 : y; tree(world, gx, gy, r, i, M); continue; } // beyond the neighbours' gardens and the lane
      tree(world, x, y, r, i, M);
    }
    const rocks = []; const nr = Math.min(28, Math.round((fW + fH) / 5));
    const rm = garden ? Math.max(margin, 2.4) : margin; // a garden's rocks lie out past the fence, never on it or on the patio
    for (let i = 0; i < nr; i++) { const edge = i % 4, t = srand(i + 301), s = .2 + srand(i + 77) * .3; if (garden) continue; /* a back garden has no boulders: the neighbours' gardens surround it */ const x = edge === 0 ? -rm * .5 : edge === 1 ? fW + rm * .5 : t * fW, y = edge === 2 ? -rm * .45 : edge === 3 ? fH + rm * .5 : t * fH; rocks.push({ p: [x, s * .5, y], ry: t * 6, s: [s * 1.2, s * .7, s] }); }
    instances(world, sphereGeo(12, 9), M.rock, rocks);
    // clumps of trees and boulders out on the hills, thinning with distance
    const far = [], nc = Math.min(64, 24 + Math.round((fW + fH) / 3));
    for (let i = 0; i < nc; i++) {
      const a = srand(i * 3 + 701) * 6.283, dist = margin * 2.2 + 9 + Math.pow(srand(i * 5 + 703), 1.4) * 70;
      const x = fW / 2 + Math.cos(a) * (dist + fW / 2), y = fH / 2 + Math.sin(a) * (dist + fH / 2);
      if (y > fH && Math.abs(x - fW / 2) < 4) continue; // the drive stays open
      const r = 1.1 + srand(i * 7 + 709) * 1.3;
      tree(world, x, y, r, i + 800, M, heightAt(x, y) - .05);
      if (!garden && srand(i * 11 + 713) < .35) { const s = .35 + srand(i * 13 + 717) * .5; /* boulders belong to farm hills, not to the streets round a back garden */ far.push({ p: [x + 2.2, heightAt(x + 2.2, y + 1) + s * .4, y + 1], ry: srand(i) * 6, s: [s * 1.3, s * .75, s] }); }
    }
    instances(world, sphereGeo(12, 9), M.rock, far);
  }
  if (balcony) { // a stone slab: no grass, no wild flowers
    buildFences(world, ctx, M); buildPots(world, ctx, M); buildGrowth(world, ctx, M); buildFruit(world, ctx, M); buildMotion(world, ctx, M); buildLife(world, ctx, M); buildGlowPools(world, ctx);
    plantDecoTrees(world, ctx, M); buildCrops(world, ctx.plants, TIME, ctx.focusBounds);
    bake(world, new Set([...ctx.hits, ...ctx.plotHits, ctx.ground, ctx.apron, ...ctx.keep]));
    const herd = buildHerd(ctx.herd, TIME); if (herd) { world.add(herd.mesh); ctx.herdMesh = herd; }
    return world;
  }
  const open = (i, seed) => { for (let k = 0; k < 6; k++) { const x = -margin * .6 + srand(seed + i * 3 + k) * (fW + margin * 1.2), y = -margin * .6 + srand(seed + i * 5 + k + 1) * (fH + margin * 1.2); if (!inZone(x, y) && !onRoad(x, y) && !(garden && y < .15)) return [x, y]; } return [null, null]; };
  tuftsIn(ctx, Math.min(320, Math.round(fW * fH / 5)), 17, (i) => open(i, 500));
  if (env !== "balcony") { // look A: tufts scattered over the meadow outside the hedge too (fewer on phones)
    const nOut = Math.min(ctx.device?.mobile ? 70 : 160, Math.round((fW + fH) * 2.2));
    for (let i = 0; i < nOut; i++) {
      const edge = i % 4, t = srand(i * 3 + 911), off = 2.2 + srand(i * 5 + 913) * margin * 1.5;
      const x = edge === 0 ? -off : edge === 1 ? fW + off : -margin + t * (fW + 2 * margin), y = edge === 2 ? -off : edge === 3 ? fH + off : -margin + t * (fH + 2 * margin);
      if (edge === 3 && farm && Math.abs(x - fW / 2) < 2.4) continue; // the drive stays clear
      if (edge === 2 && garden) continue; // the patio and the house
      if (outG(x, y)) continue; // the neighbours' gardens and the lane
      ctx.tufts.push({ p: [x, heightAt(x, y), y], ry: srand(i + 917) * 3, s: .8 + srand(i + 919) * .8 });
    }
  }
  const heads = PAL.flower.map(() => []), nf = Math.min(120, Math.round(fW * fH / 14));
  for (let i = 0; i < nf; i++) { const [x, y] = open(i, 900); if (x == null) continue; const s = .7 + srand(i + 41) * .6; ctx.tufts.push({ p: [x, 0, y], ry: srand(i + 43) * 3, s }); for (let k = 0; k < 3; k++) heads[(i + k) % heads.length].push({ p: [x + (srand(i * 3 + k) - .5) * .22, .2 * s + srand(i + k) * .08, y + (srand(i * 5 + k) - .5) * .22], s: .035 + srand(i * 7 + k) * .02 }); }
  if (env !== "balcony") { // look A: wildflower clumps and pebbles out in the meadow beyond the hedge (fewer on phones)
    const mob = ctx.device?.mobile, ring = (i, seed) => { const edge = i % 4, t = srand(i * 3 + seed), o = 2.4 + srand(i * 5 + seed + 1) * margin * 1.4; const x = edge === 0 ? -o : edge === 1 ? fW + o : -margin + t * (fW + 2 * margin), y = edge === 2 ? -o : edge === 3 ? fH + o : -margin + t * (fH + 2 * margin); return (edge === 3 && farm && Math.abs(x - fW / 2) < 2.6) || (edge === 2 && garden) || outG(x, y) ? null : [x, y]; };
    const nfo = Math.min(mob ? 30 : 70, Math.round((fW + fH) * .9));
    for (let i = 0; i < nfo; i++) { const q = ring(i, 1301); if (!q) continue; const [x, y] = q, h0 = heightAt(x, y), s = .8 + srand(i + 1307) * .6; ctx.tufts.push({ p: [x, h0, y], ry: srand(i + 1309) * 3, s }); for (let k = 0; k < 4; k++) heads[(i * 2 + k) % heads.length].push({ p: [x + (srand(i * 3 + k + 1311) - .5) * .3, h0 + .2 * s + srand(i + k + 1313) * .08, y + (srand(i * 5 + k + 1317) - .5) * .3], s: .035 + srand(i * 7 + k + 1319) * .02 }); }
    const pebbles = [], np = Math.min(mob ? 50 : 120, Math.round((fW + fH) * 1.6));
    for (let i = 0; i < np; i++) { const q = ring(i, 1401); if (!q) continue; const [x, y] = q, s = .05 + srand(i + 1403) * .08; pebbles.push({ p: [x, heightAt(x, y) + s * .25, y], ry: srand(i + 1405) * 6, s: [s * 1.3, s * .6, s] }); }
    instances(world, sphereGeo(8, 6), M.rock, pebbles, { cast: false, receive: true });
  }
  heads.forEach((list, k) => instances(world, sphereGeo(8, 6), M.flower[k], list, { cast: false, receive: false }));
  // everything collected across the zones is drawn once for the whole farm
  buildFences(world, ctx, M); buildTufts(world, ctx, M); buildPots(world, ctx, M); buildGrowth(world, ctx, M); buildFruit(world, ctx, M); buildMotion(world, ctx, M); buildGlowPools(world, ctx); buildLife(world, ctx, M);
  plantDecoTrees(world, ctx, M); buildCrops(world, ctx.plants, TIME, ctx.focusBounds);
  bake(world, new Set([...ctx.hits, ...ctx.plotHits, ctx.ground, ctx.apron, ...ctx.keep])); // the terrain keeps its vertex colours; the vanes stay live
  const herd = buildHerd(ctx.herd, TIME); if (herd) { world.add(herd.mesh); ctx.herdMesh = herd; } // every animal, one draw call, moving in the vertex shader
  // swallows over the farm, butterflies over the flowers (fauna-fx.js) — shown or hidden by the sky state
  const spots = [...zones.filter((z) => z.type === "beehive" || z.type === "herbs").map((z) => [z.xM + z.wM / 2, z.yM + z.hM / 2]), ...heads.flat().slice(0, 6).map((h) => [h.p[0], h.p[2]])];
  const sw = buildSwallows([fW / 2, fH / 2], swallowCount(ctx.device), M.swallow), bf = buildButterflies(spots, butterflyCount(spots.length, ctx.device), M.butterfly);
  if (sw) world.add(sw); if (bf) world.add(bf); ctx.fauna = { swallows: sw, butterflies: bf };
  return world;
}
/* One area on its own, no terrain or farm boundary: the source of the app's small area icons
   (scripts/render-icons.mjs renders it to src/assets/toy/zone-<type>.webp). Growth markers are left out. */
// eslint-disable-next-line react-refresh/only-export-components -- used only by the icon renderer
export function buildZoneIcon({ zone, data, crops, todayKey }) {
  const M = materials(), d = { ...data, zones: [zone] };
  const ctx = { data: d, zones: [zone], roads: [], crops, fW: zone.xM + zone.wM, fH: zone.yM + zone.hM, margin: 2, env: "farm", pathTexture: "gravel", roadWidth: .5, todayKey, hits: [], plotHits: [], M,
    plants: [], tufts: [], pots: [], herd: [], fruit: new Map(), fruitDrop: new Map(), details: [], motion: { smoke: [], bees: [] }, vanes: null, keep: [], fences: { plain: { posts: [], rails: [] }, picket: { posts: [], caps: [], rails: [] }, rail: { posts: [], bars: [], rails: [] } }, growth: { glows: [], poles: [], tags: [[], [], [], [], [], []] } };
  ctx.heightAt = () => 0;
  const world = new THREE.Group(); world.add(buildZone(zone, ctx));
  const DETAIL = { barrel, crates, birdbath, tractor };
  ctx.details.forEach((dd) => { const fn = DETAIL[dd.kind]; if (fn) fn(world, dd.x, dd.z, { ry: dd.ry || 0 }); });
  buildFences(world, ctx, M); buildTufts(world, ctx, M); buildPots(world, ctx, M); buildFruit(world, ctx, M);
  ctx.motion.smoke = []; buildMotion(world, ctx, M);
  plantDecoTrees(world, ctx, M); buildCrops(world, ctx.plants, TIME);
  const herd = buildHerd(ctx.herd, TIME); if (herd) world.add(herd.mesh);
  return world;
}
/* One fruit tree on its own at a growth stage, for the crop icons (tree-<key>-<stage>.webp). */
// eslint-disable-next-line react-refresh/only-export-components -- used only by the icon renderer
export function buildTreeIcon({ name, stage }) {
  const M = materials(), ctx = { plants: [], fruit: new Map(), growth: { glows: [] } }, g = new THREE.Group();
  fruitTree(g, ctx, 0, 0, 3.4, stage, name.toLowerCase(), 7, M, [0, 0]); buildCrops(g, ctx.plants, TIME);
  return g;
}
/* Merge every static mesh that shares a material into one draw call. Instanced meshes, the
   hit boxes and the ground are left alone. Turns thousands of draw calls into a couple of hundred.
   The merge itself is toy.js `bakeSource` + `mergeBaked`: indexed, and written straight into one set of arrays. */
function bake(world, keep) {
  world.updateMatrixWorld(true);
  const groups = new Map(), drop = [];
  world.traverse((m) => {
    if (!m.isMesh || m.isInstancedMesh || keep.has(m) || !m.geometry || !m.material || Array.isArray(m.material)) return;
    const key = m.material.uuid + "|" + (m.castShadow ? 1 : 0) + (m.receiveShadow ? 1 : 0) + "|" + (m.renderOrder || 0);
    let g = groups.get(key);
    if (!g) { g = { material: m.material, cast: m.castShadow, receive: m.receiveShadow, depth: m.customDepthMaterial, order: m.renderOrder || 0, geos: [] }; groups.set(key, g); }
    g.geos.push({ geo: bakeSource(m.geometry), matrix: m.matrixWorld }); drop.push(m);
  });
  drop.forEach((m) => { m.parent.remove(m); });
  groups.forEach((g) => {
    const mesh = new THREE.Mesh(mergeBaked(g.geos), g.material);
    mesh.castShadow = g.cast; mesh.receiveShadow = g.receive; mesh.renderOrder = g.order;
    if (g.depth) mesh.customDepthMaterial = g.depth;
    world.add(mesh);
  });
}

/* The world's merged and per-build geometries are freed on rebuild; the shared cached primitives
   (toy kit, crop and animal models, tufts — flagged userData.shared where they are cached) are kept
   because the next world reuses them. Instanced meshes also own per-instance GPU buffers that only
   InstancedMesh.dispose() releases — rebuilding on every growth-preview step used to leak them. */
function disposeWorld(world) {
  world.traverse((m) => {
    if (!m.isMesh) return;
    if (m.isInstancedMesh) m.dispose();
    if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
  });
}

/* ---------- map-game camera controls ----------
   One finger / left mouse: drag the ground (with inertia). Two fingers: pinch to zoom, twist to
   rotate, drag up/down to tilt — all anchored to the point between the fingers. Wheel zooms toward
   the cursor; right-drag or shift/ctrl-drag orbits. Tap opens an area; double-tap on the ground
   zooms in. Arrow keys pan, +/- zoom. Everything is clamped to the farm. */
const DEG = Math.PI / 180;
const ease = (t) => 1 - Math.pow(1 - t, 3);
class FarmControls {
  constructor(camera, dom, hooks) {
    this.camera = camera; this.dom = dom; this.hooks = hooks; this.enabled = true;
    this.cooperative = false; // inline in a scrolling page: one finger scrolls the page, two fingers move the map, plain wheel scrolls
    this.target = new THREE.Vector3(); this.dist = 60; this.theta = CAM.az * DEG; this.phi = CAM.el * DEG;
    this.lim = { minDist: 3, maxDist: 200, minPhi: 26 * DEG, maxPhi: 82 * DEG, x0: -10, x1: 10, z0: -10, z1: 10 };
    this.size = { w: 1, h: 1 }; this.home = null; this.bars = null; this.cover = null;
    this.pointers = new Map(); this.pan = null; this.pinch = null; this.tapStart = null; this.lastTap = null;
    this.samples = []; this.rotSamples = [];
    this.raf = 0; this.anim = null; this.inertia = null; this.idleTimer = 0; this.interacting = false;
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2(); this.tmp = new THREE.Vector3(); this.tmp2 = new THREE.Vector3();
    this.onDown = this.onDown.bind(this); this.onMove = this.onMove.bind(this); this.onUp = this.onUp.bind(this);
    this.onWheel = this.onWheel.bind(this); this.onKey = this.onKey.bind(this); this.onBlock = (e) => e.preventDefault();
    dom.addEventListener("pointerdown", this.onDown); dom.addEventListener("pointermove", this.onMove);
    dom.addEventListener("pointerup", this.onUp); dom.addEventListener("pointercancel", this.onUp);
    dom.addEventListener("wheel", this.onWheel, { passive: false }); dom.addEventListener("keydown", this.onKey);
    dom.addEventListener("contextmenu", this.onBlock); dom.addEventListener("gesturestart", this.onBlock);
    dom.tabIndex = 0; dom.style.cursor = "grab";
  }
  dispose() {
    const d = this.dom; cancelAnimationFrame(this.raf); clearTimeout(this.idleTimer);
    d.removeEventListener("pointerdown", this.onDown); d.removeEventListener("pointermove", this.onMove); d.removeEventListener("pointerup", this.onUp); d.removeEventListener("pointercancel", this.onUp);
    d.removeEventListener("wheel", this.onWheel); d.removeEventListener("keydown", this.onKey); d.removeEventListener("contextmenu", this.onBlock); d.removeEventListener("gesturestart", this.onBlock);
  }
  view() { return { target: this.target.toArray(), dist: this.dist, theta: this.theta, phi: this.phi }; }
  setCooperative(on) { this.cooperative = on; this.dom.style.touchAction = on ? "pan-y" : "none"; }
  setEnabled(on) { this.enabled = on; if (!on) { this.pointers.clear(); this.pan = null; this.pinch = null; this.tapStart = null; this.stopMotion(); this.interact(false); } } // a finger still down when the map is disabled must not keep panning it
  update() {
    const { target, dist, theta, phi } = this;
    this.camera.position.set(target.x + Math.sin(theta) * Math.cos(phi) * dist, target.y + Math.sin(phi) * dist, target.z + Math.cos(theta) * Math.cos(phi) * dist);
    this.camera.lookAt(target); this.camera.updateMatrixWorld();
  }
  clampTheta() { const m = this.lim.maxTheta; if (m != null) this.theta = clamp(this.theta, -m, m); } // a balcony is never seen from behind its building (home-view.js turnLimit)
  clampView() {
    const L = this.lim; this.dist = clamp(this.dist, L.minDist, L.maxDist);
    const minP = Math.max(15 * DEG, L.minPhi || (15 * DEG)), maxP = Math.min(85 * DEG, L.maxPhi || (85 * DEG));
    this.phi = clamp(this.phi, minP, maxP);
    this.target.x = clamp(this.target.x, L.x0, L.x1); this.target.z = clamp(this.target.z, L.z0, L.z1); this.target.y = 0;
  }
  local(e) { const r = this.dom.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  groundAt(x, y, out = this.tmp) {
    this.ndc.set((x / this.size.w) * 2 - 1, -(y / this.size.h) * 2 + 1); this.ray.setFromCamera(this.ndc, this.camera);
    const r = this.ray.ray, t = -r.origin.y / r.direction.y; if (!(t > 0) || t > 1e4) return null;
    return out.copy(r.direction).multiplyScalar(t).add(r.origin);
  }
  anchor(x, y, world) { // shift the view so that the ground point `world` sits under screen (x, y)
    this.update(); const p = this.groundAt(x, y, this.tmp2); if (!p) { this.clampView(); this.update(); return; }
    this.target.x += world.x - p.x; this.target.z += world.z - p.z; this.clampView(); this.update();
  }
  changed() { this.hooks.change(); }
  interact(on) {
    clearTimeout(this.idleTimer);
    if (on) { if (!this.interacting) { this.interacting = true; this.hooks.interact(true); } return; }
    this.idleTimer = setTimeout(() => { if (this.pointers.size || this.anim || this.inertia) return; this.interacting = false; this.hooks.interact(false); }, 150);
  }
  onDown(e) {
    if (!this.enabled || (e.button !== undefined && e.button > 2)) return;
    try { this.dom.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    this.stopMotion(); this.hooks.first?.();
    const p = this.local(e), now = performance.now();
    this.pointers.set(e.pointerId, { x: p.x, y: p.y, btn: e.button, mods: !!(e.ctrlKey || e.metaKey || e.shiftKey), touch: e.pointerType === "touch", hinted: false });
    this.interact(true);
    this.samples = []; this.rotSamples = [];
    if (this.pointers.size === 1) {
      this.tapStart = { x: p.x, y: p.y, t: now, moved: 0 };
      if (this.cooperative && e.pointerType === "touch") this.pan = null; // the page scrolls; two fingers move the map
      else { this.beginPan(p); this.dom.style.cursor = "grabbing"; }
    }
    else if (this.pointers.size === 2) { this.beginPinch(); this.tapStart = null; }
    else { this.pinch = null; this.pan = null; this.tapStart = null; }
    e.preventDefault();
  }
  beginPan(p) { this.update(); const a = this.groundAt(p.x, p.y, new THREE.Vector3()); this.pan = a ? { anchor: a } : null; this.samples = []; }
  beginPinch() {
    const [a, b] = [...this.pointers.values()]; this.update();
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.pinch = { d0: Math.hypot(b.x - a.x, b.y - a.y) || 1, a0: Math.atan2(b.y - a.y, b.x - a.x), mid0: mid, dist0: this.dist, theta0: this.theta, phi0: this.phi, anchor: this.groundAt(mid.x, mid.y, new THREE.Vector3()), intent: null, t0: performance.now(), rotOff: 0, tiltOff: 0 };
    this.pan = null;
  }
  onMove(e) {
    const P = this.enabled ? this.pointers.get(e.pointerId) : null; if (!P) return;
    const p = this.local(e), dx = p.x - P.x, dy = p.y - P.y; P.x = p.x; P.y = p.y;
    if (this.tapStart) this.tapStart.moved = Math.max(this.tapStart.moved, Math.hypot(p.x - this.tapStart.x, p.y - this.tapStart.y));
    if (this.pointers.size === 2 && this.pinch) this.movePinch();
    else if (this.pointers.size === 1) {
      if (this.cooperative && P.touch) { if (!P.hinted && this.tapStart && this.tapStart.moved > 12) { P.hinted = true; this.hooks.coop?.("touch"); } return; }
      if (P.btn === 2 || P.mods) {
        this.theta -= dx * .006; this.clampTheta();
        const minP = Math.max(15 * DEG, this.lim.minPhi || (15 * DEG)), maxP = Math.min(85 * DEG, this.lim.maxPhi || (85 * DEG));
        this.phi = clamp(this.phi + dy * .005, minP, maxP);
        this.update();
        this.rotSamples.push([performance.now(), this.theta, this.phi]);
        if (this.rotSamples.length > 8) this.rotSamples.shift();
      }
      else if (this.pan) {
        const g = this.groundAt(p.x, p.y, this.tmp2);
        if (g) {
          this.target.x += this.pan.anchor.x - g.x; this.target.z += this.pan.anchor.z - g.z;
          this.clampView(); this.update();
          this.samples.push([performance.now(), this.target.x, this.target.z]);
          if (this.samples.length > 8) this.samples.shift();
        }
      }
    }
    this.changed(); e.preventDefault();
  }
  movePinch() {
    const [a, b] = [...this.pointers.values()], S = this.pinch;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1, ang = Math.atan2(b.y - a.y, b.x - a.x), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.dist = clamp((S.dist0 * S.d0) / d, this.lim.minDist, this.lim.maxDist);
    let da = ang - S.a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const dyMid = mid.y - S.mid0.y;
    // the first clear movement decides the gesture and locks it: zoom (above) always applies; rotate and tilt only once chosen
    if (!S.intent) { S.intent = pinchIntent({ d: S.d0, ang: S.a0, midY: S.mid0.y }, { d, ang, midY: mid.y }, { dt: performance.now() - S.t0 }); if (S.intent) { S.rotOff = da; S.tiltOff = dyMid; } }
    if (S.intent === "rotate") { this.theta = S.theta0 + (da - S.rotOff); this.clampTheta(); }
    if (S.intent === "tilt") {
      const minP = Math.max(15 * DEG, this.lim.minPhi || (15 * DEG)), maxP = Math.min(85 * DEG, this.lim.maxPhi || (85 * DEG));
      this.phi = clamp(S.phi0 + (dyMid - S.tiltOff) * .0045, minP, maxP);
    }
    if (S.intent === "rotate" || S.intent === "tilt") {
      this.rotSamples.push([performance.now(), this.theta, this.phi]);
      if (this.rotSamples.length > 8) this.rotSamples.shift();
    }
    if (S.anchor) this.anchor(mid.x, mid.y, S.anchor); else { this.clampView(); this.update(); }
  }
  onUp(e) {
    const P = this.pointers.get(e.pointerId); if (!P) return;
    this.pointers.delete(e.pointerId); try { this.dom.releasePointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    if (this.pointers.size === 1) { const [q] = [...this.pointers.values()]; this.pinch = null; this.beginPan(q); this.tapStart = null; }
    else if (this.pointers.size === 0) {
      this.dom.style.cursor = "grab";
      const ts = this.tapStart; this.tapStart = null; this.pinch = null; this.pan = null;
      if (ts && ts.moved < 8 && performance.now() - ts.t < 400 && e.type !== "pointercancel") this.tap(ts.x, ts.y, e);
      else this.startInertia();
      this.interact(false);
    }
    e.preventDefault();
  }
  tap(x, y, e) {
    const hit = this.hooks.tap(x, y, e), now = performance.now(), lt = this.lastTap;
    if (!hit && lt && now - lt.t < 320 && Math.hypot(x - lt.x, y - lt.y) < 30) { this.lastTap = null; this.zoomAt(x, y, .55, 380); }
    else this.lastTap = hit ? null : { x, y, t: now };
  }
  stopMotion() { this.anim = null; this.inertia = null; }
  startInertia() {
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const now = performance.now();
    let panI = null, rotI = null;
    const s = this.samples;
    if (s.length >= 2) {
      const last = s[s.length - 1]; let first = s[0];
      for (const q of s) if (now - q[0] <= 90) { first = q; break; }
      const dt = last[0] - first[0];
      if (dt >= 8 && now - last[0] <= 100) {
        let vx = (last[1] - first[1]) / dt, vz = (last[2] - first[2]) / dt;
        const v = Math.hypot(vx, vz), vmax = this.dist * .0014;
        if (v >= .002) {
          if (v > vmax) { vx *= vmax / v; vz *= vmax / v; }
          panI = { vx, vz };
        }
      }
    }
    const rs = this.rotSamples;
    if (rs.length >= 2) {
      const last = rs[rs.length - 1]; let first = rs[0];
      for (const q of rs) if (now - q[0] <= 90) { first = q; break; }
      const dt = last[0] - first[0];
      if (dt >= 8 && now - last[0] <= 100) {
        let vTh = (last[1] - first[1]) / dt, vPh = (last[2] - first[2]) / dt;
        const vr = Math.hypot(vTh, vPh), vrmax = .003;
        if (vr >= .0003) {
          if (vr > vrmax) { vTh *= vrmax / vr; vPh *= vrmax / vr; }
          rotI = { vTheta: vTh, vPhi: vPh };
        }
      }
    }
    if (panI || rotI) {
      this.inertia = { vx: panI?.vx || 0, vz: panI?.vz || 0, vTheta: rotI?.vTheta || 0, vPhi: rotI?.vPhi || 0, t: now };
      this.interact(true);
      this.tick();
    }
  }
  tick() {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      const now = performance.now();
      if (this.inertia) {
        const I = this.inertia, dt = Math.min(48, now - I.t); I.t = now;
        const k = Math.exp(-dt / 260);
        this.target.x += I.vx * dt; this.target.z += I.vz * dt;
        if (I.vTheta) { this.theta += I.vTheta * dt; this.clampTheta(); }
        if (I.vPhi) {
          const minP = Math.max(15 * DEG, this.lim.minPhi || (15 * DEG)), maxP = Math.min(85 * DEG, this.lim.maxPhi || (85 * DEG));
          this.phi = clamp(this.phi + I.vPhi * dt, minP, maxP);
        }
        I.vx *= k; I.vz *= k;
        if (I.vTheta) I.vTheta *= k;
        if (I.vPhi) I.vPhi *= k;
        this.clampView(); this.update();
        if (Math.hypot(I.vx, I.vz) < .0004 && Math.hypot(I.vTheta || 0, I.vPhi || 0) < .00004) this.inertia = null;
      }
      if (this.anim) {
        const A = this.anim, t = clamp((now - A.t0) / A.ms, 0, 1), k = ease(t);
        this.target.lerpVectors(A.from.target, A.to.target, k); this.dist = A.from.dist + (A.to.dist - A.from.dist) * k;
        this.theta = A.from.theta + (A.to.theta - A.from.theta) * k; this.phi = A.from.phi + (A.to.phi - A.from.phi) * k;
        this.clampView(); this.update(); if (t >= 1) this.anim = null;
      }
      this.changed();
      if (this.inertia || this.anim) this.tick(); else this.interact(false);
    });
  }
  animateTo(to, ms = 450) {
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) ms = 1;
    let th = to.theta ?? this.theta; while (th - this.theta > Math.PI) th -= 2 * Math.PI; while (th - this.theta < -Math.PI) th += 2 * Math.PI;
    this.inertia = null;
    this.anim = { t0: performance.now(), ms, from: { target: this.target.clone(), dist: this.dist, theta: this.theta, phi: this.phi }, to: { target: (to.target || this.target).clone(), dist: to.dist ?? this.dist, theta: th, phi: to.phi ?? this.phi } };
    this.interact(true); this.tick();
  }
  zoomAt(x, y, factor, ms = 0) { // zoom keeping the ground point under (x, y) where it is
    this.update(); const a = this.groundAt(x, y, new THREE.Vector3()), dist = clamp(this.dist * factor, this.lim.minDist, this.lim.maxDist);
    if (!a) { if (ms) this.animateTo({ dist }, ms); else { this.dist = dist; this.update(); this.changed(); } return; }
    const saved = { target: this.target.clone(), dist: this.dist };
    this.dist = dist; this.anchor(x, y, a); const to = { target: this.target.clone(), dist };
    this.target.copy(saved.target); this.dist = saved.dist; this.update();
    if (ms) this.animateTo(to, ms); else { this.target.copy(to.target); this.dist = to.dist; this.clampView(); this.update(); this.changed(); }
  }
  zoomBy(factor, ms = 300) { this.zoomAt(this.size.w / 2, this.size.h / 2, factor, ms); }
  focusZone(zone, ms = 550, wide = 1) { // wide > 1 steps back from the area, to show where on the farm it is
    const bounds = this.hooks.focusBounds?.(zone) || new THREE.Box3(
      new THREE.Vector3(zone.xM, 0, zone.yM),
      new THREE.Vector3(zone.xM + zone.wM, .6, zone.yM + zone.hM));
    const target = bounds.getCenter(new THREE.Vector3()); target.y = 0;
    // A higher inspection angle exposes planting rows behind pot rims and rails.
    // Preserve azimuth so selecting a plant never unexpectedly spins the farm.
    const phi = isPlantZone(zone.type) ? Math.max(this.phi, 60 * DEG) : this.phi;
    const aspect = this.size.w / Math.max(1, this.size.h);
    // With an area card open (a phone's bottom sheet, a desktop side panel) or the phone's bars on screen,
    // the area is framed in the part of the map that is still visible (cover.js), not behind the card.
    const inset = mergeInset(this.cover, this.bars, this.size);
    if (inset) {
      const pts = []; for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) pts.push([x, y, z]);
      const v = fitView(pts, { theta: this.theta, phi, fov: this.camera.fov, aspect, fill: .8, inset });
      this.animateTo({ target: new THREE.Vector3(v.target.x, 0, v.target.z), phi, dist: clamp(v.dist * wide, this.lim.minDist, this.lim.maxDist) }, ms);
      return;
    }
    const dist = focusDistance(bounds, { target, theta: this.theta, phi,
      fov: this.camera.fov, aspect, near: this.camera.near });
    this.animateTo({ target, phi, dist: clamp(dist * wide, this.lim.minDist, this.lim.maxDist) }, ms);
  }
  onWheel(e) {
    if (!this.enabled) return;
    if (this.cooperative && !e.ctrlKey && !e.metaKey) { this.hooks.coop?.("wheel"); return; } // plain scrolling keeps scrolling the page
    e.preventDefault(); this.hooks.first?.();
    const p = this.local(e), dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 200 : e.deltaY;
    this.stopMotion(); this.zoomAt(p.x, p.y, Math.exp(clamp(dy, -120, 120) * (e.ctrlKey ? .006 : .0016)), 0);
    this.interact(true); this.interact(false);
  }
  onKey(e) {
    if (!this.enabled) return;
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (dir) { // right = screen right, up = away from the viewer
      const step = this.dist * .12, c = Math.cos(this.theta), s = Math.sin(this.theta);
      this.stopMotion(); this.target.x += dir[0] * c * step + dir[1] * -s * step; this.target.z += dir[0] * -s * step + dir[1] * -c * step;
      this.clampView(); this.update(); this.changed(); e.preventDefault(); return;
    }
    if (e.key === "+" || e.key === "=") { this.zoomBy(.7); e.preventDefault(); }
    else if (e.key === "-" || e.key === "_") { this.zoomBy(1 / .7); e.preventDefault(); }
    else if (e.key === "Home" || e.key === "r") { this.hooks.reset?.(); e.preventDefault(); }
  }
  fit(fW, fH, margin, animate, zoom = 1) {
    // Where the camera stands for the whole space is worked out in home-view.js (pure maths, tested):
    // a farm turns to run its long axis up a portrait screen; a balcony on a portrait screen is seen along
    // its length from outside the building; a back garden is framed on the garden and its patio, with the
    // house behind cropped by the top of the frame. `bars` (px) keeps the space clear of the phone's
    // full-screen controls.
    const bars = this.bars, inset = bars ? { top: bars.top / this.size.h, bottom: bars.bottom / this.size.h, right: (bars.right || 0) / this.size.w } : undefined;
    const v = homeView({ env: this.env, fW, fH, margin, aspect: this.size.w / this.size.h, fov: CAM.fov, az: CAM.az, el: CAM.el, patio: GARDEN_PATIO, inset });
    const t = new THREE.Vector3(v.target.x, 0, v.target.z), theta = v.theta, phi = v.phi, dist = v.dist;
    this.homeTurn = v.turn; this.homeFrac = v.frac; // share of the viewport height the space's own ground spans at the home view (harness check)
    const pad = Math.max(margin, 2);
    // Small pots should remain inspectable even when the surrounding farm is large.
    this.lim = { minDist: 2.5, maxDist: dist * 1.35, minPhi: 26 * DEG, maxPhi: 82 * DEG, x0: -pad, x1: fW + pad, z0: -pad, z1: fH + pad, maxTheta: turnLimit(this.env) };
    this.home = { target: t.clone(), dist: dist * zoom, theta, phi }; this.fitDist = dist;
    if (animate) { this.clampView(); this.animateTo(this.home, 600); }
    else { this.stopMotion(); cancelAnimationFrame(this.raf); this.target.copy(t); this.theta = theta; this.phi = phi; this.dist = dist * zoom; this.clampView(); this.update(); } // an instant fit also ends any animation or fling still running
  }
}

/* ---------- component ---------- */
export default function Grove3D(props) {
  const { data, zones, roads, crops, fW, fH, margin, env, pathTexture, roadWidth, tasksByZone = {}, selectedId, cardZoneId = null, guideZoneId = null, onZoneOpen, onBadge, onShowCrops, weather = null, skyOverride = null, home = false, homeRight = 0, paused = false, rich = false, building = false, cropExtra = null } = props; // props.onEngine (build mode) is read through `latest` // home: the map IS the home screen (always full size, under the app's overlays, no exit)
  const liveSky = data.mapStyle?.liveSky !== "off", lat = typeof data.cityGeo?.lat === "number" ? data.cityGeo.lat : null, lng = typeof data.cityGeo?.lng === "number" ? data.cityGeo.lng : null; // "Live sky" setting; the town's geocode drives the sun
  const host = useRef(null), labels = useRef(null), tipRef = useRef(null), state = useRef(null), latest = useRef(props), fullRef = useRef(false), cropRef = useRef(null);
  const [full, setFull] = useState(() => home || HARNESS?.full === true);
  const [mobile] = useState(isCoarse); // phone tier: drives the CSS (`g3-coarse`) and the preview tile
  // On phones the inline map is a live preview tile (no gestures, no labels, no controls): one tap opens the
  // full-screen map, which is the real phone map. Desktop keeps the interactive inline map.
  const preview = mobile && !full;
  const jobs = Object.values(tasksByZone).reduce((n, l) => n + (l?.length || 0), 0);
  const [ahead, setAhead] = useState(0); // growth preview: days from today
  const [timeOpen, setTimeOpen] = useState(false);
  const [focusId, setFocusId] = useState("");
  const [findOpen, setFindOpen] = useState(false), findRef = useRef(null);
  const [motionReduced, setMotionReduced] = useState(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const query = matchMedia("(prefers-reduced-motion: reduce)"), update = () => setMotionReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  // Read per render so the stages move on after midnight (App re-renders on
  // its day tick); the memo only folds in the growth-preview offset.
  const today = todayLocalKey();
  const todayKey = useMemo(() => addDays(today, ahead), [ahead, today]);
  const [hint, setHint] = useState(() => { try { return !sessionStorage.getItem("g3-hint"); } catch { return true; } });
  const [busy, setBusy] = useState(true);
  const [coop, setCoop] = useState(null); // "touch" | "wheel" | null — short hint when a page gesture hit the inline map
  const sceneKey = useMemo(
    () => JSON.stringify([zones, data.garden?.plots, data.livestock?.animals, data.ornaments, data.mapLines, data.mapStyle, data.region, roads, fW, fH, margin, env, pathTexture, roadWidth, growthSceneStages(data.garden?.plots, crops, todayKey, today)]),
    [zones, data.garden?.plots, data.livestock?.animals, data.ornaments, data.mapLines, data.mapStyle, data.region, roads, fW, fH, margin, env, pathTexture, roadWidth, crops, todayKey, today],
  );
  // While a page covers the map (paused) the world is not rebuilt: edits made there are drawn once, on the way back.
  const [builtKey, setBuiltKey] = useState(sceneKey);
  useEffect(() => { if (!paused) setBuiltKey(sceneKey); }, [paused, sceneKey]);
  useEffect(() => { const st = state.current; if (!st) return; st.paused = paused; st.setAnim?.(); if (!paused) st.requestRender?.(); }, [paused]);
  // growth stages per zone (for the dots under the names) and a farm-wide summary for the time panel
  const stageInfo = useMemo(() => {
    const byZone = {}, totals = [0, 0, 0, 0, 0, 0];
    (data.garden?.plots || []).forEach((pl) => {
      if (pl.status === "harvested" || !pl.zone) return;
      const st = previewGrowthOf(pl, crops?.get?.(pl.crop), todayKey, today).index;
      (byZone[pl.zone] = byZone[pl.zone] || []).push(st); totals[st]++;
    });
    return { byZone, totals };
  }, [data.garden?.plots, crops, todayKey, today]);
  // tapped planted row → the crop card (top-left) + every row of that crop highlighted on the map
  const [pickedBase, setPicked] = useState(null);
  const picked = useMemo(() => pickedBase && rowAtDate(pickedBase, data.garden?.plots, crops, todayKey, today), [pickedBase, data.garden?.plots, crops, todayKey, today]);
  const pickRow = (row) => { if (!row) { setPicked(null); return; } setPicked({ ...row, color: crops?.get?.(row.crop)?.color }); latest.current.showTip?.(null); };
  const pickInfo = useMemo(() => {
    if (!picked) return null;
    const c = crops?.get?.(picked.crop), rows = (data.garden?.plots || []).filter((p) => p.crop === picked.crop && p.status !== "harvested" && p.zone);
    let plants = 0, soonest = null; const stages = [0, 0, 0, 0, 0, 0], areas = [];
    rows.forEach((p) => {
      const g = previewGrowthOf(p, c, todayKey, today); stages[g.index]++; plants += p.plantCount || p.qty || 0;
      const zn = zones.find((z) => z.id === p.zone)?.name; if (zn && !areas.includes(zn)) areas.push(zn);
      if (p.harvestDate && !g.waiting) { const left = Math.round(dayNum(p.harvestDate) - dayNum(todayKey)); if (soonest == null || left < soonest) soonest = left; }
    });
    const own = (data.garden?.plots || []).find((p) => p.id === picked.id), age = own?.plantDate ? Math.max(0, Math.round(dayNum(todayKey) - dayNum(own.plantDate))) : null;
    let step = -1; if (age != null) (c?.steps || []).forEach((s, i) => { if (s.d <= age) step = i; });
    const pair = COMP[picked.crop] || {}, friends = { good: pair.good || [], bad: pair.bad || [] };
    return { c, rows: rows.length, plants, areas, stages, soonest, age, step, friends };
  }, [picked, data.garden?.plots, crops, zones, todayKey, today]);
  const showTip = (hit, x, y) => {
    const el = tipRef.current; if (!el) return;
    if (!hit) { el.style.display = "none"; return; }
    const r = rowAtDate(hit.userData.plot, data.garden?.plots, crops, todayKey, today), when = r.stage === 5 ? "in its harvest window" : r.left == null ? STAGES[r.stage] : r.left > 0 ? `${STAGES[r.stage]} · harvest in ${r.left} d` : `${STAGES[r.stage]} · past harvest date`;
    const title = document.createElement("b"), stage = document.createElement("div"), dot = document.createElement("i"), detail = document.createElement("span");
    title.textContent = r.crop; dot.style.background = STAGE_CSS[r.stage];
    stage.append(dot, document.createTextNode(`${when}${r.count ? ` · ${r.count} plants` : ""}${r.estimated ? (ahead ? " · estimated" : "") : " · observed"}`));
    detail.textContent = `${r.zone} · click for details`; el.replaceChildren(title, stage, detail);
    el.style.display = ""; const w = el.offsetWidth, hw = host.current ? host.current.clientWidth : 600;
    el.style.left = `${Math.max(4, Math.min(hw - w - 4, x + 14))}px`; el.style.top = `${Math.max(4, y - el.offsetHeight - 12)}px`;
  };
  const dismissHint = () => { setHint(false); try { sessionStorage.setItem("g3-hint", "1"); } catch { /* private mode */ } };
  const showCoop = (kind) => setCoop(kind);
  const ctl = (f) => { const st = state.current; if (st?.controls) f(st.controls, st); };
  function focusAndOpen(event, zone, scatterPoint = null) {
    setFocusId(String(zone.id));
    ctl((c, st) => { c.focusZone(zone); st.reactToZone?.(zone, scatterPoint); });
    onZoneOpen?.(event, zone);
  }
  useEffect(() => { latest.current = { ...props, cardZoneId, dismissHint, showCoop, showTip, pickRow, focusAndOpen, clearFocus: () => setFocusId(""), todayKey, actualToday: today, liveSky, lat, lng, skyOverride, preview, focusId }; }); // the engine reads the newest props from here
  useEffect(() => { if (!coop) return; const t = setTimeout(() => setCoop(null), 1800); return () => clearTimeout(t); }, [coop]);
  // renderer, lights and controls: created once
  useEffect(() => {
    const el = host.current; if (!el) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); }
    catch (err) { void err; latest.current.onUnavailable?.(); return; }
    const coarse = isCoarse(), mobile = coarse || Math.min(screen.width, screen.height) < 820;
    const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2), LOW = Math.min(DPR, mobile ? 1.15 : 1.25);
    renderer.setPixelRatio(DPR);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false; // static scene: shadows render once
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "g3-canvas"; renderer.domElement.setAttribute("data-g3-style", "toy-v1"); renderer.domElement.setAttribute("aria-label", "3D farm map: drag to move, pinch or scroll to zoom, two fingers to rotate");
    el.insertBefore(renderer.domElement, el.firstChild);
    const lost = (e) => { e.preventDefault(); latest.current.onUnavailable?.(); };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(FIXED_SKY.fog);
    // the room environment map lights only the glossy materials (toy.js setEnvironment); everything matte gets the
    // same soft fill from one ambient light instead of two cube-map lookups per pixel
    const pmrem = new THREE.PMREMGenerator(renderer), envTex = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
    const lin = new THREE.Color();
    const camera = new THREE.PerspectiveCamera(CAM.fov, 1, 1, 4000);
    // bright, soft, toy-box light: a white sky with a pale green bounce, one warm sun with faint soft shadows
    const hemi = new THREE.HemisphereLight(0xffffff, 0x9fb48a, .85); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff3e4, 2.1); sun.castShadow = true;
    sun.shadow.mapSize.set(mobile ? 2048 : 3072, mobile ? 2048 : 3072); sun.shadow.radius = 2; sun.shadow.bias = -.0003; sun.shadow.normalBias = .04; sun.shadow.intensity = .62;
    scene.add(sun); scene.add(sun.target);
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), S = { W: 0, H: 0 };
    let queued = false, dirty = false, animOn = false, animRaf = 0, lastFrame = 0, inView = true;
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const IDLE_MS = mobile ? 1000 / 20 : 1000 / 30; // idle animation rate; gestures and camera moves render every frame
    const st = { renderer, scene, camera, sun, world: null, hits: [], plotHits: [], dims: null, fitted: false, anchors: {}, highlight: null, pickGroup: null, picked: null, calls: 0, animating: false };
    st.reduced = reduced; st.mobile = mobile; st.coarse = coarse; state.current = st;
    if (import.meta.env?.DEV && typeof window !== "undefined") window.__g3 = st; // dev-only inspection hook
    // the sky (sky.js) owns every light value; FIXED_SKY reproduces the map's original fixed afternoon
    st.sky = FIXED_SKY;
    st.applySky = (s) => {
      st.sky = s;
      { const f = fillLight(lin.set(s.hemiSky).toArray(), lin.set(s.hemiGround).toArray(), s.hemiIntensity, s.envIntensity); hemi.color.setRGB(f.sky[0], f.sky[1], f.sky[2]); hemi.groundColor.setRGB(f.ground[0], f.ground[1], f.ground[2]); hemi.intensity = 1; } // the sky's own bounce + the fill the environment map used to give
      sun.color.set(s.sunColor); sun.intensity = s.sunIntensity; sun.shadow.intensity = s.shadowIntensity;
      renderer.toneMappingExposure = s.exposure;
      scene.background = new THREE.Color(s.fog);
      if (st.fogRange) scene.fog = new THREE.Fog(s.fog, st.fogRange.near * (s.fogNear ?? 1), st.fogRange.far);
      NIGHT.value = clamp((3 - s.elevation) / 9, 0, 1); // windows and lamps come on as the sun sets
      WIND.value.set(s.windDir[0], s.windDir[1], s.windStrength); WX.ripple.value = s.precip === "rain" ? 3 : 1;
      (st.vanes || []).forEach((v) => { v.rotation.y = vaneAngle(s.windDir); });
      st.setWeatherFx(s);
      if (st.dims) st.setupSun(); else renderer.shadowMap.needsUpdate = true;
      st.requestRender();
    };
    // clouds and rain/snow live in the scene (not the world) so a world rebuild keeps them
    st.fx = { clouds: null, cloudKey: "", precip: null, precipKey: "" };
    st.setWeatherFx = (s) => {
      const fx = st.fx, dims = st.dims || { fW: 40, fH: 30 }, R = Math.max(dims.fW, dims.fH) / 2 + 30;
      const nC = cloudCount(s.cloud, { mobile }), ck = `${nC}|${R}`;
      if (ck !== fx.cloudKey) { if (fx.clouds) { scene.remove(fx.clouds); fx.clouds.geometry.dispose(); fx.clouds.material.dispose(); } fx.clouds = buildClouds(dims.fW, dims.fH, nC, R); if (fx.clouds) scene.add(fx.clouds); fx.cloudKey = ck; }
      if (st.fauna) { const day = s.night < .5 && s.precip === "none"; if (st.fauna.swallows) st.fauna.swallows.visible = day; if (st.fauna.butterflies) st.fauna.butterflies.visible = day && s.tempC >= 8; }
      const nP = precipCount(s.precip, { mobile, reduced: st.reduced }), pk = `${s.precip}|${nP}`;
      if (pk !== fx.precipKey) { if (fx.precip) { scene.remove(fx.precip); fx.precip.dispose(); fx.precip.geometry.dispose(); } fx.precip = st.M ? buildPrecip(s.precip, nP, s.precip === "snow" ? st.M.snow : st.M.rain) : null; if (fx.precip) scene.add(fx.precip); fx.precipKey = fx.precip ? pk : ""; }
    };
    const project = (x, y, z, out) => { const v = out.set(x, y, z).project(camera); return { x: ((v.x + 1) / 2) * S.W, y: ((1 - v.y) / 2) * S.H, on: v.z < 1 }; };
    const pv = new THREE.Vector3();
    let lastNow = 0;
    st.render = (now = performance.now()) => {
      dirty = false;
      if (st.growthAnim) {
        const a = st.growthAnim, elapsed = now - a.start, axis = new THREE.Vector3(), next = new THREE.Matrix4();
        a.items.forEach(({ mesh, index, matrix, start, delay }) => { const amount = ease(growthTransitionProgress(elapsed, delay)); axis.set(1, start + (1 - start) * amount, 1); mesh.setMatrixAt(index, next.copy(matrix).scale(axis)); mesh.instanceMatrix.needsUpdate = true; });
        if (elapsed >= GROWTH_DURATION_MS + GROWTH_STAGGER_MS) st.growthAnim = null;
      }
      if (st.selectionAnim) {
        const a = st.selectionAnim, progress = clamp((now - a.start) / 360, 0, 1), scale = 1 + .035 * (1 - ease(progress));
        a.group.scale.set(scale, 1, scale); a.group.position.set(a.cx * (1 - scale), 0, a.cz * (1 - scale));
        if (progress >= 1) st.selectionAnim = null;
      }
      // shared clock for the shader effects; the harvest halo breathes; clouds drift downwind
      if (animOn) { const dt = lastNow ? Math.min(.1, (now - lastNow) / 1000) : 0; TIME.value = now / 1000; WX.drift.value += dt * (.3 + .3 * WIND.value.z); }
      lastNow = now; WX.center.value.copy(controls.target);
      st.hanging?.forEach(({ group, phase }) => {
        const swing = st.reduced ? 0 : Math.sin(TIME.value * 1.35 + phase) * (.012 + WIND.value.z * .025);
        group.rotation.x = swing * WIND.value.y; group.rotation.z = -swing * WIND.value.x;
      });
      if (st.M) st.M.glow.emissiveIntensity = .45 + .3 * Math.sin(TIME.value * 2.2);
      setEnvironment(envTex, st.sky.envIntensity); // glossy materials reflect this map's own environment (a no-op unless it changed)
      renderer.render(scene, camera);
      st.calls = renderer.info.render.calls;
      if (st.viewSubs && st.viewSubs.size) st.viewSubs.forEach((f) => f());
      // zone names hang just above the front edge of the thing they name (the footprint edge nearest the
      // viewer) so they never cover a roof; they shrink as the camera pulls back; placement (selected →
      // pending jobs → biggest footprint, no overlaps, far-out size threshold) lives in labels.js
      const ls = (controls.fitDist ? clamp(controls.fitDist / controls.dist, .68, 1.15) : 1) * (S.W < 520 ? .85 : 1), far = ls < .8;
      if (far !== st.far) { st.far = far; el.classList.toggle("g3-far", far); }
      const view = [controls.target.x, controls.target.z, controls.dist, controls.theta, controls.phi, S.W, S.H, latest.current.preview].join("|");
      if (st.labelsDirty || view !== st.labelView) {
        st.labelsDirty = false; st.labelView = view;
        const nodes = latest.current.preview || !labels.current ? [] : Array.from(labels.current.children), items = [], byId = new Map();
        nodes.forEach((n) => {
          const a = st.anchors[n.dataset.zone]; if (!a) return;
          let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9; const pts = a.corners.map(([x, z]) => { const q = project(x, 0, z, pv); minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y); return q; });
          const c = project(a.cx, 0, a.cz, pv);
          // where the footprint's near side crosses the vertical through its centre: a pill hung "in front" starts
          // there, so a strip seen along its length (a phone balcony) keeps its pill beside it, not below its far end
          let frontY = -1e9; pts.forEach((u, i) => { const v = pts[(i + 1) % pts.length]; if ((u.x - c.x) * (v.x - c.x) > 0 || u.x === v.x) return; frontY = Math.max(frontY, u.y + (v.y - u.y) * (c.x - u.x) / (v.x - u.x)); }); if (frontY < -1e8) frontY = maxY;
          pts.sort((u, v) => v.y - u.y); const f0 = pts[0], f1 = pts[1]; // the two lowest points on screen = the front edge
          const badge = !!n.querySelector(".g3-badge");
          byId.set(n.dataset.zone, n);
          // a thin area (a planter strip along a balcony wall) would vanish under its own pill: hang the pill
          // just in front of it instead, so the planters stay visible
          // a small bed gets the same treatment when the ground in front of it is free (labels.js decides)
          const fy = (f0.y + f1.y) / 2, ph = 20 * ls, thin = a.thin || maxY - minY < ph * 2.2, small = thin || maxY - minY < ph * 5.5;
          items.push({ id: n.dataset.zone, x: (f0.x + f1.x) / 2, y: fy, cx: c.x, cy: c.y, on: f0.on && f1.on && c.on, px: maxX - minX, w: a.w * ls, h: ph, badge: badge ? 24 * ls : 0, area: a.area, sel: a.sel, jobs: badge ? 1 : 0,
            box: { x0: minX, y0: minY, x1: maxX, y1: maxY }, thin, below: small ? { x: c.x, y: frontY + ph + 6 } : null });
        });
        placeLabels(items, { W: S.W, H: S.H, far, mobile: st.coarse }).forEach(({ id, x, y, show }) => {
          const n = byId.get(id);
          n.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) translateY(-2px) scale(${ls.toFixed(3)})`; n.style.display = show ? "" : "none";
        });
      }
    };
    st.requestRender = () => { dirty = true; if (queued || animOn) return; queued = true; requestAnimationFrame(() => { queued = false; if (state.current === st && dirty) st.render(); }); };
    // the animation loop runs only while the map is on screen and the tab is visible; idle frames are
    // throttled, frames during gestures and camera moves are not
    const frame = (now) => {
      animRaf = 0; if (!animOn) return;
      if (st.brain && now - st.brainAt >= 250) { st.brainAt = now; const legs = st.brain.tick(now / 1000, { night: st.sky.night, reduced: st.reduced }); if (legs.length) { applyLegs(st.herdMesh, legs); dirty = true; } }
      if (dirty || controls.interacting || now - lastFrame >= IDLE_MS) { lastFrame = now; st.render(now); }
      animRaf = requestAnimationFrame(frame);
    };
    st.setAnim = () => {
      const want = !st.reduced && inView && !document.hidden && !!st.world && !st.paused;
      if (want === animOn) return;
      animOn = want; st.animating = want;
      if (want) { lastFrame = 0; animRaf = requestAnimationFrame(frame); } else { cancelAnimationFrame(animRaf); animRaf = 0; }
    };
    const onVis = () => st.setAnim();
    document.addEventListener("visibilitychange", onVis);
    const io = typeof IntersectionObserver === "function" ? new IntersectionObserver((es) => { inView = es.some((e) => e.isIntersecting); st.setAnim(); }, { threshold: 0 }) : null;
    io?.observe(el);
    const controls = new FarmControls(camera, renderer.domElement, {
      focusBounds: (zone) => st.hits.find((h) => h.userData.zoneId === zone.id)?.userData.focusBounds,
      change: () => st.requestRender(),
      interact: (on) => { renderer.setPixelRatio(on ? LOW : DPR); st.requestRender(); },
      first: () => latest.current.dismissHint?.(),
      coop: (kind) => latest.current.showCoop?.(kind),
      reset: () => { latest.current.clearFocus?.(); st.reset(true); },
      tap: (x, y, e) => {
        const P = latest.current; if (!P.interactive || !P.onZoneOpen) return false;
        ptr.set((x / S.W) * 2 - 1, -(y / S.H) * 2 + 1); ray.setFromCamera(ptr, camera);
        const row = ray.intersectObjects(st.plotHits, false)[0];
        if (row) {
          P.pickRow?.(row.object.userData.plot);
          const zone = P.zones.find((z) => z.id === row.object.userData.plot.zoneId);
          if (zone) { setFocusId(String(zone.id)); controls.focusZone(zone); }
          return true;
        }
        P.pickRow?.(null); // ground or a zone: the crop card closes
        const hit = ray.intersectObjects(st.hits, false)[0];
        if (!hit) return false;
        const z = P.zones.find((q) => q.id === hit.object.userData.zoneId); if (!z) return false;
        P.focusAndOpen(e, z, z.type === "coop" ? hit.point : null); return true;
      },
    });
    st.controls = controls; controls.setCooperative(!fullRef.current);
    // Build mode (features/home/BuildMode.jsx) drives the map through this small API: where a screen point
    // meets the ground, which area is under it, where a ground point is on screen, and a footprint "ghost".
    const ghostFill = new THREE.MeshBasicMaterial({ color: 0x35c46f, transparent: true, opacity: .42, depthTest: false, depthWrite: false, toneMapped: false });
    const ghostEdge = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .95, depthTest: false, depthWrite: false, toneMapped: false });
    const ghost = new THREE.Group(); ghost.visible = false; ghost.renderOrder = 30;
    { const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), ghostFill); fill.renderOrder = 30; ghost.add(fill);
      for (let i = 0; i < 4; i++) { const edge = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostEdge); edge.renderOrder = 31; ghost.add(edge); } }
    scene.add(ghost);
    const gv = new THREE.Vector3();
    const toLocal = (cx, cy) => { const r = renderer.domElement.getBoundingClientRect(); return { x: cx - r.left, y: cy - r.top, r }; };
    st.api = {
      groundAt: (cx, cy) => { const p = toLocal(cx, cy); controls.update(); const g = controls.groundAt(p.x, p.y, gv); return g ? { x: g.x, z: g.z } : null; },
      zoneAt: (cx, cy) => { const p = toLocal(cx, cy); ptr.set((p.x / S.W) * 2 - 1, -(p.y / S.H) * 2 + 1); ray.setFromCamera(ptr, camera); const hit = ray.intersectObjects(st.hits, false)[0]; return hit ? hit.object.userData.zoneId : null; },
      project: (x, z) => { const r = renderer.domElement.getBoundingClientRect(), q = project(x, 0, z, gv); return { x: q.x + r.left, y: q.y + r.top, on: q.on }; },
      setGhost: (g) => {
        ghost.visible = !!g;
        if (g) {
          const cx = g.xM + g.wM / 2, cz = g.yM + g.hM / 2, t = clamp(controls.dist * .006, .06, .6), [fill, n, s, w, e] = ghost.children;
          ghostFill.color.set(g.bad ? 0xe5484d : 0x35c46f);
          fill.scale.set(g.wM, 1, g.hM); fill.position.set(cx, .1, cz);
          n.scale.set(g.wM + t, .08, t); n.position.set(cx, .12, g.yM); s.scale.set(g.wM + t, .08, t); s.position.set(cx, .12, g.yM + g.hM);
          w.scale.set(t, .08, g.hM + t); w.position.set(g.xM, .12, cz); e.scale.set(t, .08, g.hM + t); e.position.set(g.xM + g.wM, .12, cz);
        }
        st.requestRender();
      },
      view: () => ({ x: controls.target.x, z: controls.target.z }),
      onView: (f) => { st.viewSubs.add(f); return () => st.viewSubs.delete(f); },
      canvas: renderer.domElement,
    };
    st.viewSubs = new Set();
    latest.current.onEngine?.(st.api);
    st.size = () => {
      const previousW = S.W, previousH = S.H;
      const d = st.dims || { fW: 3, fH: 2, margin: 1 }, ratio = clamp((d.fH + 2 * d.margin) / (d.fW + 2 * d.margin), latest.current.preview ? .72 : .62, .8); // the preview tile is at least 4:3 so the farm fills it
      S.W = el.clientWidth || 600; S.H = fullRef.current ? (el.clientHeight || Math.round(S.W * ratio)) : Math.round(Math.min(S.W * ratio, Math.max(220, (window.innerHeight || 800) * .78)));
      renderer.setSize(S.W, S.H); camera.aspect = S.W / S.H; camera.updateProjectionMatrix(); controls.size = { w: S.W, h: S.H };
      if ((!st.fitted || (latest.current.preview && !latest.current.guideZoneId)) && st.dims) { st.reset(false); st.fitted = true; }
      else {
        const focused = latest.current.zones.find((z) => String(z.id) === latest.current.focusId);
        if (focused && (previousW !== S.W || previousH !== S.H)) controls.focusZone(focused);
        else controls.update();
      } // Reframe the selected area when rotating a phone or resizing the map.
      st.requestRender();
    };
    st.reset = (animate, zoom = 1) => {
      const { fW, fH, margin } = st.dims; controls.fit(fW, fH, margin, animate, zoom);
      const far = Math.min(controls.fitDist * 5.0, Math.max(fW, fH) * 16 * .9), near = Math.min(controls.fitDist * 2.4, far / 1.4);
      st.fogRange = { near, far }; scene.fog = new THREE.Fog(st.sky.fog, near * (st.sky.fogNear ?? 1), far); // the ground fades into the backdrop beyond the farthest allowed zoom-out
      st.requestRender();
    };
    st.setupSun = () => {
      const { fW, fH, margin } = st.dims, t = new THREE.Vector3(fW / 2, 0, fH / 2), big = Math.max(fW, fH);
      // the sun's direction comes from the sky state (a high afternoon sun by default: short, soft shadows)
      sun.position.copy(t).add(new THREE.Vector3(...st.sky.sunDir).normalize().multiplyScalar(big * 2)); sun.target.position.copy(t);
      const e = big * .85 + margin * 2, sc = sun.shadow.camera; sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = 1; sc.far = big * 6; sc.updateProjectionMatrix();
      renderer.shadowMap.needsUpdate = true;
    };
    st.select = (id) => {
      const animateSelection = id && id !== st.selectedArea && !st.reduced;
      st.selectedArea = id || null; st.selectionAnim = null;
      if (st.highlight) { scene.remove(st.highlight); st.highlight.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); st.highlight = null; }
      const hit = id && st.hits.find((h) => h.userData.zoneId === id);
      if (hit) {
        const b = hit.userData.bounds, g = new THREE.Group(), w = b.x1 - b.x0 + .5, d = b.z1 - b.z0 + .5, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, M = { select: st.M.select, selectEdge: st.M.selectEdge };
        plane(g, w, d, M.select, cx, .03, cz, { receive: false });
        [[cx, cz - d / 2, w, .12], [cx, cz + d / 2, w, .12], [cx - w / 2, cz, .12, d], [cx + w / 2, cz, .12, d]].forEach(([x, z, bw, bd]) => rbox(g, bw, .06, bd, M.selectEdge, x, .04, z, { r: .025, cast: false, receive: false }));
        scene.add(g); st.highlight = g;
        if (animateSelection) st.selectionAnim = { group: g, cx, cz, start: performance.now() };
      }
      Object.entries(st.anchors).forEach(([zid, a]) => { a.sel = zid === id ? 1 : 0; });
      st.labelsDirty = true;
      st.requestRender();
    };
    // A thin outline makes the actual plot or building footprint discoverable
    // without adding permanent decoration or changing the live-sky lighting.
    const hoverMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, depthWrite: false });
    st.hoverZone = (id) => {
      if (st.hoverId === id) return;
      if (st.hoverOutline) { scene.remove(st.hoverOutline); st.hoverOutline.geometry.dispose(); st.hoverOutline = null; }
      st.hoverId = id || null;
      const zone = id && latest.current.zones.find((z) => z.id === id);
      if (zone && latest.current.interactive !== false && !latest.current.preview) {
        const pad = .12, x0 = zone.xM - pad, x1 = zone.xM + zone.wM + pad, z0 = zone.yM - pad, z1 = zone.yM + zone.hM + pad;
        const geometry = new THREE.BufferGeometry().setFromPoints([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]].map(([x, z]) => new THREE.Vector3(x, .09, z)));
        st.hoverOutline = new THREE.Line(geometry, hoverMaterial); st.hoverOutline.renderOrder = 18; scene.add(st.hoverOutline);
      }
      st.requestRender();
    };
    // Keep the row under the pointer distinct from its surrounding area.
    const rowHoverMaterial = new THREE.LineBasicMaterial({ color: 0xf7c552, transparent: true, opacity: .95, depthWrite: false });
    st.hoverRow = (hit) => {
      if (st.hoverRowHit === hit) return;
      if (st.rowHoverOutline) { scene.remove(st.rowHoverOutline); st.rowHoverOutline.geometry.dispose(); st.rowHoverOutline = null; }
      st.hoverRowHit = hit || null;
      if (hit && latest.current.interactive !== false && !latest.current.preview) {
        st.world.updateMatrixWorld(true);
        const p = hit.getWorldPosition(new THREE.Vector3()), q = hit.geometry.parameters, pad = .06;
        const x0 = p.x - q.width / 2 - pad, x1 = p.x + q.width / 2 + pad, z0 = p.z - q.depth / 2 - pad, z1 = p.z + q.depth / 2 + pad, y = p.y - q.height / 2 + .1;
        const geometry = new THREE.BufferGeometry().setFromPoints([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]].map(([x, z]) => new THREE.Vector3(x, y, z)));
        st.rowHoverOutline = new THREE.Line(geometry, rowHoverMaterial); st.rowHoverOutline.renderOrder = 19; scene.add(st.rowHoverOutline);
      }
      st.requestRender();
    };
    // crop group: every planted row of the tapped crop lights up in the crop's colour, the tapped row with a thicker edge
    st.pick = (sel) => {
      if (st.pickGroup) { scene.remove(st.pickGroup); st.pickGroup.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); st.pickMats?.forEach((m) => m.dispose()); st.pickGroup = null; st.pickMats = null; }
      st.picked = sel || null;
      if (sel && st.world) {
        st.world.updateMatrixWorld(true);
        const rows = st.plotHits.filter((h) => h.userData.plot.crop === sel.crop);
        if (rows.length) {
          const g = new THREE.Group(), col = new THREE.Color(sel.color || "#ffffff"), white = new THREE.Color(0xffffff), v = new THREE.Vector3();
          const fill = st.M.pick.clone(), edge = st.M.pickEdge.clone(); fill.color.copy(col).lerp(white, .3); edge.color.copy(col).lerp(white, .15); st.pickMats = [fill, edge];
          // one outline per planting: the union of its rows (dense beds have a dozen overlapping row boxes)
          const byPlot = new Map();
          rows.forEach((h) => {
            const p = h.getWorldPosition(v), q = h.geometry.parameters, id = h.userData.plot.id;
            const b = byPlot.get(id) || { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, y: p.y - q.height / 2 };
            b.x0 = Math.min(b.x0, p.x - q.width / 2); b.x1 = Math.max(b.x1, p.x + q.width / 2); b.z0 = Math.min(b.z0, p.z - q.depth / 2); b.z1 = Math.max(b.z1, p.z + q.depth / 2);
            byPlot.set(id, b);
          });
          byPlot.forEach((b, id) => {
            const w = b.x1 - b.x0 + .3, d = b.z1 - b.z0 + .3, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, t = id === sel.id ? .14 : .07;
            plane(g, w, d, fill, cx, b.y + .015, cz, { receive: false });
            [[cx, cz - d / 2, w, t], [cx, cz + d / 2, w, t], [cx - w / 2, cz, t, d], [cx + w / 2, cz, t, d]].forEach(([x, z, bw, bd]) => box(g, bw, .04, bd, edge, x, b.y + .03, z, { cast: false, receive: false }));
          });
          scene.add(g); st.pickGroup = g;
        }
      }
      st.requestRender();
    };
    // hover tooltips for planted rows (mouse / trackpad only)
    let hoverAt = 0, hoverTimer = 0;
    const onHover = (e) => {
      if (e.pointerType === "touch" || controls.pointers.size) return;
      const now = performance.now(); if (now - hoverAt < 50) return; hoverAt = now;
      const r = renderer.domElement.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      ptr.set((x / S.W) * 2 - 1, -(y / S.H) * 2 + 1); ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(st.plotHits, false)[0];
      const zoneHit = hit ? null : ray.intersectObjects(st.hits, false)[0];
      st.hoverZone(hit?.object.userData.plot.zoneId || zoneHit?.object.userData.zoneId || null);
      st.hoverRow(hit?.object || null);
      renderer.domElement.style.cursor = (hit || zoneHit) && latest.current.interactive !== false ? "pointer" : "grab";
      clearTimeout(hoverTimer); latest.current.showTip?.(hit ? hit.object : null, x, y);
    };
    const onLeave = () => { clearTimeout(hoverTimer); hoverTimer = setTimeout(() => { latest.current.showTip?.(null); st.hoverZone(null); st.hoverRow(null); if (!controls.pointers.size) renderer.domElement.style.cursor = "grab"; }, 80); };
    renderer.domElement.addEventListener("pointermove", onHover); renderer.domElement.addEventListener("pointerleave", onLeave); renderer.domElement.addEventListener("pointerdown", onLeave);
    const ro = new ResizeObserver(() => st.size()); ro.observe(el);
    return () => {
      animOn = false; cancelAnimationFrame(animRaf); io?.disconnect(); document.removeEventListener("visibilitychange", onVis);
      ro.disconnect(); controls.dispose(); renderer.domElement.removeEventListener("webglcontextlost", lost);
      renderer.domElement.removeEventListener("pointermove", onHover); renderer.domElement.removeEventListener("pointerleave", onLeave); renderer.domElement.removeEventListener("pointerdown", onLeave); clearTimeout(hoverTimer);
      latest.current.onEngine?.(null); ghost.children.forEach((m) => m.geometry.dispose()); ghostFill.dispose(); ghostEdge.dispose();
      if (st.hoverOutline) st.hoverOutline.geometry.dispose(); hoverMaterial.dispose();
      if (st.rowHoverOutline) st.rowHoverOutline.geometry.dispose(); rowHoverMaterial.dispose();
      if (st.world) disposeWorld(st.world);
      if (st.fx?.clouds) { st.fx.clouds.geometry.dispose(); st.fx.clouds.material.dispose(); } if (st.fx?.precip) { st.fx.precip.dispose(); st.fx.precip.geometry.dispose(); }
      setEnvironment(null, .22); envTex.dispose(); renderer.dispose(); if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement); state.current = null;
    };
  }, []);
  // (re)build the world only when something on the map changed
  useEffect(() => {
    const st = state.current; if (!st) return;
    const P = latest.current;
    st.reduced = motionReduced;
    if (motionReduced) { st.controls.stopMotion(); st.selectionAnim = null; }
    st.hoverZone?.(null); st.hoverRow?.(null);
    if (st.world) { st.scene.remove(st.world); disposeWorld(st.world); }
    st.hits = []; st.plotHits = []; st.M = materials(); latest.current.showTip?.(null);
    const dimsChanged = !st.dims || st.dims.fW !== P.fW || st.dims.fH !== P.fH || st.dims.margin !== P.margin;
    st.dims = { fW: P.fW, fH: P.fH, margin: P.margin };
    if (st.controls.env !== P.env) { st.controls.env = P.env; st.fitted = false; }
    const ctx = { data: P.data, zones: P.zones, roads: P.roads, crops: P.crops, fW: P.fW, fH: P.fH, margin: P.margin, env: P.env, pathTexture: P.pathTexture, roadWidth: P.roadWidth, todayKey: P.todayKey || todayLocalKey(), actualToday: P.actualToday, hits: st.hits, plotHits: st.plotHits, M: st.M,
      plants: [], tufts: [], pots: [], herd: [], fruit: new Map(), fruitDrop: new Map(), details: [], motion: { smoke: [], bees: [] }, vanes: [], keep: [], device: { mobile: st.mobile, reduced: st.reduced }, fences: { plain: { posts: [], rails: [] }, picket: { posts: [], caps: [], rails: [] }, rail: { posts: [], bars: [], rails: [] } }, growth: { glows: [], poles: [], tags: [[], [], [], [], [], []] } };
    const t0 = performance.now(); setDetail(detailFor({ mobile: st.mobile, env: P.env, zones: P.zones.length, plants: (P.data?.garden?.plots || []).reduce((n, p) => n + (p.status === "planted" ? +p.plantCount || 0 : 0), 0) })); try { st.world = buildWorld(ctx); } finally { setDetail(1); } st.herd = ctx.herd; st.vanes = ctx.vanes; st.hanging = ctx.hanging || []; st.buildMs = performance.now() - t0;
    // Only animate plants whose stage actually changed as the preview date moves.
    // Other farm edits and the initial render should never make the garden jump.
    const nextStages = new Map(), changed = [], animateGrowth = !st.reduced && st.cropStages && st.cropDay !== P.todayKey;
    st.world.traverse((mesh) => {
      if (!mesh.userData.cropItems) return;
      mesh.userData.cropItems.forEach(({ key, stage }, index) => {
        nextStages.set(key, stage);
        if (animateGrowth && st.cropStages.get(key) !== stage) {
          const matrix = new THREE.Matrix4(); mesh.getMatrixAt(index, matrix);
          changed.push({ mesh, index, matrix, start: growthTransitionStart(st.cropStages.get(key), stage), delay: growthTransitionDelay(key) });
        }
      });
    });
    st.cropStages = nextStages; st.cropDay = P.todayKey;
    st.growthAnim = changed.length ? { start: performance.now(), items: changed } : null;
    st.vanes.forEach((v) => { v.rotation.y = vaneAngle(st.sky.windDir); });
    const herdLayout = JSON.stringify(ctx.herd), keepBrain = st.brain && st.herdLayout === herdLayout;
    st.herdMesh = ctx.herdMesh || null; st.fauna = ctx.fauna || null; st.brainAt = 0; st.herdItems = ctx.herd;
    st.brain = keepBrain ? st.brain : ctx.herd.length ? createBrain(ctx.herd.map((it, idx) => ({ idx, species: it.type, ...speciesInfo(it.type), x: it.x, z: it.z, heading: it.heading, arena: it.arena, home: it.home, water: it.water, seed: it.seed }))) : null;
    st.herdLayout = herdLayout;
    if (st.brain) applyLegs(st.herdMesh, keepBrain ? st.brain.snapshot() : st.brain.tick(TIME.value, { night: st.sky.night, reduced: st.reduced }));
    st.reactToZone = (zone, scatterPoint = null) => {
      if (st.reduced || !st.brain || !st.herdMesh) return;
      const indices = st.brain.animals.filter((animal, i) => st.herdItems[i]?.zone === zone.id && (!scatterPoint || animal.kind === "bird")).map((animal) => animal.idx);
      if (!indices.length) return;
      const legs = scatterPoint
        ? st.brain.scatter(indices, scatterPoint.x, scatterPoint.z, TIME.value)
        : st.brain.look(indices, zone.xM + zone.wM / 2, zone.yM + zone.hM / 2, TIME.value);
      applyLegs(st.herdMesh, legs);
      st.requestRender();
    };
    st.scene.add(st.world);
    st.anchors = Object.fromEntries(P.zones.map((z) => [z.id, { cx: z.xM + z.wM / 2, cz: z.yM + z.hM / 2, h: 0, corners: [[z.xM, z.yM], [z.xM + z.wM, z.yM], [z.xM + z.wM, z.yM + z.hM], [z.xM, z.yM + z.hM]], area: z.wM * z.hM, thin: P.env === "balcony" && Math.min(z.wM, z.hM) <= .8, sel: 0, w: Math.min(23, z.name.length) * 6 + 16 + (/^\d+$/.test(z.name.trim()) ? 0 : 15) }]));
    st.hits.forEach((h) => { const a = st.anchors[h.userData.zoneId]; if (a) a.h = Math.min(6, h.userData.bounds.h); }); // label height: roof ridge, bed edge…
    st.setupSun(); st.fx.cloudKey = ""; st.fx.precipKey = ""; st.setWeatherFx(st.sky);
    if (dimsChanged) st.fitted = false;
    st.size(); st.select(P.selectedId || P.focusId); setBusy(false); st.setAnim();
    const t = setTimeout(() => { st.renderer.shadowMap.needsUpdate = true; st.requestRender(); }, GROWTH_DURATION_MS + GROWTH_STAGGER_MS + 100);
    return () => clearTimeout(t);
  }, [builtKey, motionReduced]);
  useEffect(() => { state.current?.select(selectedId || focusId); }, [selectedId, focusId]);
  // Morning walk guide: the camera glides to the stop you are on, slowly enough to follow where the next one is.
  const guided = useRef(false);
  useEffect(() => {
    const st = state.current; if (guideZoneId == null || busy || !st?.controls) return;
    const zone = zones.find((z) => String(z.id) === String(guideZoneId)); if (!zone) return;
    setFocusId(String(zone.id)); st.controls.focusZone(zone, guided.current ? 2200 : 1, 1.9); guided.current = true; st.requestRender();
  }, [guideZoneId, busy]); // eslint-disable-line react-hooks/exhaustive-deps
  // an area card opened, changed height or closed (cover.js): frame its area in the part of the map still in view
  useEffect(() => onCover((rect) => {
    const st = state.current, canvas = host.current?.querySelector("canvas"); if (!st?.controls || !canvas) return;
    const box = canvas.getBoundingClientRect();
    st.controls.cover = rect ? coverInset({ left: box.left, top: box.top, right: box.right, bottom: box.bottom }, rect) : null;
    const P = latest.current, id = P.cardZoneId ?? P.focusId, zone = id == null || id === "" ? null : P.zones.find((z) => String(z.id) === String(id));
    if (zone && !P.preview) { setFocusId(String(zone.id)); st.controls.focusZone(zone); st.requestRender(); }
  }), []);
  // the area menu closes on a tap outside it
  useEffect(() => {
    if (!findOpen) return undefined;
    const away = (e) => { if (findRef.current && !findRef.current.contains(e.target)) setFindOpen(false); };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [findOpen]);
  // the sky follows the clock: recomputed once a minute (shadows re-render then), and at once when the
  // weather, the Live sky setting, the town or a harness override changes
  const overrideKey = JSON.stringify(skyOverride);
  useEffect(() => {
    const st = state.current; if (!st) return undefined;
    const tick = () => {
      const o = latest.current.skyOverride; let date = new Date(), wx = latest.current.weather, live = latest.current.liveSky;
      if (o) {
        if (o.fixed) live = false;
        if (o.hour != null) date.setHours(o.hour, 0, 0, 0);
        if (o.wx || o.windKmh != null) wx = { code: { clear: 0, overcast: 3, rain: 61, snow: 73 }[o.wx] ?? 0, windKmh: o.windKmh ?? 10, windDeg: o.windDeg ?? 240, temp: o.temp ?? 15 };
      }
      st.applySky(skyState({ date, lat: latest.current.lat ?? 50, lng: o && o.hour != null ? null : latest.current.lng, weather: wx && wx.ok !== false ? wx : null, liveSky: live, reduced: st.reduced }));
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [weather, liveSky, lat, lng, overrideKey]);
  useEffect(() => { state.current?.pick?.(picked); }, [picked, builtKey]);
  const cropOpen = rich && !!picked;
  useEffect(() => {
    if (!cropOpen) return undefined;
    const r = cropRef.current?.getBoundingClientRect();
    if (r) setCover({ left: 0, top: 0, right: r.right + 12, bottom: window.innerHeight });
    return () => setCover(null);
  }, [cropOpen]);
  useEffect(() => { if (state.current) { state.current.labelsDirty = true; state.current.requestRender(); } }, [tasksByZone, ahead]);
  // full-screen mode: the map takes the whole viewport, page scroll locked, Escape closes
  useEffect(() => {
    fullRef.current = full; const st = state.current, el = host.current, isPreview = mobile && !full;
    setFocusId("");
    st?.controls?.setCooperative(!full);
    if (st?.controls) st.controls.bars = full && (mobile || home) ? { top: 92, bottom: 108, right: home ? homeRight : 0 } : null; // the area chip + close button, and the control bar
    st?.controls?.setEnabled(!isPreview); // the preview tile takes no gestures: one tap opens full screen
    // Open on `click`, not `pointerup`: the browser fires click after pointerup, and if full screen were already
    // open by then the click would land on whatever full-screen control sits under the finger (Exit, the X).
    // The browser already suppresses click after a scroll or a long press; the 8 px / 400 ms check is a backstop.
    let tap = null;
    const down = (e) => { tap = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    const cancel = () => { tap = null; };
    const click = (e) => { const t = tap; tap = null; if (!t) return; if (Math.hypot(e.clientX - t.x, e.clientY - t.y) < 8 && performance.now() - t.t < 700 && !(e.target instanceof Element && e.target.closest("button"))) setFull(true); };
    if (isPreview && el) { el.addEventListener("pointerdown", down); el.addEventListener("pointercancel", cancel); el.addEventListener("click", click); setAhead(0); setTimeOpen(false); setPicked(null); }
    const prev = document.body.style.overflow; if (full) document.body.style.overflow = "hidden";
    // Hide the bottom navigation and assistant button while the map owns the screen.
    document.body.classList.toggle("g3-full-open", full && !home); // the home map keeps the dock on screen
    const key = (e) => { if (e.key === "Escape" && full && !home) setFull(false); };
    window.addEventListener("keydown", key);
    if (st) { st.size(); st.reset(!isPreview); } // back to the tile: the whole farm, no animation
    return () => { window.removeEventListener("keydown", key); if (el) { el.removeEventListener("pointerdown", down); el.removeEventListener("pointercancel", cancel); el.removeEventListener("click", click); } if (full) { document.body.style.overflow = prev === "hidden" ? "" : prev; document.body.classList.remove("g3-full-open"); } };
  }, [full, mobile, home, homeRight]);
  useEffect(() => { if (!hint) return; const t = setTimeout(() => latest.current.dismissHint?.(), 6000); return () => clearTimeout(t); }, [hint]);
  const wholeName = env === "farm" ? "Whole farm" : env === "balcony" ? "Whole balcony" : "Whole garden";
  const areaName = zones.find((zone) => String(zone.id) === focusId)?.name || wholeName;
  function chooseArea(id) {
    const zone = zones.find((item) => String(item.id) === id);
    setFindOpen(false); setFocusId(id);
    if (zone) ctl((c, st) => { c.focusZone(zone); st.reactToZone?.(zone); });
    else ctl((c, st) => st.reset(true));
  }
  const hostStyle = full
    ? { position: "fixed", inset: 0, zIndex: home ? 5 : 6500, overflow: "hidden", touchAction: "none", background: "#b4c69d" }
    : { position: "relative", width: "100%", overflow: "hidden", touchAction: "pan-y" };
  return (
    <div className={`g3-host${full ? " full" : ""}${mobile ? " g3-coarse" : ""}${home ? " g3-home" : ""}${building ? " g3-building" : ""}`} ref={host} style={hostStyle}>
      <div ref={labels} className="g3-labels" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
        {!preview && zones.map((z) => {
          const list = tasksByZone[z.id] || [];
          const AreaIcon = AREA_ICONS[z.type] || MapPin, isNumber = /^\d+$/.test(z.name.trim());
          return (
            <div key={z.id} data-zone={z.id} className={`g3-label${(selectedId || focusId) === z.id ? " on" : ""}`} style={{ position: "absolute", left: 0, top: 0, display: "none", pointerEvents: "auto", whiteSpace: "nowrap" }}>
              <button type="button" className="g3-pill" onClick={(e) => focusAndOpen(e, z)}
                onPointerEnter={(e) => { if (e.pointerType !== "touch") ctl((c, st) => st.hoverZone?.(z.id)); }}
                onPointerLeave={(e) => { if (document.activeElement !== e.currentTarget) ctl((c, st) => st.hoverZone?.(null)); }}
                onFocus={() => ctl((c, st) => st.hoverZone?.(z.id))} onBlur={() => ctl((c, st) => st.hoverZone?.(null))}>
                {!isNumber && <AreaIcon size={11} aria-hidden="true" />}{z.name.length > 23 ? z.name.slice(0, 22) + "…" : z.name}
              </button>
              {(stageInfo.byZone[z.id] || []).length > 0 && (
                <span className="g3-dots" aria-hidden="true">{(stageInfo.byZone[z.id] || []).slice(0, 8).map((st, i) => <i key={i} style={{ background: STAGE_CSS[st] }} />)}</span>
              )}
              {list.length > 0 && onBadge && !ahead && (
                <button type="button" className={`g3-badge${list.some((t) => ["harvest", "eggs", "milk"].includes(t.type)) ? " is-ready" : ""}`} aria-label={`${list.length} job${list.length === 1 ? "" : "s"} waiting at ${z.name}`} onClick={(e) => { e.stopPropagation(); onBadge(z.id); }}>
                  <span>{taskGlyph(list[0])}</span><b>{list.length}</b>
                </button>
              )}
            </div>
          );
        })}
      </div>
      {!preview && <div ref={tipRef} className="g3-tip" style={{ display: "none" }} role="tooltip" />}
      {preview && guideZoneId == null && (
        <div className="g3-open-wrap">
          {jobs > 0 && <button type="button" className="g3-open-badge" onClick={() => setFull(true)}>{jobs} job{jobs === 1 ? "" : "s"}</button>}
          <button type="button" className="g3-open" aria-label="Open the farm map" onClick={() => setFull(true)}><Maximize2 size={16} /><span>Open map</span></button>
        </div>
      )}
      {!preview && ahead > 0 && <div className="g3-preview" role="status">Preview · {new Date(todayKey + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })} · in {ahead} days</div>}
      {!preview && zones.length > 0 && <div className="g3-find" ref={findRef} onKeyDown={(e) => { if (e.key === "Escape" && findOpen) { e.stopPropagation(); setFindOpen(false); } }}>
        {/* the area chip: a white pill like the name pills, with the app's own menu (was a raw browser dropdown) */}
        <button type="button" className="g3-area" aria-haspopup="listbox" aria-expanded={findOpen} aria-label={`Showing ${areaName}. Choose an area`} onClick={() => setFindOpen(!findOpen)}><span>{areaName}</span><ChevronDown size={14} aria-hidden="true" /></button>
        {findOpen && <ul className="g3-area-menu" role="listbox" aria-label="Areas on the map">
          <li><button type="button" role="option" aria-selected={!focusId} onClick={() => chooseArea("")}><span>{wholeName}</span></button></li>
          {zones.map((zone) => <li key={zone.id}><button type="button" role="option" aria-selected={focusId === String(zone.id)} onClick={() => chooseArea(String(zone.id))}><span>{zone.name}</span>{(tasksByZone[zone.id] || []).length > 0 && <b aria-label={`${tasksByZone[zone.id].length} jobs`}>{tasksByZone[zone.id].length}</b>}</button></li>)}
        </ul>}
      </div>}
      {!preview && <div className="g3-ctl" role="group" aria-label="Map view controls">
        {/* Visible words under the icons (UX audit 2026-09-28: a calendar icon didn't say "growth preview"). */}
        <button type="button" className="g3-btn g3-lbl" aria-label="Growth preview and legend" title="See how your plants grow over the coming weeks" aria-pressed={timeOpen} onClick={() => { if (timeOpen) setAhead(0); setTimeOpen(!timeOpen); }}><Sprout size={17} /><span aria-hidden="true">{rich ? "See how it grows" : "Growth"}</span></button>
        <button type="button" className="g3-btn g3-zoom" aria-label="Zoom in" title="Zoom in" onClick={() => ctl((c) => c.zoomBy(.66))}><Plus size={18} /></button>
        <button type="button" className="g3-btn g3-zoom" aria-label="Zoom out" title="Zoom out" onClick={() => ctl((c) => c.zoomBy(1 / .66))}><Minus size={18} /></button>
        <button type="button" className="g3-btn g3-lbl" aria-label="Reset view" title="Show the whole map again" onClick={() => { setFocusId(""); ctl((c, st) => st.reset(true)); }}><Compass size={17} /><span aria-hidden="true">{rich ? `Show the ${wholeName.toLowerCase()}` : "Reset"}</span></button>
        {!home && <button type="button" className="g3-btn g3-lbl g3-exit" aria-label={full ? "Exit full screen" : "Full screen map"} title={full ? "Exit full screen" : "Open the map full screen"} aria-pressed={full} onClick={() => setFull(!full)}>{full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}<span aria-hidden="true">{full ? "Exit" : "Expand"}</span></button>}
      </div>}
      {full && !home && <button type="button" className="g3-btn g3-close" aria-label="Close full screen map" onClick={() => setFull(false)}><X size={20} /></button>}
      {!preview && timeOpen && (
        <div className="g3-time" role="group" aria-label="Growth preview">
          <div className="g3-time-row">
            <strong>{ahead ? `In ${ahead} days` : "Today"}</strong>
            {[[0, "Today"], [14, "+2 wk"], [30, "+1 mo"], [60, "+2 mo"], [90, "+3 mo"]].map(([d, l]) => (
              <button key={d} type="button" className={`g3-chip${ahead === d ? " on" : ""}`} aria-pressed={ahead === d} onClick={() => setAhead(d)}>{l}</button>
            ))}
          </div>
          <input type="range" min="0" max="120" step="1" value={ahead} aria-label="Days from today" onChange={(e) => setAhead(Number(e.target.value))} />
          <div className="g3-legend">
            {STAGES.map((name, i) => (
              <span key={name}><i style={{ background: STAGE_CSS[i] }} />{name}{stageInfo.totals[i] ? ` ${stageInfo.totals[i]}` : ""}</span>
            ))}
          </div>
          {ahead > 0 && <div className="g3-estimate">Future growth is an estimate</div>}
        </div>
      )}
      {!preview && picked && pickInfo && (
        <div className={`g3-crop${rich ? " is-rich" : ""}`} ref={cropRef} role="dialog" aria-label={`${picked.crop} details`}>
          <div className="g3-crop-head">
            <span className="g3-crop-art" aria-hidden="true"><PlantArt crop={picked.crop} stage={picked.stage} size={48} /></span>
            <div><strong>{picked.crop}</strong><small>{picked.zone}{picked.count ? ` · ${picked.count} plants` : ""}</small></div>
            <button type="button" className="g3-crop-x" aria-label="Close crop details" onClick={() => pickRow(null)}><X size={15} /></button>
          </div>
          <div className="g3-crop-stage"><i style={{ background: STAGE_CSS[picked.stage] }} />{picked.stage === 5 ? "In its harvest window" : picked.left == null ? STAGES[picked.stage] : picked.left > 0 ? `${STAGES[picked.stage]} · harvest in ${picked.left} d` : `${STAGES[picked.stage]} · past harvest date`}{picked.estimated ? (ahead ? " · estimated" : "") : " · observed"}</div>
          <div className="g3-crop-group"><strong>{pickInfo.rows} row{pickInfo.rows === 1 ? "" : "s"} highlighted</strong>{pickInfo.plants ? ` · ${pickInfo.plants} plants` : ""}{pickInfo.areas.length ? ` · ${pickInfo.areas.join(", ")}` : ""}{pickInfo.soonest != null ? ` · first harvest ${pickInfo.soonest > 0 ? `in ${pickInfo.soonest} d` : "now"}` : ""}</div>
          {pickInfo.rows > 1 && <div className="g3-legend g3-crop-stages">{STAGES.map((n, i) => pickInfo.stages[i] ? <span key={n}><i style={{ background: STAGE_CSS[i] }} />{n} {pickInfo.stages[i]}</span> : null)}</div>}
          {pickInfo.c && (
            <dl className="g3-crop-facts">
              <div><dt>Sun</dt><dd>{pickInfo.c.sun}</dd></div>
              <div><dt>Water</dt><dd>{pickInfo.c.waterFreq}</dd></div>
              <div><dt>Spacing</dt><dd>{pickInfo.c.spacing} cm</dd></div>
              <div><dt>Harvest</dt><dd>{pickInfo.c.harvest}</dd></div>
            </dl>
          )}
          {rich && pickInfo.c && (
            <div className="g3-crop-more">
              <ol className="g3-crop-track" aria-label={`Stage: ${STAGES[picked.stage]}`}>
                {STAGES.map((n, i) => <li key={n} className={i < picked.stage ? "is-past" : i === picked.stage ? "is-now" : ""}><i style={{ background: i <= picked.stage ? STAGE_CSS[i] : undefined }} /><span>{n}</span></li>)}
              </ol>
              {cropExtra && cropExtra(picked.crop)}
              <dl className="g3-crop-facts">
                <div><dt>Sow</dt><dd>{pickInfo.c.sowIn}</dd></div>
                <div><dt>Ready in</dt><dd>about {pickInfo.c.days} days</dd></div>
                <div><dt>Soil pH</dt><dd>{pickInfo.c.pH}</dd></div>
                {pickInfo.age != null && <div><dt>In the ground</dt><dd>{pickInfo.age} day{pickInfo.age === 1 ? "" : "s"}</dd></div>}
              </dl>
              {pickInfo.c.waterNote && <section className="g3-crop-sec"><h4>Watering</h4><p>{pickInfo.c.waterNote}</p></section>}
              {pickInfo.c.fert && <section className="g3-crop-sec"><h4>Feeding</h4><p>{pickInfo.c.fert}</p></section>}
              {(pickInfo.c.steps || []).length > 0 && (
                <section className="g3-crop-sec"><h4>What to do, and when</h4>
                  <ol className="g3-crop-steps">{pickInfo.c.steps.map((s, i) => <li key={i} className={i === pickInfo.step ? "is-now" : ""}><b>Day {s.d}</b><span><strong>{s.l}</strong>{s.t}</span></li>)}</ol>
                </section>
              )}
              {(pickInfo.friends.good.length > 0 || pickInfo.friends.bad.length > 0) && (
                <section className="g3-crop-sec"><h4>Neighbours</h4>
                  {pickInfo.friends.good.length > 0 && <p><strong>Grows well with</strong> {pickInfo.friends.good.join(", ")}</p>}
                  {pickInfo.friends.bad.length > 0 && <p><strong>Keep apart from</strong> {pickInfo.friends.bad.join(", ")}</p>}
                </section>
              )}
              {(pickInfo.c.pests || []).length > 0 && (
                <section className="g3-crop-sec"><h4>Watch for</h4>
                  <ul className="g3-crop-pests">{pickInfo.c.pests.map((p) => <li key={p.n}><strong>{p.n}</strong>{p.t}</li>)}</ul>
                </section>
              )}
              {pickInfo.c.storage && <section className="g3-crop-sec"><h4>Storing it</h4><p>{pickInfo.c.storage}</p></section>}
            </div>
          )}
          {onShowCrops && <button type="button" className="g3-chip" onClick={onShowCrops}>Open Crops →</button>}
        </div>
      )}
      {!preview && hint && !busy && !picked && <div className="g3-hint" aria-hidden="true">Drag to move · pinch or scroll to zoom · two fingers to turn</div>}
      {!preview && coop && <div className="g3-coop" role="status">{coop === "touch" ? "Use two fingers to move the map, or open it full screen" : "Hold ⌘ / Ctrl and scroll to zoom the map"}</div>}
      {busy && <div className="g3-busy" aria-live="polite">Building your farm…</div>}
    </div>
  );
}
