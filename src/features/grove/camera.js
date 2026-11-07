/* ═══════════════════════════════════════════
   GROVE CAMERA — isometric "3D" view of the farm map.
   The metric ground plane is rotated by `az` and foreshortened by K
   (an orthographic camera at `elev` degrees above the ground); anything
   standing up rises h·S straight up the screen. Everything stays in
   metres on the same editable plane: the world group carries the
   transform, so hit-testing, drag and resize keep working unchanged.
   mapStyle.camera: "3d" (default) | "flat".
   MARKER: GROVE_CAMERA_ISO_V1
   ═══════════════════════════════════════════ */
import { createContext } from "react";

export const ISO_AZ = -24; // degrees; negative shows the south and west faces (as the portraits do)
export const ISO_ELEV = 40; // degrees above the ground

const FLAT = {
  mode: "flat", on: false, az: 0, K: 1, S: 0, c: 1, s: 0,
  W: "", B: "", up: [0, 0],
  project: (x, y) => [x, y],
  depth: (x, y) => y,
};

export function cameraOf(mapStyle) {
  const mode = (mapStyle && mapStyle.camera) || "3d";
  if (mode === "flat") return FLAT;
  const az = (ISO_AZ * Math.PI) / 180,
    elev = (ISO_ELEV * Math.PI) / 180;
  const K = Math.sin(elev),
    S = Math.cos(elev),
    c = Math.cos(az),
    s = Math.sin(az);
  const f = (n) => +n.toFixed(5);
  return {
    mode: "3d", on: true, az, K, S, c, s,
    // world group: rotate the ground, then squash it vertically
    W: `matrix(${f(c)} ${f(K * s)} ${f(-s)} ${f(K * c)} 0 0)`,
    // billboard: cancels the world transform so artwork draws screen-aligned
    B: `matrix(${f(c)} ${f(-s)} ${f(s / K)} ${f(c / K)} 0 0)`,
    // local (ground) vector that moves a point up the screen by one metre of height
    up: [(-S * s) / K, (-S * c) / K],
    project: (x, y, h = 0) => [x * c - y * s, (x * s + y * c) * K - h * S],
    depth: (x, y) => x * s + y * c,
  };
}

export const CamCtx = createContext(FLAT);

/* Screen-space bounding box of a ground rectangle plus what stands on it */
export function projectBox(cam, x0, y0, x1, y1, hMax = 0) {
  const pts = [];
  [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach(([x, y]) => {
    pts.push(cam.project(x, y, 0));
    if (hMax) pts.push(cam.project(x, y, hMax));
  });
  const xs = pts.map((p) => p[0]),
    ys = pts.map((p) => p[1]);
  const bx = Math.min(...xs),
    by = Math.min(...ys);
  return { x: bx, y: by, w: Math.max(...xs) - bx, h: Math.max(...ys) - by };
}

/* Default frame for a farm: margin, viewBox and aspect (used by the designer's letterbox) */
export function sceneFrame(farmW, farmH, mapStyle) {
  const fW = Math.max(1, farmW || 100),
    fH = Math.max(1, farmH || 60);
  const margin = Math.max(0.4, Math.min(3, Math.min(fW, fH) * 0.065));
  const cam = cameraOf(mapStyle);
  const box = projectBox(cam, -margin, -margin, fW + margin, fH + margin, cam.on ? Math.max(4, margin * 1.4) : 0);
  return { margin, cam, box, vbW: box.w, vbH: box.h, ratio: box.w / box.h };
}

/* The Farm Designer always draws the farm flat from above (GroveScene: edit mode is never 3D),
   so its letterbox uses the flat frame whatever the map's View setting is. */
export function designerFrame(farmW, farmH) {
  return sceneFrame(farmW, farmH, { camera: "flat" });
}

/* Size the designer's scene box so the map (aspect `ratio`) plus the scene's own chrome
   (border, margins, bottom bar: chromeW x chromeH px) fits inside availW x availH. */
export function fitDesignerStage({ availW, availH, ratio, chromeW = 0, chromeH = 0 }) {
  let w = Math.max(0, availW - chromeW), h = w / ratio;
  const maxH = Math.max(0, availH - chromeH);
  if (h > maxH) { h = maxH; w = h * ratio; }
  return { w: Math.floor(w + chromeW), h: Math.floor(h + chromeH) };
}
