/* ═══════════════════════════════════════════
   TOY KIT — the shared vocabulary of the rounded "toy farm" look of the 3D map.
   Every box is a rounded box, every post a capsule, every rim a torus; every
   surface is one flat matte colour from the palette below (no textures); the
   whole scene is lit bright and soft. The style rules live in docs/MAP_STYLE.md.
   MARKER: GROVE_TOY_KIT_V1
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { TOY, STAGE_HEX } from "./palette";

export const HPI = Math.PI / 2;
/* NIGHT (0..1) — set by Grove3D's sky; window glass and lamps glow warm as it rises */
export const NIGHT = { value: 0 };
/* WIND — (dirX, dirZ, strength 0..1): where the air moves toward in scene space; set by Grove3D's sky */
export const WIND = { value: new THREE.Vector3(.72, -.69, .15) };
export function nightGlow(mat, k = .55, rgb = [1, .82, .48]) {
  if (mat.userData.nightGlow) return mat; mat.userData.nightGlow = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uNight = NIGHT;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uNight;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\ntotalEmissiveRadiance += uNight * vec3(${rgb.map((v) => v.toFixed(3)).join(", ")}) * ${k.toFixed(2)};`);
  };
  mat.customProgramCacheKey = () => `g3night${k}|${rgb.join(",")}`;
  return mat;
}
/* nightTint(mat, k, rgb) — after dark, ground colours slide toward a cool blue (look A: the land goes navy at dusk while
   the farm's lit windows stay warm). k = strength at full night; daylight is untouched. */
export function nightTint(mat, k = .8, rgb = [.13, .2, .36]) {
  if (mat.userData.nightTint) return mat; mat.userData.nightTint = true;
  const prev = mat.onBeforeCompile, c = rgb.map((v) => v.toFixed(3)).join(", ");
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uNightT = NIGHT;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uNightT;")
      .replace("#include <color_fragment>", `#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(${c}), uNightT * ${k.toFixed(2)});`);
  };
  const prevKey = mat.customProgramCacheKey?.bind(mat); // chain: foliage / other patches keep their own program key
  mat.customProgramCacheKey = () => `${prevKey ? prevKey() : ""}|g3tint${k}|${c}`;
  return mat;
}
/* ripple(mat, { time, ripple }) — a gentle vertex wave on pond water (two crossing waves; ×3 under rain), with the
   normal tilted so the gloss shimmers. Idempotent: `materials()` runs on every world build and flat() shares
   materials, so a second call must not wrap the first (that declared uTime/uRipple twice → invalid program). */
export function ripple(mat, { time, ripple: amount }) {
  if (mat.userData.ripple) return mat; mat.userData.ripple = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    Object.assign(sh.uniforms, { uTime: time, uRipple: amount, uWaterWind: WIND });
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
uniform float uTime; uniform float uRipple; uniform vec3 uWaterWind;
vec3 g3Wave(vec2 p) {
  vec2 d = normalize(uWaterWind.xy), crossD = vec2(-d.y, d.x);
  float a = dot(p, d) * 3.1 - uTime * (1.1 + uWaterWind.z);
  float b = dot(p, crossD) * 2.7 - uTime * .85;
  float amp = uRipple * .012;
  vec2 slope = (d * cos(a) * 3.1 + crossD * cos(b) * 2.7 * .45) * amp;
  return vec3(slope, (sin(a) + sin(b) * .45) * amp);
}`)
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
{ vec3 wave = g3Wave(position.xz); objectNormal = normalize(objectNormal - vec3(wave.x, 0., wave.y)); }`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
transformed.y += g3Wave(position.xz).z;`);
  };
  mat.customProgramCacheKey = () => "g3ripple-wind-v2";
  return mat;
}
/* texture(mat, kind) — surface detail painted in the fragment shader from world position: no image files, nothing
   to download. Look C (2026-11-10, docs/MAP_STYLE.md §11): each kind now describes a real material — colour that
   varies in hue as well as brightness, wear where wear happens, and a height (`g3H`, metres) that tilts the
   shading normal, so light catches tile edges, board seams, mortar joints and grain. The finest detail fades out
   with distance so far surfaces never shimmer. Helpers: `g3face()` the face's world normal, `g3uv(n)` metres
   along / up a wall or across a floor, `g3member()` metres along / across the longer side of the face being drawn
   (from the primitive's own uv), so wood grain runs along every post, rail and board whichever way it lies.
   Kinds: meadow, lawn, soil, gravel (ground); roof (clay tile courses), slate; wood (members), planks (boarded
   walls, doors, decks); plaster, stone (coursed blocks, flagstones on floors), concrete, clay (pots), metal, zinc (corrugated where it is a roof sheet), hay;
   hedge (clipped foliage, shrubs); tile is unchanged. Chains with sway / night patches. */
const G3NOISE = `varying vec3 vG3W; varying vec2 vG3U; float g3H = 0.; float g3K = 0.;
float g3h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float g3n(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f); return mix(mix(g3h(i), g3h(i + vec2(1., 0.)), u.x), mix(g3h(i + vec2(0., 1.)), g3h(i + vec2(1., 1.)), u.x), u.y); }
float g3fine(float a, float b) { return 1. - smoothstep(a, b, distance(vG3W, cameraPosition)); }
vec3 g3face() { vec3 n = cross(dFdx(vG3W), dFdy(vG3W)); return n / max(length(n), 1e-9); }
vec2 g3uv(vec3 n) { vec3 a = abs(n); return a.y > .6 ? vG3W.xz : a.x > a.z ? vG3W.zy : vG3W.xy; }
vec4 g3member() { vec2 ux = dFdx(vG3U), uy = dFdy(vG3U); vec3 wx = dFdx(vG3W), wy = dFdy(vG3W); float det = ux.x * uy.y - ux.y * uy.x;
  if (abs(det) < 1e-12) return vec4(vG3W.y, vG3W.x + vG3W.z, 1., 1.);
  float lu = length((wx * uy.y - wy * ux.y) / det), lv = length((wy * ux.x - wx * uy.x) / det);
  return lu > lv * 1.07 ? vec4(vG3U.x * lu, vG3U.y * lv, lu, lv) : vec4(vG3U.y * lv, vG3U.x * lu, lv, lu); }`;
// the shading normal tilted by the slope of g3H (after three's bump mapping, with the height in metres)
const G3BUMP = `vec3 g3bump(vec3 n) { vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), r1 = cross(sy, n), r2 = cross(n, sx); float det = dot(sx, r1) * (gl_FrontFacing ? 1. : -1.);
  if (abs(det) < 1e-12) return n; return normalize(n - g3K * (dFdx(g3H) * r1 + dFdy(g3H) * r2) / det); }
`;
/* Cost rule: grass, plaster, concrete and clay set no height (their relief was invisible and the normal maths was not free);
   everything fine sits inside `if (fine > .02)`, so a surface far from the camera pays for one or two
   noise lookups, as it did before look C; the detail is only computed where it can be seen. */
const roofTex = (barrel) => `{ float fine = g3fine(20., 55.); float cy = vG3W.y / .17, row = floor(cy), v = fract(cy), lip = 1. - smoothstep(0., .32, v);
  vec3 c = diffuseColor.rgb * (1. - .36 * lip);
  if (fine > .02) { vec3 t = normalize(cross(vec3(0., 1., .001), g3face()));
    float cu = dot(vG3W, t) / ${barrel ? ".23" : ".3"} + mod(row, 2.) * .5${barrel ? "" : " + g3h(vec2(row, 1.)) * .4"}, colm = floor(cu), u = fract(cu), id = g3h(vec2(row, colm));
    float rise = ${barrel ? "sin(u * 3.1416)" : "smoothstep(0., .06, min(u, 1. - u))"};
    vec3 d = c * (.84 + id * .28) * ${barrel ? "(.8 + .28 * rise)" : "(.86 + .14 * rise)"}; d = mix(d, d * vec3(.8, .86, .78), step(.8, g3h(vec2(colm, row) + 9.)) * .55);
    d = mix(d, vec3(.36, .42, .22), smoothstep(.66, .86, g3n(vG3W.xz * .8 + 11.)) * (1. - v * .5) * .35);
    c = mix(c, d, fine); g3H = rise * ${barrel ? ".025" : ".006"} + (1. - v) * .03 * smoothstep(0., .14, v); g3K = fine; }
  diffuseColor.rgb = c; }`;
const TEX = {
  meadow: `{ vec2 p = vG3W.xz; float fine = g3fine(22., 60.); float lo = g3n(p * .35), n = lo * .5 + g3n(p * 1.6) * .35;
  vec3 c = diffuseColor.rgb; c = mix(c, c * vec3(1.13, 1.03, .76), smoothstep(.55, .85, lo) * .4);
  if (fine > .02) { float bl = g3n(vec2(p.x * 30. + p.y * 9., p.y * 13.)) - .5; n += ((g3n(p * 7.) - .5) * .5 + (g3h(floor(p * 10.)) - .5) * .25 + bl * .26) * fine; }
  diffuseColor.rgb = c * (.85 + n * .3); }`,
  lawn: `{ vec2 p = vG3W.xz; float fine = g3fine(18., 50.); float n = g3n(p * .5) * .5 + g3n(p * 2.) * .3, st = step(.5, fract(p.x / 1.3));
  if (fine > .02) { float bl = g3n(vec2(p.x * 34. + p.y * 9., p.y * 14. + st * 5.)) - .5; n += ((g3n(p * 8.) - .5) * .4 + bl * .4) * fine; }
  diffuseColor.rgb *= (.955 + st * .09) * (.9 + n * .18); }`,
  soil: `{ vec2 p = vG3W.xz; float fine = g3fine(18., 50.); float lo = g3n(p * 5.); vec3 c = diffuseColor.rgb * (.8 + lo * .24);
  if (fine > .02) { float cl = g3n(p * 14.), st = step(.965, g3h(floor(p * 26.))); c *= 1. + (cl - .5) * .4 * fine; c = mix(c, c * vec3(.84, .82, .82), smoothstep(.45, .8, g3n(p * .8 + 3.)) * .5); c = mix(c, vec3(.56, .52, .46), st * .4 * fine); g3H = cl * .03 + st * .01; g3K = fine; }
  diffuseColor.rgb = c; }`,
  gravel: `{ float fine = g3fine(18., 50.); vec3 c = diffuseColor.rgb * (.92 + g3n(vG3W.xz * 2.5) * .1);
  if (fine > .02) { vec2 p = vG3W.xz * 14., i = floor(p), f = fract(p); float s = g3h(i), s2 = g3h(i + 17.), stone = 1. - smoothstep(.26, .46, length(f - .5 - (vec2(s, s2) - .5) * .4));
    c = mix(c, mix(c * .76, c * (.84 + s * .36) * mix(vec3(1.), vec3(1.07, 1., .9), s2), stone), fine); g3H = stone * .012; g3K = fine; }
  diffuseColor.rgb = c; }`,
  roof: roofTex(true), slate: roofTex(false),
  plaster: `{ vec3 p = vG3W; float fine = g3fine(20., 60.); float n = g3n(p.xy * 1.2 + p.z) * .5 + g3n(p.xy * 5. + p.z * 2.) * .3; vec3 c = diffuseColor.rgb;
  if (fine > .02) { float wall = 1. - smoothstep(.3, .7, abs(g3face().y)), gr = g3h(floor(p.xy * 28.)) - .5; n += gr * .25 * fine;
    c = mix(c, c * vec3(.9, .89, .85), smoothstep(.55, .9, g3n(vec2((p.x + p.z) * 3.2, p.y * .35))) * wall * .35 * fine); c = mix(c, c * vec3(.8, .76, .68), (1. - smoothstep(0., .5, p.y)) * wall * .4 * fine); }
  diffuseColor.rgb = c * (.955 + n * .075); }`,
  tile: "{ vec2 p = vG3W.xz; diffuseColor.rgb *= .955 + g3n(p * 3.5) * .07 + (g3h(floor(p * 22.)) - .5) * .05; }",
  wood: `{ float fine = g3fine(14., 40.); float tone = g3n(vG3W.xz * .9 + vG3W.y * .7); vec3 c = diffuseColor.rgb * (.84 + tone * .22);
  if (fine > .02) { vec4 m = g3member(); float ring = g3n(vec2(m.y * 46. + g3n(vec2(m.x * 1.4, m.y * 7.)) * 5., m.x * 2.4));
    c *= 1. + (ring - .5) * .34 * fine; c = mix(c, c * vec3(.5, .42, .36), smoothstep(.9, .97, g3n(vec2(m.x * 1.9 + 3., m.y * 11.))) * fine); g3H = ring * .005; g3K = fine; }
  diffuseColor.rgb = mix(c, vec3(dot(c, vec3(.333))) * vec3(1.03, 1., .95), .06 + .16 * tone); }`,
  planks: `{ float fine = g3fine(16., 45.); vec3 c = diffuseColor.rgb * .96;
  if (fine > .02) { vec3 gN = g3face(); vec2 q = g3uv(gN); float bi = floor(q.x / .15), f = fract(q.x / .15), wall = 1. - smoothstep(.3, .7, abs(gN.y)), low = 1. - smoothstep(0., 1.1, vG3W.y);
    float seam = 1. - smoothstep(0., .09, min(f, 1. - f)), grain = g3n(vec2(q.x * 60. + bi * 3.7, q.y * 2.5 + bi * 7.)), flake = smoothstep(.62, .8, g3n(q * vec2(9., 3.) + bi)) * low * wall;
    vec3 d = diffuseColor.rgb * (.86 + g3h(vec2(bi, 4.)) * .2) * (1. + (grain - .5) * .22); d = mix(d, vec3(.55, .5, .44) * (.8 + grain * .3), flake * .6);
    c = mix(c, d * (1. - seam * .45) * (1. - .14 * wall * low * low), fine); g3H = grain * .003 - seam * .012; g3K = fine; }
  diffuseColor.rgb = c; }`,
  stone: `{ float fine = g3fine(16., 45.); vec3 base = diffuseColor.rgb, c = base * .97;
  if (fine > .02) { vec3 gN = g3face(); vec2 q = g3uv(gN), s = abs(gN.y) > .6 ? vec2(.46, .46) : vec2(.4, .19); float row = floor(q.y / s.y), gr = g3n(q * 11.);
    vec2 b = vec2(q.x / s.x + g3h(vec2(row, 3.)), q.y / s.y), id = floor(b), f = fract(b); float mortar = 1. - smoothstep(.004, .022, min(min(f.x, 1. - f.x) * s.x, min(f.y, 1. - f.y) * s.y));
    vec3 d = base * (.86 + g3h(id) * .24) * (.93 + gr * .14); d = mix(d, d * vec3(1.06, 1., .9), g3h(id + 5.) * .6);
    c = mix(c, mix(d, base * .68, mortar), fine); g3H = (1. - mortar) * .014 + gr * .004; g3K = fine; }
  diffuseColor.rgb = c; }`,
  concrete: `{ float fine = g3fine(16., 45.); vec3 c = diffuseColor.rgb;
  if (fine > .02) { vec2 q = g3uv(g3face()); float sp = g3h(floor(q * 60.)) - .5; c *= 1. + ((g3n(q * 4.5) - .5) * .12 + sp * .1) * fine; c = mix(c, c * vec3(.86, .85, .8), smoothstep(.55, .85, g3n(vec2(q.x * 3., q.y * .5) + 9.)) * .4 * fine); }
  diffuseColor.rgb = c * (.94 + g3n(vG3W.xz * 1.1 + vG3W.y) * .1); }`,
  clay: `{ float fine = g3fine(12., 35.); vec3 c = diffuseColor.rgb * .98;
  if (fine > .02) { vec3 p = vG3W; float ring = sin(p.y * 190.) * .5 + .5, n = g3n(p.xz * 6. + p.y * 3.) * .6 + g3n(p.xy * 17. + p.z * 5.) * .4;
    vec3 d = diffuseColor.rgb * (.86 + n * .24) * (1. - ring * .06); c = mix(c, mix(d, vec3(.86, .8, .72), smoothstep(.55, .8, g3n(vec2(p.x * 9. + p.z * 7., p.y * 4.))) * .2), fine); }
  diffuseColor.rgb = c; }`,
  metal: `{ float fine = g3fine(14., 40.);
  if (fine > .02) { vec4 m = g3member(); vec3 c = diffuseColor.rgb * (1. + (g3n(vec2(m.y * 160., m.x * 3.)) - .5) * .16 * fine); diffuseColor.rgb = mix(c, vec3(.48, .3, .2), smoothstep(.74, .92, g3n(vG3W.xz * 5. + vG3W.y * 9.)) * .25 * fine); } }`,
  zinc: `{ float fine = g3fine(16., 45.);
  if (fine > .02) { vec4 m = g3member(); vec3 gN = g3face(), t = normalize(cross(vec3(0., 1., .001), gN)); float wv = sin(dot(vG3W, t) * 82.7) * step(.5, abs(gN.y)) * step(.6, min(m.z, m.w));
    vec3 c = diffuseColor.rgb * (1. + (g3n(vec2(m.y * 160., m.x * 3.)) - .5) * .12 * fine) * (1. + wv * .1 * fine); diffuseColor.rgb = mix(c, vec3(.48, .3, .2), smoothstep(.74, .92, g3n(vG3W.xz * 5. + vG3W.y * 9.)) * .2 * fine); g3H = wv * .009; g3K = fine; } }`,
  hay: `{ float fine = g3fine(14., 40.); vec3 p = vG3W, c = diffuseColor.rgb;
  if (fine > .02) { float st = max(g3n(vec2(p.x * 70. + p.y * 30., p.z * 6.)), g3n(vec2(p.z * 64. - p.y * 26., p.x * 7.))); c *= mix(1., .8 + st * .36, fine); g3H = st * .01; g3K = fine; }
  diffuseColor.rgb = mix(c, c * vec3(.8, .74, .6), smoothstep(.6, .8, g3n(p.xz * 3.)) * .4); }`,
  hedge: `{ vec3 p = vG3W; float fine = g3fine(16., 45.); float n = g3n(p.xz * 2.2 + p.y * 3.7) * .55 + g3n(p.xy * 3.5 + p.z * 2.) * .45; vec3 c = diffuseColor.rgb * (.78 + n * .44);
  if (fine > .02) { vec2 q = g3uv(g3face()) * 15. + p.zx * 4., i = floor(q), f = fract(q); float s = g3h(i), leafy = 1. - smoothstep(.18, .5, length(f - .5 - (vec2(s, g3h(i + 7.)) - .5) * .5));
    c = mix(c, mix(c * .55, c * (.92 + s * .34) * mix(vec3(1.), vec3(1.14, 1.06, .78), g3h(i + 3.)), leafy), fine); g3H = leafy * .02; g3K = fine; }
  diffuseColor.rgb = c; }`,
};
export const TEXTURES = Object.keys(TEX);
export function texture(mat, kind) {
  if (mat.userData.g3tex) return mat; mat.userData.g3tex = kind;
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey?.bind(mat);
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vG3W; varying vec2 vG3U;")
      .replace("#include <project_vertex>", "#include <project_vertex>\n{ vec4 g3p = vec4(transformed, 1.);\n#ifdef USE_INSTANCING\ng3p = instanceMatrix * g3p;\n#endif\nvG3W = (modelMatrix * g3p).xyz; vG3U = uv; }");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\n" + G3NOISE)
      .replace("void main() {", G3BUMP + "void main() {")
      .replace("#include <color_fragment>", "#include <color_fragment>\n" + TEX[kind])
      .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\nif (g3K > 0.) normal = g3bump(normal);");
  };
  mat.customProgramCacheKey = () => `${prevKey ? prevKey() : ""}|g3tex-c-${kind}`;
  return mat;
}
export const UP = new THREE.Vector3(0, 1, 0);

/* ---------- palette: the shared map palette (palette.js) as numbers for three.js ---------- */
const num = (v) => (Array.isArray(v) ? v.map(num) : parseInt(v.slice(1), 16));
export const PAL = Object.fromEntries(Object.entries(TOY).map(([k, v]) => [k, num(v)]));
export const STAGE_COLOR = STAGE_HEX.map(num);

/* ---------- materials: one flat matte material per colour, shared by the whole scene ---------- */
const mats = new Map();
export function flat(color, { rough = .88, metal = 0, side = THREE.FrontSide, transparent = false, opacity = 1, emissive = 0, ei = 0, vertexColors = false, depthWrite = true, physical = false, env = 1, variant = "" } = {}) {
  // `variant` separates materials that share every option but get different shader patches (pond water vs trough water)
  const key = [color, rough, metal, side, transparent ? 1 : 0, opacity, emissive, ei, vertexColors ? 1 : 0, depthWrite ? 1 : 0, physical ? 1 : 0, env, variant].join("|");
  let m = mats.get(key);
  if (!m) {
    // Matte surfaces (roughness .5 and up, no metal) are Lambert: at these roughness values the physical model's
    // highlight is invisible, and its per-pixel maths was a third of a balcony's frame. Glass, water and metal
    // stay physically based. `rough` still separates cache entries, so nothing that shared a material splits.
    const matte = !physical && !(metal > 0) && !(rough < .5);
    if (matte) m = new THREE.MeshLambertMaterial({ color, side, transparent, opacity, emissive, emissiveIntensity: ei, vertexColors, depthWrite });
    else m = new (physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({ color, roughness: rough, metalness: metal, side, transparent, opacity, emissive, emissiveIntensity: ei, vertexColors, depthWrite, envMapIntensity: env });
    if (transparent) m.forceSinglePass = true;
    if (isGlossy(m)) {
      // glossy: reflections come from the environment map, the soft fill from the scene's lights like everything else
      // (without this the fill would be counted twice: once from the map, once from the hemisphere light)
      m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("#include <lights_fragment_maps>", "#include <lights_fragment_maps>\n#if defined( USE_ENVMAP ) && defined( RE_IndirectDiffuse )\n\tiblIrradiance = vec3( 0. );\n#endif"); };
      m.customProgramCacheKey = () => "g3gloss";
      if (ENV.tex) { m.envMap = ENV.tex; m.envMapIntensity = ENV.intensity; }
    }
    mats.set(key, m);
  }
  return m;
}
/* ---------- environment reflections only where they show (2026-11-09) ----------
   Every material used to sample the room environment map for its ambient light: on matte surfaces that is two
   blurred cube-map lookups per pixel for a soft glow a plain ambient light gives for free (it was 61 % of the
   frame on a software rasteriser). Now only glossy materials (glass, water, metal: physical, metalness > 0 or
   roughness < .5) carry the map, for reflections only; the scene has no `environment`. The fill it gave is folded
   into the one hemisphere light: `fillLight()` returns the sky and ground colours to add for a sky state's
   envIntensity (fitted against screenshots of the old lighting). */
const ENV = { tex: null, intensity: .22 };
export const ENV_FILL = { color: [.907, .907, 1], gain: 5.36 }; // linear RGB x (gain x envIntensity): 1.18 at the daytime .22
/* hemisphere colours (linear RGB, to use at intensity 1) for a sky preset plus the environment's fill */
export function fillLight(hemiSky, hemiGround, hemiIntensity, envIntensity) {
  const k = envIntensity * ENV_FILL.gain, add = (c) => c.map((v, i) => v * hemiIntensity + ENV_FILL.color[i] * k);
  return { sky: add(hemiSky), ground: add(hemiGround) };
}
const isGlossy = (m) => m.isMeshPhysicalMaterial === true || m.metalness > 0 || m.roughness < .5;
/* Called by a map before every frame it draws: cheap when nothing changed, and it lets two maps on one page
   (each with its own WebGL context and its own copy of the environment map) share the material cache. */
export function setEnvironment(tex, intensity) {
  if (ENV.tex === tex && ENV.intensity === intensity) return;
  ENV.tex = tex; ENV.intensity = intensity;
  mats.forEach((m) => { if (!isGlossy(m)) return; if (m.envMap !== tex) { if (!m.envMap || !tex) m.needsUpdate = true; m.envMap = tex; } m.envMapIntensity = intensity; });
}
/* layered flat planes (paths, patches) sit on the ground with a polygon offset so they never z-fight */
export function layered(mat, n) { mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -n; return mat; }

/* ---------- detail tier: phones build every round shape with fewer segments (Grove3D calls setDetail before a
   world build; icons and desktop stay at 1). The cache key carries the final segment count, so tiers never mix. ---------- */
export const DETAIL = { value: 1 };
export function setDetail(v) { DETAIL.value = v > 0 ? Math.min(1, v) : 1; }
/* Which tier a phone builds. A balcony or a back garden is light (about 140 k / 220 k triangles at full detail,
   inside the phone budget of 300 k), so it keeps every curve smooth; the lighter tier is for farms, and for a
   garden someone has packed like one. Desktop is always 1. */
export function detailFor({ mobile, env, zones = 0, plants = 0 }) {
  if (!mobile) return 1;
  if (env !== "farm" && zones <= 12 && plants <= 250) return 1;
  return .45;
}
const sg = (n, min) => Math.max(min, Math.round(n * DETAIL.value));
/* ---------- geometry cache: dimensions are quantised to 5 mm so repeated parts share one buffer ---------- */
const geos = new Map();
const q = (v) => Math.round(v * 200) / 200;
function cached(key, make) { let g = geos.get(key); if (!g) { g = make(); g.userData.shared = true; geos.set(key, g); } return g; } // shared: survives world rebuilds (see disposeWorld)
export function rboxGeo(w, h, d, r, seg) {
  const mn = Math.min(w, h, d);
  const rr = Math.min(r ?? Math.min(mn * .24, .32), mn / 2 - .001), s = seg ?? (mn >= .28 && DETAIL.value >= .8 ? 2 : 1);
  if (rr <= .004) return cached(`b|${q(w)}|${q(h)}|${q(d)}`, () => new THREE.BoxGeometry(w, h, d));
  return cached(`rb|${q(w)}|${q(h)}|${q(d)}|${q(rr)}|${s}`, () => new RoundedBoxGeometry(w, h, d, s, rr));
}
// minSeg / minRings: big shapes (tree crowns) stay round on the phone tier
export function sphereGeo(seg = 14, rings = 10, minSeg = 7, minRings = 5) { seg = sg(seg, minSeg); rings = sg(rings, minRings); return cached(`s|${seg}|${rings}`, () => new THREE.SphereGeometry(1, seg, rings)); }
export function capsuleGeo(r, len, seg = 10, cap = 4) { seg = sg(seg, 6); cap = sg(cap, 2); return cached(`c|${q(r)}|${q(len)}|${seg}|${cap}`, () => new THREE.CapsuleGeometry(r, len, cap, seg)); }
export function cylGeo(rt, rb, h, seg = 16, open = false) { seg = sg(seg, 6); return cached(`y|${q(rt)}|${q(rb)}|${q(h)}|${seg}|${open ? 1 : 0}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)); }
export function torusGeo(R, r, tube = 8, seg = 20, arc = Math.PI * 2) { tube = sg(tube, 4); seg = sg(seg, 10); return cached(`t|${q(R)}|${q(r)}|${tube}|${seg}|${arc.toFixed(2)}`, () => new THREE.TorusGeometry(R, r, tube, seg, arc)); }
export function coneGeo(r, h, seg = 12) { return cached(`k|${q(r)}|${q(h)}|${seg}`, () => new THREE.ConeGeometry(r, h, seg)); }
export function discGeo(r, seg = 24) { seg = sg(seg, 10); return cached(`d|${q(r)}|${seg}`, () => new THREE.CircleGeometry(r, seg)); }
export function planeGeo(w, h) { return cached(`p|${q(w)}|${q(h)}`, () => new THREE.PlaneGeometry(w, h)); }

/* ---------- baking: many static meshes of one material become one indexed geometry ----------
   `bakeSource(geo)` is the form a primitive is merged in: position / normal / uv only, and always indexed — a
   geometry without an index (rounded boxes) gets one by welding its identical vertices. Cached per primitive.
   `mergeBaked(items)` writes every item's vertices, moved by its world matrix, straight into one set of arrays
   (no clone per mesh, which was most of a world rebuild) and returns a NEW geometry the caller owns: it is not
   flagged shared, so a rebuild frees it (a lone primitive used to be cloned with its `shared` flag and leaked). */
const baked = new WeakMap();
export function bakeSource(src) {
  let g = baked.get(src);
  if (!g) {
    g = new THREE.BufferGeometry();
    g.setAttribute("position", src.attributes.position.clone());
    if (src.attributes.normal) g.setAttribute("normal", src.attributes.normal.clone());
    g.setAttribute("uv", src.attributes.uv ? src.attributes.uv.clone() : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (src.index) g.setIndex(src.index.clone());
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.index) { const welded = mergeVertices(g, 1e-4); g.dispose(); g = welded; }
    baked.set(src, g);
  }
  return g;
}
const N3 = new THREE.Matrix3();
export function mergeBaked(items) {
  let nv = 0, ni = 0;
  for (const it of items) { nv += it.geo.attributes.position.count; ni += it.geo.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const { geo, matrix } of items) {
    const p = geo.attributes.position.array, n = geo.attributes.normal.array, ix = geo.index.array, c = geo.attributes.position.count, e = matrix.elements, m = N3.getNormalMatrix(matrix).elements;
    for (let i = 0, o = vo * 3; i < c * 3; i += 3, o += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2], a = n[i], b = n[i + 1], d = n[i + 2];
      pos[o] = e[0] * x + e[4] * y + e[8] * z + e[12]; pos[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; pos[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      const nx = m[0] * a + m[3] * b + m[6] * d, ny = m[1] * a + m[4] * b + m[7] * d, nz = m[2] * a + m[5] * b + m[8] * d, l = Math.hypot(nx, ny, nz) || 1;
      nor[o] = nx / l; nor[o + 1] = ny / l; nor[o + 2] = nz / l;
    }
    uv.set(geo.attributes.uv.array, vo * 2);
    for (let i = 0; i < ix.length; i++) idx[io + i] = ix[i] + vo;
    vo += c; io += ix.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

/* ---------- mesh helpers: every one adds to a group and returns the mesh ---------- */
function place(m, x, y, z, { rx = 0, ry = 0, rz = 0, cast = true, receive = true, s = null } = {}) {
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz, "YXZ"); m.castShadow = cast; m.receiveShadow = receive;
  if (s != null) { if (Array.isArray(s)) m.scale.set(s[0], s[1], s[2]); else m.scale.setScalar(s); }
  return m;
}
export function rbox(g, w, h, d, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(rboxGeo(w, h, d, o.r, o.seg), mat), x, y, z, o); g.add(m); return m; }
export function box(g, w, h, d, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(rboxGeo(w, h, d, 0), mat), x, y, z, o); g.add(m); return m; }
export function ball(g, r, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(sphereGeo(o.seg, o.rings, o.minSeg, o.minRings), mat), x, y, z, { ...o, s: Array.isArray(r) ? r : r }); g.add(m); return m; }
export function tube(g, rt, rb, h, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(cylGeo(rt, rb, h, o.seg, o.open), mat), x, y, z, o); g.add(m); return m; }
export function cone(g, r, h, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(coneGeo(r, h, o.seg), mat), x, y, z, o); g.add(m); return m; }
export function ring(g, R, r, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(torusGeo(R, r, o.tube, o.seg, o.arc), mat), x, y, z, { rx: HPI, ...o }); g.add(m); return m; }
export function disc(g, r, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(discGeo(r, o.seg), mat), x, y, z, { rx: -HPI, cast: false, ...o }); if (o.sx || o.sz) m.scale.set(o.sx || 1, o.sz || 1, 1); g.add(m); return m; }
export function plane(g, w, h, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(planeGeo(w, h), mat), x, y, z, { rx: -HPI, cast: false, ...o }); g.add(m); return m; }
/* a capsule from a to b (posts, rails, branches, pipes) */
export function pill(g, a, b, r, mat, { seg = 10, cap = 4, cast = true, receive = true } = {}) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = Math.max(.001, A.distanceTo(B) - 2 * r);
  const m = new THREE.Mesh(capsuleGeo(r, len, seg, cap), mat);
  m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  m.castShadow = cast; m.receiveShadow = receive; g.add(m); return m;
}
/* a plain cylinder from a to b, for thin bars where capsule ends would not be seen */
export function bar(g, a, b, r, mat, { seg = 8, cast = true } = {}) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const m = new THREE.Mesh(cylGeo(r, r, len, seg), mat);
  m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  m.castShadow = cast; g.add(m); return m;
}
export function instances(g, geo, mat, items, { cast = true, receive = true } = {}) {
  if (!items.length) return null;
  const im = new THREE.InstancedMesh(geo, mat, items.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler();
  items.forEach((it, i) => { P.set(it.p[0], it.p[1], it.p[2]); E.set(it.rx || 0, it.ry || 0, it.rz || 0, "YXZ"); Q.setFromEuler(E); const s = it.s || 1; if (Array.isArray(s)) S.set(s[0], s[1], s[2]); else S.set(s, s, s); M.compose(P, Q, S); im.setMatrixAt(i, M); });
  im.instanceMatrix.needsUpdate = true; im.castShadow = cast; im.receiveShadow = receive; g.add(im); return im;
}

/* A rounded box for a Parts model: built once per size (the constructor was a tenth of every world rebuild),
   welded so it has an index like every other primitive — otherwise one box in a model forced the whole model
   to three loose vertices per triangle — and handed out as a copy, because Parts.add moves its vertices. */
const partBoxes = new Map();
function partBox(w, h, d, seg, r) {
  const key = [w, h, d, seg, r].map((v) => Math.round(v * 1e4)).join("|");
  let g = partBoxes.get(key);
  if (!g) { const raw = new RoundedBoxGeometry(w, h, d, seg, r); g = mergeVertices(raw, 1e-4); raw.dispose(); partBoxes.set(key, g); }
  const out = g.clone(); out.userData = {}; return out;
}
/* ---------- vertex-coloured part builder: merges coloured primitives into one geometry (crops, props) ---------- */
export class Parts {
  constructor() { this.geos = []; this.detail = DETAIL.value; }
  seg(n, min = 5) { return Math.max(min, Math.round(n * this.detail)); }
  add(geo, color, { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, paint = null } = {}) {
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], "YXZ"));
    const S = Array.isArray(scale) ? new THREE.Vector3(...scale) : new THREE.Vector3(scale, scale, scale);
    M.compose(new THREE.Vector3(...pos), Q, S); geo.applyMatrix4(M);
    const n = geo.attributes.position.count, cA = new Float32Array(n * 3), P = geo.attributes.position, c0 = color.isColor ? color : new THREE.Color(color);
    for (let i = 0; i < n; i++) { const c = paint ? paint(P.getX(i), P.getY(i), P.getZ(i), c0) : c0; cA[i * 3] = c.r; cA[i * 3 + 1] = c.g; cA[i * 3 + 2] = c.b; }
    geo.setAttribute("color", new THREE.BufferAttribute(cA, 3)); geo.deleteAttribute("uv");
    this.geos.push(geo); return geo;
  }
  sphere(r, color, o = {}) { return this.add(new THREE.SphereGeometry(1, this.seg(o.seg || 12, 6), this.seg(o.rings || 9, 4)), color, { ...o, scale: Array.isArray(r) ? r : [r, r, r] }); }
  rbox(w, h, d, color, o = {}) { const mn = Math.min(w, h, d); return this.add(partBox(w, h, d, o.seg || 1, Math.min(o.r ?? mn * .3, mn / 2 - .001)), color, o); }
  cyl(rt, rb, h, color, o = {}) { return this.add(new THREE.CylinderGeometry(rt, rb, h, this.seg(o.seg || 10), 1, !!o.open), color, o); }
  cone(r, h, color, o = {}) { return this.add(new THREE.ConeGeometry(r, h, o.seg || 8), color, o); }
  caps(r, len, color, o = {}) { return this.add(new THREE.CapsuleGeometry(r, len, Math.max(2, Math.round((o.cap || 3) * this.detail)), this.seg(o.seg || 9)), color, o); }
  torus(R, r, color, o = {}) { return this.add(new THREE.TorusGeometry(R, r, o.tube || 6, o.seg || 14, o.arc || Math.PI * 2), color, o); }
  /* a tapered limb / stem from a to b */
  stem(a, b, r0, r1, color, o = {}) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B), geo = new THREE.CylinderGeometry(r1, r0, len, this.seg(o.seg || 7, 4), 1);
    const qq = new THREE.Quaternion().setFromUnitVectors(UP, B.clone().sub(A).normalize()), M = new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), qq, new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(M); return this.add(geo, color, { paint: o.paint });
  }
  build() { const g = mergeParts(this.geos); this.geos.forEach((x) => x.dispose()); return g; }
}
export function mergeParts(list) {
  // minimal merge (position / normal / color) so the toy kit does not pull in the whole utils module
  const hasIndex = list.every((g) => g.index), srcs = list.map((g) => (g.index && !hasIndex ? g.toNonIndexed() : g));
  let n = 0; srcs.forEach((g) => { n += g.attributes.position.count; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let off = 0;
  const idx = [];
  srcs.forEach((src) => {
    const p = src.attributes.position, c = src.attributes.color; if (!src.attributes.normal) src.computeVertexNormals();
    const nn = src.attributes.normal;
    pos.set(p.array, off * 3); nor.set(nn.array, off * 3); if (c) col.set(c.array, off * 3); else col.fill(1, off * 3, (off + p.count) * 3);
    if (hasIndex) { const ix = src.index.array; for (let i = 0; i < ix.length; i++) idx.push(ix[i] + off); }
    off += p.count;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  if (hasIndex) geo.setIndex(idx); else geo.computeVertexNormals();
  return geo;
}

/* ---------- small maths ---------- */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerpColor = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
