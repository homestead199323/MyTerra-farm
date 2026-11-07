/* ═══════════════════════════════════════════
   TOY KIT — the shared vocabulary of the rounded "toy farm" look of the 3D map.
   Every box is a rounded box, every post a capsule, every rim a torus; every
   surface is one flat matte colour from the palette below (no textures); the
   whole scene is lit bright and soft. The style rules live in docs/MAP_STYLE.md.
   MARKER: GROVE_TOY_KIT_V1
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { TOY, STAGE_HEX } from "./palette";

export const HPI = Math.PI / 2;
/* NIGHT (0..1) — set by Grove3D's sky; window glass and lamps glow warm as it rises */
export const NIGHT = { value: 0 };
/* WIND — (dirX, dirZ, strength 0..1): where the air moves toward in scene space; set by Grove3D's sky */
export const WIND = { value: new THREE.Vector3(.72, -.69, .15) };
export function nightGlow(mat) {
  if (mat.userData.nightGlow) return mat; mat.userData.nightGlow = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uNight = NIGHT;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uNight;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uNight * vec3(1., .82, .48) * .55;");
  };
  mat.customProgramCacheKey = () => "g3night";
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
    const Mat = physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    m = new Mat({ color, roughness: rough, metalness: metal, side, transparent, opacity, emissive, emissiveIntensity: ei, vertexColors, depthWrite, envMapIntensity: env });
    if (transparent) m.forceSinglePass = true;
    mats.set(key, m);
  }
  return m;
}
/* layered flat planes (paths, patches) sit on the ground with a polygon offset so they never z-fight */
export function layered(mat, n) { mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -n; return mat; }

/* ---------- geometry cache: dimensions are quantised to 5 mm so repeated parts share one buffer ---------- */
const geos = new Map();
const q = (v) => Math.round(v * 200) / 200;
function cached(key, make) { let g = geos.get(key); if (!g) { g = make(); g.userData.shared = true; geos.set(key, g); } return g; } // shared: survives world rebuilds (see disposeWorld)
export function rboxGeo(w, h, d, r, seg) {
  const mn = Math.min(w, h, d);
  const rr = Math.min(r ?? Math.min(mn * .24, .32), mn / 2 - .001), s = seg ?? (mn >= .28 ? 2 : 1);
  if (rr <= .004) return cached(`b|${q(w)}|${q(h)}|${q(d)}`, () => new THREE.BoxGeometry(w, h, d));
  return cached(`rb|${q(w)}|${q(h)}|${q(d)}|${q(rr)}|${s}`, () => new RoundedBoxGeometry(w, h, d, s, rr));
}
export function sphereGeo(seg = 14, rings = 10) { return cached(`s|${seg}|${rings}`, () => new THREE.SphereGeometry(1, seg, rings)); }
export function capsuleGeo(r, len, seg = 10, cap = 4) { return cached(`c|${q(r)}|${q(len)}|${seg}|${cap}`, () => new THREE.CapsuleGeometry(r, len, cap, seg)); }
export function cylGeo(rt, rb, h, seg = 16, open = false) { return cached(`y|${q(rt)}|${q(rb)}|${q(h)}|${seg}|${open ? 1 : 0}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)); }
export function torusGeo(R, r, tube = 8, seg = 20, arc = Math.PI * 2) { return cached(`t|${q(R)}|${q(r)}|${tube}|${seg}|${arc.toFixed(2)}`, () => new THREE.TorusGeometry(R, r, tube, seg, arc)); }
export function coneGeo(r, h, seg = 12) { return cached(`k|${q(r)}|${q(h)}|${seg}`, () => new THREE.ConeGeometry(r, h, seg)); }
export function discGeo(r, seg = 24) { return cached(`d|${q(r)}|${seg}`, () => new THREE.CircleGeometry(r, seg)); }
export function planeGeo(w, h) { return cached(`p|${q(w)}|${q(h)}`, () => new THREE.PlaneGeometry(w, h)); }

/* ---------- mesh helpers: every one adds to a group and returns the mesh ---------- */
function place(m, x, y, z, { rx = 0, ry = 0, rz = 0, cast = true, receive = true, s = null } = {}) {
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz, "YXZ"); m.castShadow = cast; m.receiveShadow = receive;
  if (s != null) { if (Array.isArray(s)) m.scale.set(s[0], s[1], s[2]); else m.scale.setScalar(s); }
  return m;
}
export function rbox(g, w, h, d, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(rboxGeo(w, h, d, o.r, o.seg), mat), x, y, z, o); g.add(m); return m; }
export function box(g, w, h, d, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(rboxGeo(w, h, d, 0), mat), x, y, z, o); g.add(m); return m; }
export function ball(g, r, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(sphereGeo(o.seg, o.rings), mat), x, y, z, { ...o, s: Array.isArray(r) ? r : r }); g.add(m); return m; }
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

/* ---------- vertex-coloured part builder: merges coloured primitives into one geometry (crops, props) ---------- */
export class Parts {
  constructor() { this.geos = []; this.detail = 1; }
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
  rbox(w, h, d, color, o = {}) { const mn = Math.min(w, h, d); return this.add(new RoundedBoxGeometry(w, h, d, o.seg || 1, Math.min(o.r ?? mn * .3, mn / 2 - .001)), color, o); }
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
