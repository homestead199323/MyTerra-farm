/* Build mode on the home map: place, move, resize, turn and remove areas by dragging.
   Pure: no DOM, no three.js. The map engine supplies ground points; this decides where things land. */
import { ZT_MAP } from "../../data/zones.js";
import { snapZone, defaultGrid } from "../grove/path-draw.js";

const TRAY = {
  farm: ["veg", "raised", "greenhouse", "orchard", "herbs", "coop", "barn", "pasture", "beehive", "water", "compost", "nursery", "storage", "house", "yard"],
  backyard: ["raised", "veg", "herbs", "greenhouse", "container", "coop", "beehive", "compost", "water", "nursery", "storage"],
  balcony: ["container", "raised", "herbs", "nursery"],
};
/* A sensible first size in metres (width × depth); the player resizes from there. */
const SIZE = {
  veg: [4, 2], raised: [2.4, 1.2], herbs: [2, 1], greenhouse: [4, 3], orchard: [8, 6], coop: [3, 2], barn: [8, 6], pasture: [12, 10],
  beehive: [1, 1], water: [3, 2], compost: [1.5, 1.5], nursery: [2, 1], storage: [3, 3], house: [10, 8], yard: [6, 5], container: [1.2, 0.4],
};
const r1 = (n) => Math.round(n * 10) / 10;

/** The pieces the tray offers for this kind of space. → [{ id, label, icon }] */
export function buildTypes(env) {
  return (TRAY[env] || TRAY.farm).map((id) => ZT_MAP.get(id)).filter(Boolean).map((t) => ({ id: t.id, label: t.label, icon: t.icon }));
}

export const buildGrid = (farmW, farmH) => defaultGrid(farmW, farmH);

/** Keep an area inside the space, at least 0.2 m a side, to one decimal. */
export function clampGeom(g, farmW, farmH) {
  const wM = Math.max(0.2, Math.min(farmW, g.wM)), hM = Math.max(0.2, Math.min(farmH, g.hM));
  const xM = Math.max(0, Math.min(farmW - wM, g.xM)), yM = Math.max(0, Math.min(farmH - hM, g.yM));
  return { xM: r1(xM), yM: r1(yM), wM: r1(wM), hM: r1(hM) };
}

export function defaultSize(type, farmW, farmH) {
  const [w, h] = SIZE[type] || [3, 1.2];
  return { wM: r1(Math.max(0.2, Math.min(w, farmW * 0.5))), hM: r1(Math.max(0.2, Math.min(h, farmH * 0.5))) };
}

const dims = (data) => ({ farmW: Math.max(1, data.farmW || 100), farmH: Math.max(1, data.farmH || 60) });
const withPercent = (g, farmW, farmH) => ({ ...g, x: (g.xM / farmW) * 100, y: (g.yM / farmH) * 100, w: (g.wM / farmW) * 100, h: (g.hM / farmH) * 100 });
const overlap = (a, b) => a.xM < b.xM + b.wM - 0.01 && b.xM < a.xM + a.wM - 0.01 && a.yM < b.yM + b.hM - 0.01 && b.yM < a.yM + a.hM - 0.01;

/** Where a piece of this size lands when its centre is dropped at (cx, cz): snapped to the grid and its neighbours, kept inside. */
export function dropGeom(data, size, cx, cz, skipId = null) {
  const { farmW, farmH } = dims(data), grid = buildGrid(farmW, farmH);
  const others = (data.zones || []).filter((z) => z.id !== skipId && z.xM != null);
  const raw = { xM: cx - size.wM / 2, yM: cz - size.hM / 2, wM: size.wM, hM: size.hM };
  return clampGeom(snapZone(raw, others, grid, farmW, farmH), farmW, farmH);
}

/** The free spot nearest to (cx, cz) for a piece of this size; if the space is full, the spot asked for. */
export function freeSpot(data, size, cx, cz) {
  const { farmW, farmH } = dims(data), grid = buildGrid(farmW, farmH), zones = (data.zones || []).filter((z) => z.xM != null);
  const step = grid * Math.max(1, Math.round(Math.min(size.wM, size.hM) / 2 / grid)); // whole grid steps, so a tapped piece sits on the grid too
  let best = null, bestD = Infinity;
  for (let x = 0; x <= farmW - size.wM + 1e-6; x += step) {
    for (let y = 0; y <= farmH - size.hM + 1e-6; y += step) {
      const g = { xM: x, yM: y, wM: size.wM, hM: size.hM };
      if (zones.some((z) => overlap(g, z))) continue;
      const d = Math.hypot(x + size.wM / 2 - cx, y + size.hM / 2 - cz);
      if (d < bestD) { bestD = d; best = g; }
    }
  }
  return best ? clampGeom(best, farmW, farmH) : dropGeom(data, size, cx, cz);
}

/** Add a new area of `type` at `geom`. → { data, id } */
export function placeZone(data, type, geom, id) {
  const t = ZT_MAP.get(type); if (!t) return { data, id: null };
  const { farmW, farmH } = dims(data), g = clampGeom(geom, farmW, farmH);
  const same = (data.zones || []).filter((z) => z.type === type).length;
  const zone = { id, name: same > 0 ? `${t.label} ${same + 1}` : t.label, type, ...withPercent(g, farmW, farmH) };
  return { data: { ...data, zones: [...(data.zones || []), zone] }, id };
}

/** Change an area's position and/or size. */
export function setZoneGeom(data, id, geom) {
  const { farmW, farmH } = dims(data);
  return { ...data, zones: (data.zones || []).map((z) => (z.id === id ? { ...z, ...withPercent(clampGeom({ xM: z.xM, yM: z.yM, wM: z.wM, hM: z.hM, ...geom }, farmW, farmH), farmW, farmH) } : z)) };
}

/** Grow or shrink by grid steps (dw, dh = −1 | 0 | 1), keeping the top-left corner where it is. */
export function resizeZone(data, id, dw, dh) {
  const z = (data.zones || []).find((q) => q.id === id); if (!z) return data;
  const { farmW, farmH } = dims(data), grid = buildGrid(farmW, farmH);
  return setZoneGeom(data, id, { wM: Math.max(grid, z.wM + dw * grid), hM: Math.max(grid, z.hM + dh * grid) });
}

/** Quarter turn: width and depth swap, and a bed's rows turn with it. */
export function turnZone(data, id) {
  const z = (data.zones || []).find((q) => q.id === id); if (!z) return data;
  const next = setZoneGeom(data, id, { wM: z.hM, hM: z.wM });
  return { ...next, zones: next.zones.map((q) => (q.id === id ? { ...q, rowAxis: z.rowAxis === "vertical" ? "horizontal" : "vertical" } : q)) };
}

/** What lives in an area: asked before it is removed. */
export function zoneUse(data, id) {
  return {
    crops: (data.garden?.plots || []).filter((p) => p.zone === id && p.status !== "harvested").length,
    animals: (data.livestock?.animals || []).filter((a) => a.zone === id).length,
  };
}

/** Remove an area. Its crops and animals stay on the farm, without a place (same as the designer). */
export function removeZone(data, id) {
  return {
    ...data,
    zones: (data.zones || []).filter((z) => z.id !== id),
    garden: { ...data.garden, plots: (data.garden?.plots || []).map((p) => (p.zone === id ? { ...p, zone: "" } : p)) },
    livestock: { ...data.livestock, animals: (data.livestock?.animals || []).map((a) => (a.zone === id ? { ...a, zone: "" } : a)) },
  };
}
