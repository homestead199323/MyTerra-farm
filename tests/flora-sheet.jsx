/* ═══════════════════════════════════════════
   MODEL SHEET (dev only) — one crop model at a time, at a chosen growth stage and level of detail,
   under the map's light. Driven by a script: window.__flora.render([{ name, stage, tier }]) returns
   a picture and the triangle count for each (`tree: true` for a fruit tree). Used to review the true-to-life models.
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { cropGeometry, treeModel, cropMaterials } from "../src/features/grove/crops3d";
import { PAL, rboxGeo, flat, fillLight } from "../src/features/grove/toy";

const SIZE = Number(new URLSearchParams(location.search).get("size")) || 360, TIME = { value: 0 };
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(SIZE, SIZE); renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1; renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const lin = new THREE.Color(), FILL = fillLight(lin.set(0xffffff).toArray(), lin.set(0xcfdcc0).toArray(), .85, .22);

function shot(obj, frame, el = 26, az = -32) {
  const scene = new THREE.Scene(), hemi = new THREE.HemisphereLight(0xffffff, 0xcfdcc0, 1); hemi.color.setRGB(...FILL.sky); hemi.groundColor.setRGB(...FILL.ground); scene.add(hemi);
  const c = frame.getCenter(new THREE.Vector3()), sz = frame.getSize(new THREE.Vector3()), R = Math.max(sz.x, sz.y, sz.z);
  const sun = new THREE.DirectionalLight(0xfff3e4, 2.1); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 4; sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; sun.shadow.intensity = .62;
  sun.position.copy(c).add(new THREE.Vector3(.55, 1.25, -.35).normalize().multiplyScalar(R * 4)); sun.target.position.copy(c);
  const sc = sun.shadow.camera; sc.left = -R * 1.2; sc.right = R * 1.2; sc.top = R * 1.2; sc.bottom = -R * 1.2; sc.near = .01; sc.far = R * 10;
  scene.add(sun, sun.target, obj);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(R * 6, R * 6), new THREE.ShadowMaterial({ opacity: .16 })); g.rotation.x = -Math.PI / 2; g.position.set(c.x, frame.min.y + .001, c.z); g.receiveShadow = true; scene.add(g);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, R * 20), d = new THREE.Vector3(Math.sin(az * Math.PI / 180) * Math.cos(el * Math.PI / 180), Math.sin(el * Math.PI / 180), Math.cos(az * Math.PI / 180) * Math.cos(el * Math.PI / 180));
  cam.position.copy(c).addScaledVector(d, R * 6); cam.lookAt(c); cam.updateMatrixWorld();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; const v = new THREE.Vector3(), inv = cam.matrixWorldInverse;
  for (let i = 0; i < 8; i++) { v.set(i & 1 ? frame.max.x : frame.min.x, i & 2 ? frame.max.y : frame.min.y, i & 4 ? frame.max.z : frame.min.z).applyMatrix4(inv); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
  const half = Math.max(x1 - x0, y1 - y0) / 2 * 1.12, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, shift = (y1 - y0) / 2 * 1.12 - half;
  cam.left = mx - half; cam.right = mx + half; cam.top = my + half + shift; cam.bottom = my - half + shift; cam.updateProjectionMatrix();
  renderer.shadowMap.needsUpdate = true; renderer.render(scene, cam);
  return renderer.domElement.toDataURL("image/png");
}
function plant(name, stage, tier, tree) {
  const geo = tree ? treeModel(name, stage, tier) : cropGeometry(name, stage, tier), M = cropMaterials(TIME), im = new THREE.InstancedMesh(geo, geo.groups.length ? [M.mat, M.thin] : M.mat, 1), g = new THREE.Group();
  im.setMatrixAt(0, new THREE.Matrix4().makeRotationY(.6)); im.castShadow = im.receiveShadow = true; im.frustumCulled = false;
  const soil = new THREE.Mesh(rboxGeo(.7, .1, .7, .05, 2), flat(PAL.soil)); soil.position.y = -.05; soil.receiveShadow = soil.castShadow = true; g.add(im); if (!tree) g.add(soil);
  geo.computeBoundingBox(); return { g, box: geo.boundingBox, tris: geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3 };
}
/* every stage of one crop shares the grown plant's frame, so it visibly grows */
function render(list) {
  const frames = new Map();
  return list.map(({ name, stage, tier = 0, tree = false }) => {
    if (!frames.has(name)) { const b = plant(name, 5, 0, tree).box.clone(); b.union(new THREE.Box3(new THREE.Vector3(-.4, -.1, -.4), new THREE.Vector3(.4, .2, .4))); frames.set(name, b); }
    const p = plant(name, stage, tier, tree); return { name, stage, tier, tris: Math.round(p.tris), url: shot(p.g, frames.get(name)) };
  });
}
window.__flora = { render };
document.title = "flora ready";
