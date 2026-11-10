/* ═══════════════════════════════════════════
   PLANT KIT — the pieces true-to-life plant models are built from (docs/MAP_STYLE.md §9, "look C").
   Leaf blades with veins, lathed fruit, bark, and the per-pixel surface detail that goes with them.
   Every vertex carries g3s = (kind, gloss, u, v):
     kind 0 plain · 1 leaf (veins, light through the blade) · 2 bark · 3 fruit skin
   Colour stays in the vertices; there are still no image textures.
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { Parts } from "./toy";

export const SURF = { plain: 0, leaf: 1, bark: 2, fruit: 3 };
const C = (h) => (h && h.isColor ? h.clone() : new THREE.Color(h));
const xform = (pos, rot, scale = 1) => new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], "YXZ")), new THREE.Vector3(scale, scale, scale));
export function rng(seed) { let t = (Math.floor(seed * 1000003) ^ 0x5bd1e995) >>> 0; return () => { t = (t + 0x6d2b79f5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- surface detail: patched into a MeshPhongMaterial ---------- */
const NOISE = `
float g3h(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float g3n(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(g3h(i), g3h(i + vec3(1,0,0)), f.x), mix(g3h(i + vec3(0,1,0)), g3h(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(g3h(i + vec3(0,0,1)), g3h(i + vec3(1,0,1)), f.x), mix(g3h(i + vec3(0,1,1)), g3h(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
/* `vertexExtra` runs after the vertex position is known (the crop wind lives there) */
export function surfaceShader(sh, { vertexHead = "", vertexExtra = "" } = {}) {
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nattribute vec4 g3s; varying vec4 vS; varying vec3 vObj;\n" + vertexHead)
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvS = g3s; vObj = position;\n" + vertexExtra);
  sh.fragmentShader = sh.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying vec4 vS; varying vec3 vObj;" + NOISE)
    .replace("#include <color_fragment>", `#include <color_fragment>
{ float kind = vS.x; vec3 p = vObj;
  if (kind > .5 && kind < 1.5) { // leaf: midrib, side veins, mottled blade
    float u = vS.z, v = vS.w, f = fract(v * 7. - abs(u) * 1.25), d = min(f, 1. - f);
    float vein = max(1. - smoothstep(.0, .1, abs(u)), (1. - smoothstep(.0, .08, d)) * .5 * smoothstep(.02, .2, abs(u)));
    diffuseColor.rgb *= .88 + .24 * g3n(p * 26.);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.45 + vec3(.012, .02, .0), vein * .7);
  } else if (kind > 1.5 && kind < 2.5) { // bark: ridges along the limb, grey lichen
    float w = g3n(vec3(vS.z * 30., vS.w * 2.5, 3.)), r = g3n(vec3(vS.z * 46. + w * 3., vS.w * 5., 9.));
    diffuseColor.rgb *= mix(.5, 1.2, smoothstep(.3, .7, r));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.19, .21, .15), smoothstep(.62, .8, g3n(p * 3.3)) * .45);
  } else if (kind > 2.5) { // fruit skin: soft mottling and pale pores
    diffuseColor.rgb *= .9 + .2 * g3n(p * 34.);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.5 + .03, step(.9, g3n(p * 170.)) * .45);
  }
}`)
    .replace("#include <specularmap_fragment>", "#include <specularmap_fragment>\nspecularStrength *= vS.y;")
    .replace("#include <lights_phong_fragment>", "#include <lights_phong_fragment>\nmaterial.specularShininess = mix(8., 120., vS.y);")
    .replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0
if (vS.x > .5 && vS.x < 1.5) { float g3back = max(dot(-normal, directionalLights[0].direction), 0.); reflectedLight.directDiffuse += g3back * directionalLights[0].color * diffuseColor.rgb * vec3(1.1, 1.25, .5) * .24; }
#endif`);
}
/* Two materials for one model: solid parts (stems, fruit) are drawn front faces only, leaf blades from both sides.
   Drawing everything double-sided cost about a quarter more per frame for nothing. PlantKit.build() puts the
   solid parts in group 0 and the blades in group 1, so a mesh takes [solid, thin] as its material. */
export function plantMaterials(extra) {
  const make = (side) => { const m = new THREE.MeshPhongMaterial({ vertexColors: true, side, shininess: 40, specular: 0x6a6a6a }); m.onBeforeCompile = (sh) => surfaceShader(sh, extra); m.customProgramCacheKey = () => "g3plant-v1" + (extra?.key || ""); return m; };
  return { solid: make(THREE.FrontSide), thin: make(THREE.DoubleSide) };
}

/* ---------- the kit ---------- */
export class PlantKit extends Parts {
  constructor(q = 1) {
    super(); this.q = q; this.lite = q < .2; this.detail = q >= .9 ? 1 : q >= .45 ? .75 : q >= .2 ? .55 : .42; this.surf = [SURF.plain, .08]; this.vs = 1;
    this.big = q >= .9 ? 1 : q >= .45 ? 1.3 : q >= .2 ? 1.7 : 2.3; // a lighter model carries fewer, larger leaves: the plant keeps its volume
  }
  /* a count that thins out with the level of detail */
  n(count, min = 1) { return Math.max(min, Math.round(count * this.q)); }
  add(geo, color, o = {}) {
    const uv = geo.attributes.uv ? Float32Array.from(geo.attributes.uv.array) : null, n = geo.attributes.position.count;
    super.add(geo, color, o);
    const [kind, gloss] = o.surf || this.surf, S = new Float32Array(n * 4), bark = kind === SURF.bark && uv, vs = o.vs || this.vs;
    for (let i = 0; i < n; i++) { S[i * 4] = kind; S[i * 4 + 1] = gloss; if (bark) { S[i * 4 + 2] = uv[i * 2]; S[i * 4 + 3] = uv[i * 2 + 1] * vs; } }
    geo.setAttribute("g3s", new THREE.BufferAttribute(S, 4)); return geo;
  }
  stem(a, b, r0, r1, color, o = {}) { const keep = [this.vs, this.surf]; this.vs = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (o.surf) this.surf = o.surf; const g = super.stem(a, b, r0, r1, color, o); this.vs = keep[0]; this.surf = keep[1]; return g; }
  /* A leaf blade along +z: pointed, folded along the midrib, arching over; one surface, drawn double-sided.
     `wide` is where along its length it is widest, `blunt` below .8 rounds the outline, `wave` ruffles the edge, `rib` + `ribW` give a coloured midrib strip. */
  blade(L, W, color, { pos = [0, 0, 0], rot = [0, 0, 0], fold = .2, cup = 0, droop = .3, rise = .1, rows = 5, cols = 3, wide = .4, tip = null, rib = null, ribW = 0, wave = 0, waveN = 3, blunt = .8, fixL = false, grow = true, surf = [SURF.leaf, .32] } = {}) {
    if (grow) { W *= this.big; if (!fixL) L *= Math.sqrt(this.big); }
    const lite = this.q < .45; rows = Math.max(2, Math.round(rows * (this.q >= .9 ? 1 : lite ? .45 : .7)));
    const c0 = C(color), ct = tip != null ? C(tip) : c0.clone().lerp(new THREE.Color(0xa8d86a), .12), cr = rib != null ? C(rib) : null, a = Math.log(.5) / Math.log(wide);
    // columns across the blade: edge … midrib … edge; a broad leaf gets two more for a smooth cup, a coloured rib its own narrow strip
    const strip = cr && ribW > 0 && !lite, U = [-1, 0, 1]; if (cols >= 5 && !lite) U.push(-.5, .5); if (strip) U.push(-ribW, ribW, -ribW * 1.7, ribW * 1.7); U.sort((x, y) => x - y);
    const nc = U.length, P = [], Cc = [], S = [], I = [];
    for (let r = 0; r <= rows; r++) {
      const t = r / rows, w = (W / 2) * Math.pow(Math.sin(Math.PI * Math.pow(t, a)), blunt), y = L * (rise * t - droop * t * t), z = L * t, e = c0.clone().lerp(ct, t * .7), taper = 1 - t * .7;
      for (let k = 0; k < nc; k++) {
        const u = U[k], au = Math.abs(u), x = strip && au > 0 && au < .5 ? Math.sign(u) * Math.min(w, au * W * .5 * taper) : u * w, f = w > 1e-6 ? Math.abs(x) / w : 0;
        const lift = fold * Math.abs(x) + cup * f * f * w + (au === 1 ? Math.sign(u) * wave * w * Math.sin(t * Math.PI * waveN) : 0);
        P.push(x, y + lift, z); const c = cr && (strip ? au <= ribW : false) ? cr : cr && u === 0 ? e.clone().lerp(cr, lite ? .2 : .6) : e; Cc.push(c.r, c.g, c.b); S.push(surf[0], surf[1], w > 1e-6 ? Math.sign(x) * f : u, t);
      }
      if (r < rows) for (let k = 0; k < nc - 1; k++) { const o = r * nc + k; I.push(o, o + 1, o + nc, o + 1, o + nc + 1, o + nc); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(Cc, 3)); g.setAttribute("g3s", new THREE.Float32BufferAttribute(S, 4)); g.setIndex(I);
    g.computeVertexNormals(); g.applyMatrix4(xform(pos, rot)); g.userData.thin = true; this.geos.push(g); return g;
  }
  /* a surface of revolution from a smoothed profile [[radius, y], …], optionally lobed (peppers, pumpkins) */
  lathe(profile, color, { rings = 12, seg = 12, lobes = 0, amp = 0, lobeAt = () => 1, ...rest } = {}) {
    rings = this.seg(rings, 5); seg = this.seg(seg, 6);
    const pts = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(rings), P = [], I = [], R = pts.length;
    for (let i = 0; i < R; i++) for (let j = 0; j < seg; j++) { const th = (j / seg) * Math.PI * 2, k = 1 + amp * Math.cos(lobes * th) * lobeAt(i / (R - 1)), rr = Math.max(.0005, pts[i].x) * k; P.push(Math.cos(th) * rr, pts[i].y, Math.sin(th) * rr); }
    for (let i = 0; i < R - 1; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg; I.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
    const mid = Math.floor(R / 2) * seg; // face outward whichever way the profile runs
    if (g.attributes.normal.getX(mid) * g.attributes.position.getX(mid) < 0) { for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; } g.setIndex(I); g.computeVertexNormals(); }
    return this.add(g, color, rest);
  }
  /* indexed merge of position, normal, colour and surface: solid parts first (group 0), then the leaf blades (group 1) */
  build() {
    this.geos.sort((a, b) => (a.userData.thin ? 1 : 0) - (b.userData.thin ? 1 : 0));
    let n = 0, m = 0, solid = 0; this.geos.forEach((g) => { if (!g.userData.thin) solid += g.index.count; });
    this.geos.forEach((g) => { n += g.attributes.position.count; m += g.index.count; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), sur = new Float32Array(n * 4), idx = n > 65535 ? new Uint32Array(m) : new Uint16Array(m); let o = 0, k = 0;
    this.geos.forEach((g) => {
      if (!g.attributes.normal) g.computeVertexNormals();
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); sur.set(g.attributes.g3s.array, o * 4);
      const ix = g.index.array; for (let i = 0; i < ix.length; i++) idx[k++] = ix[i] + o; o += g.attributes.position.count; g.dispose();
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.setAttribute("g3s", new THREE.BufferAttribute(sur, 4)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
    if (solid) geo.addGroup(0, solid, 0); if (m > solid) geo.addGroup(solid, m - solid, 1);
    return geo;
  }
}
/* shade baked into the colours: fn(x, y, z, nx, ny, nz) → 0…1 (leaves near the stem, the underside of things) */
export function bakeShade(geo, fn) {
  const p = geo.attributes.position, nn = geo.attributes.normal, c = geo.attributes.color;
  for (let i = 0; i < p.count; i++) { const k = fn(p.getX(i), p.getY(i), p.getZ(i), nn.getX(i), nn.getY(i), nn.getZ(i)); c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k); }
  return geo;
}
/* older models built with the plain Parts kit join the same material: plain surface, no gloss */
export function plainSurface(geo) { if (!geo.attributes.g3s) geo.setAttribute("g3s", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 4), 4)); return geo; }
