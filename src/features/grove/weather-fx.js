/* ═══════════════════════════════════════════
   WEATHER FX — toy clouds, rain and snow for the 3D map (docs/MAP_STYLE.md §4b,
   spec §2). Clouds: one merged mesh of rounded white blobs drifting downwind and
   wrapping round the farm, no shadows (nothing darkens the ground). Rain/snow: one
   InstancedMesh animated in the vertex shader (anim 6 / 7 of the motion material),
   falling through a box that follows the camera target. The pure counts live in sky.js.
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { WIND } from "./toy";
import { precipCount, cloudCount } from "./sky";

export { precipCount, cloudCount };

/* uniforms shared by every weather effect */
export const WX = {
  center: { value: new THREE.Vector3() }, // the camera target: rain and snow fall round it
  drift: { value: 0 }, // metres the clouds have travelled downwind
  ripple: { value: 1 }, // pond ripple amplitude: 1 calm, 3 under rain
};
export const RAIN_SPAN = 14; // metres: particles fall from this height to the ground
export const RAIN_RADIUS = 16; // metres: half-width of the box they fall through

const mulberry = (seed) => { let t = (Math.floor(seed * 1000003) ^ 0x5bd1e995) >>> 0; return () => { t = (t + 0x6d2b79f5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };

/** rain (capsules) or snow (spheres) as one instanced mesh in the motion material; null for a count of 0 */
export function buildPrecip(kind, count, mat) {
  if (!count) return null;
  const geo = kind === "rain" ? new THREE.CapsuleGeometry(.04, .55, 2, 6) : new THREE.SphereGeometry(.08, 7, 5);
  const im = new THREE.InstancedMesh(geo, mat, count), M4 = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1);
  const an = new Float32Array(count), ph = new Float32Array(count), r = mulberry(kind === "rain" ? 6 : 7);
  for (let i = 0; i < count; i++) { P.set((r() * 2 - 1) * RAIN_RADIUS, 0, (r() * 2 - 1) * RAIN_RADIUS); M4.compose(P, Q, S); im.setMatrixAt(i, M4); an[i] = kind === "rain" ? 6 : 7; ph[i] = r(); }
  geo.setAttribute("g3anim", new THREE.InstancedBufferAttribute(an, 1)); geo.setAttribute("g3phase", new THREE.InstancedBufferAttribute(ph, 1));
  im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.name = kind === "rain" ? "g3rain" : "g3snow";
  return im;
}

/* clouds: each is 4–6 overlapping spheres; every vertex carries its cloud's centre (g3c) so the whole cloud
   wraps together as it drifts downwind */
export function cloudMaterial(radius, color = 0xf6f5f1) {
  const m = new THREE.MeshLambertMaterial({ color });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uWind: WIND, uDrift: WX.drift, uRadius: { value: radius } });
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uWind; uniform float uDrift; uniform float uRadius; attribute vec2 g3c;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
{ vec2 dir = normalize(uWind.xy + vec2(1e-4, 0.)); float s = dot(g3c, dir) + uDrift; float w = mod(s + uRadius, 2. * uRadius) - uRadius; transformed.xz += dir * (w - dot(g3c, dir)); }`);
  };
  m.customProgramCacheKey = () => "g3cloud";
  return m;
}
export function buildClouds(fW, fH, count, radius) {
  if (!count) return null;
  const r = mulberry(11), geos = [], R = radius, mat = cloudMaterial(R);
  for (let c = 0; c < count; c++) {
    const cx = (r() * 2 - 1) * R * .9, cz = (r() * 2 - 1) * R * .6, y = 16 + r() * 4, n = 4 + Math.floor(r() * 3), base = 1.2 + r() * 1.2;
    for (let i = 0; i < n; i++) {
      const g = new THREE.SphereGeometry(base * (.6 + r() * .6), 14, 10);
      g.scale(1, .62, 1); g.translate(cx + (i - (n - 1) / 2) * base * .9, y + (r() - .5) * base * .3, cz + (r() - .5) * base * .7);
      const cc = new Float32Array(g.attributes.position.count * 2); for (let k = 0; k < cc.length; k += 2) { cc[k] = cx; cc[k + 1] = cz; }
      g.setAttribute("g3c", new THREE.BufferAttribute(cc, 2)); geos.push(g);
    }
  }
  const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(merged, mat); mesh.position.set(fW / 2, 0, fH / 2); mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false; mesh.name = "g3clouds";
  return mesh;
}
