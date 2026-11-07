/* ═══════════════════════════════════════════
   ICON RENDERER (dev only) — renders the app's small pictures from the 3D map's own models, so
   every crop, animal and area icon matches the map exactly. Driven by scripts/render-icons.mjs,
   which saves the results to src/assets/toy/. Same toy light as the map (docs/MAP_STYLE.md).
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FAMILIES, cropSlug, TREE_KEYS } from "../src/features/grove/crop-families";
import { buildCrops } from "../src/features/grove/crops3d";
import { buildHerd } from "../src/features/grove/animals3d";
import { buildZoneIcon, buildTreeIcon } from "../src/features/grove/Grove3D";
import { PAL, rboxGeo, flat } from "../src/features/grove/toy";
import { CROP_MAP } from "../src/data/crops";
import { fixture } from "./fixture";

const SIZE = 192, TIME = { value: 0 };
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(SIZE, SIZE); renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer), env = pmrem.fromScene(new RoomEnvironment(), .04).texture;

/* a scene with the map's light: white sky + pale green bounce, one warm sun high in the afternoon */
function stage(obj, { el = 26, az = -32, ground = true, pad = .08, frame = null } = {}) {
  const scene = new THREE.Scene(); scene.environment = env; scene.environmentIntensity = .22;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfdcc0, .85));
  const box = frame || new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()), R = Math.max(sz.x, sz.y, sz.z);
  const sun = new THREE.DirectionalLight(0xfff3e4, 2.1); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 4; sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; sun.shadow.intensity = .62;
  sun.position.copy(c).add(new THREE.Vector3(.55, 1.25, -.35).normalize().multiplyScalar(R * 4)); sun.target.position.copy(c);
  const sc = sun.shadow.camera; sc.left = -R * 1.2; sc.right = R * 1.2; sc.top = R * 1.2; sc.bottom = -R * 1.2; sc.near = .01; sc.far = R * 10;
  scene.add(sun, sun.target, obj);
  if (ground) { const g = new THREE.Mesh(new THREE.PlaneGeometry(R * 6, R * 6), new THREE.ShadowMaterial({ opacity: .16 })); g.rotation.x = -Math.PI / 2; g.position.set(c.x, box.min.y + .001, c.z); g.receiveShadow = true; scene.add(g); }
  // orthographic camera looking down at `el`, fitted to the frame box with padding
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, R * 20), d = new THREE.Vector3(Math.sin(az * Math.PI / 180) * Math.cos(el * Math.PI / 180), Math.sin(el * Math.PI / 180), Math.cos(az * Math.PI / 180) * Math.cos(el * Math.PI / 180));
  cam.position.copy(c).addScaledVector(d, R * 6); cam.lookAt(c); cam.updateMatrixWorld();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; const v = new THREE.Vector3(), inv = cam.matrixWorldInverse;
  for (let i = 0; i < 8; i++) { v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(inv); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
  const half = Math.max(x1 - x0, y1 - y0) / 2 * (1 + pad * 2), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  // bottom-anchored: the object's base sits near the bottom of the square, like the old portraits
  const shift = (y1 - y0) / 2 * (1 + pad * 2) - half;
  cam.left = mx - half; cam.right = mx + half; cam.top = my + half + shift; cam.bottom = my - half + shift; cam.updateProjectionMatrix();
  renderer.shadowMap.needsUpdate = true; renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL("image/png");
  return url;
}

/* a crop on a small rounded soil mound; every stage of one crop uses the same frame so it visibly grows */
const K = { 2: .5, 3: .72, 4: 1, 5: 1 }; // young stages framed tighter; the soil board shrinks with the frame so it reads the same size
const boardOf = new Map(); // soil board sized to the grown plant's spread, so low crops fill the icon too
function cropGroup(name, st) {
  if (!boardOf.has(name)) { const t = new THREE.Group(); buildCrops(t, [{ name, stage: 5, x: 0, y: 0, z: 0, s: 1, ry: .6 }], TIME); const sz = new THREE.Box3().setFromObject(t).getSize(new THREE.Vector3()); boardOf.set(name, Math.min(.86, Math.max(.42, Math.max(sz.x, sz.z) * 1.12))); }
  const g = new THREE.Group(), k = K[st], bw = boardOf.get(name);
  buildCrops(g, [{ name, stage: st, x: 0, y: .05 * k, z: 0, s: 1, ry: .6 }], TIME);
  const soil = new THREE.Mesh(rboxGeo(bw * k, .1 * k, bw * k, .05 * k, 2), flat(PAL.soil)); soil.position.y = 0; soil.receiveShadow = true; soil.castShadow = true; g.add(soil);
  return g;
}
function tile(w, d) { // a rounded diorama tile in the meadow colour under an area icon
  const m = new THREE.Mesh(rboxGeo(w, .3, d, .14, 2), flat(PAL.meadow)); m.position.y = -.16; m.receiveShadow = true; return m;
}
const cropMap = new Map(CROP_MAP);
const plot = (crop, zone, rows, count, stage = 4) => ({ id: zone.id + crop, zone: zone.id, crop, status: "planted", plantDate: "2026-04-01", observedStage: stage, plantCount: count, layout: { startRow: 1, rowCount: rows, pattern: "rows", lengthM: zone.wM } });
const Z = (id, type, w, h, extra = {}) => ({ id, type, name: id, xM: 0, yM: 0, wM: w, hM: h, rowCount: 4, ...extra });
const ZONES = [
  [Z("house", "house", 7, 5.5), [], []], [Z("barn", "barn", 8, 6), [], [["Cow", 1], ["Chicken", 3]]], [Z("coop", "coop", 5, 4), [], [["Chicken", 5]]],
  [Z("storage", "storage", 3.2, 2.6), [], []], [Z("yard", "yard", 6, 3.2), [], []], [Z("greenhouse", "greenhouse", 4, 6), [], []], [Z("beehive", "beehive", 3.2, 2), [], []],
  [Z("compost", "compost", 3.3, 2), [], []], [Z("nursery", "nursery", 4.5, 3.2), [], []], [Z("water", "water", 4.5, 3.4, { shape: "oval" }), [], []],
  [Z("pasture", "pasture", 7, 5.5), [], [["Sheep", 3]]], [Z("orchard", "orchard", 6.5, 5.5), [["Apple", 3, 6, 5]], []],
  [Z("veg", "veg", 4.5, 3.4), [["Carrot", 4, 40]], []], [Z("raised", "raised", 3.2, 1.4, { rowCount: 2 }), [["Lettuce", 2, 10]], []],
  [Z("herbs", "herbs", 3.2, 1.4, { rowCount: 2 }), [["Basil", 2, 10]], []], [Z("container", "container", 2.4, 1.8, { rowCount: 2 }), [["Tomato", 2, 4]], []],
];
const ANIMALS = ["Chicken", "Goat", "Sheep", "Cow", "Pig", "Rabbit", "Duck", "Turkey", "Goose", "Quail", "Guinea Fowl", "Donkey", "Horse", "Alpaca"];

export const jobs = [];
// crops: one representative name per family entry, plus the default leafy greens
FAMILIES.forEach(([re]) => { const name = re.source.split("|")[0]; jobs.push({ kind: "crop", name, slug: cropSlug(name) }); });
jobs.push({ kind: "crop", name: "Greens", slug: "greens" });
TREE_KEYS.forEach((k) => jobs.push({ kind: "tree", name: k, slug: k }));
ANIMALS.forEach((a) => jobs.push({ kind: "animal", name: a, slug: a.toLowerCase().replace(/ /g, "-") }));
ZONES.forEach(([z]) => jobs.push({ kind: "zone", name: z.type, slug: z.type }));
jobs.push({ kind: "early", name: "planned", slug: "planned" }, { kind: "early", name: "sown", slug: "sown" });

/* returns [{ file, url }] for one job */
export function render(job) {
  if (job.kind === "crop" || job.kind === "tree") {
    const make = (st) => (job.kind === "crop" ? cropGroup(job.name, st) : buildTreeIcon({ name: job.name, stage: st }));
    const big = make(5), frame = new THREE.Box3().setFromObject(big); frame.expandByPoint(new THREE.Vector3(0, 0, 0));
    if (job.kind === "crop") frame.union(new THREE.Box3(new THREE.Vector3(-.43, -.05, -.43), new THREE.Vector3(.43, .05, .43)));
    // young stages are framed tighter (not to true scale) so a seedling still reads at list size, yet visibly smaller
    const fr = (st) => { const b = frame.clone(), c = b.getCenter(new THREE.Vector3()), k = K[st]; b.min.x = c.x + (b.min.x - c.x) * k; b.max.x = c.x + (b.max.x - c.x) * k; b.min.z = c.z + (b.min.z - c.z) * k; b.max.z = c.z + (b.max.z - c.z) * k; b.max.y = b.min.y + (b.max.y - b.min.y) * k; return b; };
    return [2, 3, 4, 5].map((st) => ({ file: `${job.kind}-${job.slug}-${st}.webp`, url: stage(st === 5 ? big : make(st), { frame: fr(st), el: job.kind === "tree" ? 22 : 28 }) }));
  }
  if (job.kind === "early") { // stage 0 (planned): bare soil and a row marker; stage 1 (sown): a sprout — same board size as a young crop icon
    const g = new THREE.Group(), k = .5;
    const soil = new THREE.Mesh(rboxGeo(.86 * k, .1 * k, .86 * k, .05 * k, 2), flat(PAL.soil)); soil.receiveShadow = soil.castShadow = true; g.add(soil);
    if (job.slug === "sown") buildCrops(g, [{ name: "Lettuce", stage: 1, x: 0, y: .05 * k, z: 0, s: 1.15, ry: .6 }], TIME);
    else { const pole = new THREE.Mesh(rboxGeo(.025, .32, .025, .008, 1), flat(PAL.tagPole)); pole.position.set(-.12, .2, .08); const tag = new THREE.Mesh(rboxGeo(.13, .08, .02, .01, 1), flat(0xc3cbc4)); tag.position.set(-.12, .34, .09); [pole, tag].forEach((m) => { m.castShadow = true; g.add(m); }); }
    const frame = new THREE.Box3(new THREE.Vector3(-.43 * k * 1.7, -.025, -.43 * k * 1.7), new THREE.Vector3(.43 * k * 1.7, .5, .43 * k * 1.7));
    return [{ file: `crop-${job.slug}.webp`, url: stage(g, { frame, el: 28 }) }];
  }
  if (job.kind === "animal") {
    const { mesh: herd } = buildHerd([{ type: job.name, x: 0, z: 0, heading: 0, arena: null, seed: 3, variant: 0 }], TIME);
    const q = herd.geometry.attributes.g3q; for (let i = 0; i < q.count; i++) q.setZ(i, 0); // no grazing: head up, standing
    const g = new THREE.Group(); g.add(herd); herd.geometry.computeBoundingBox();
    const frame = herd.geometry.boundingBox.clone();
    return [{ file: `animal-${job.slug}.webp`, url: stage(g, { frame, el: 18, az: -62 }) }];
  }
  const [z, crops, animals] = ZONES.find(([q]) => q.type === job.name);
  const data = { ...fixture, zones: [z], garden: { plots: crops.map(([c, rows, n, st]) => plot(c, z, rows, n, st ?? 4)) }, livestock: { animals: animals.map(([type, count], i) => ({ id: "a" + i, type, zone: z.id, count })) }, ornaments: [], mapLines: [] };
  const g = buildZoneIcon({ zone: z, data, crops: cropMap, todayKey: "2026-07-01" });
  const frame = new THREE.Box3().setFromObject(g);
  g.add(tile(z.wM + 1.2, z.hM + 1.2)); g.children[g.children.length - 1].position.set(z.wM / 2, -.16, z.hM / 2);
  frame.union(new THREE.Box3(new THREE.Vector3(-.6, -.31, -.6), new THREE.Vector3(z.wM + .6, 0, z.hM + .6)));
  return [{ file: `zone-${job.slug}.webp`, url: stage(g, { frame, el: 38, az: -28, ground: false, pad: .04 }) }];
}
window.__icons = { jobs, render };
document.title = "icons ready";
// A visible export control also supports browser-driven asset regeneration.
const exportButton = document.createElement("button");
exportButton.textContent = "Render updated crop and area pictures";
document.body.appendChild(exportButton);
exportButton.addEventListener("click", async () => {
  exportButton.disabled = true;
  const selected = jobs.filter((j) => j.kind === "zone" || (j.kind === "crop" && /^(tomato|lettuce|carrot|parsnip|beet|radish|turnip|fennel|strawberry)$/.test(j.name)));
  const files = [];
  for (const job of selected) { files.push(...render(job)); await new Promise((resolve) => requestAnimationFrame(resolve)); }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([JSON.stringify(files)], { type: "application/json" }));
  link.download = "myterra-model-pictures.json"; link.textContent = `Download ${files.length} updated pictures`;
  document.body.appendChild(link); exportButton.textContent = "Pictures ready";
});
