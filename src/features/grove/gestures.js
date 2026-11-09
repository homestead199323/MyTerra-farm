/* Two-finger gesture intent for the farm map.

   A pinch starts undecided; the first clear movement decides what it is and the
   controls lock that answer until the fingers lift. Zoom is always applied by
   the caller — only rotate and tilt wait for a verdict — so a map that is being
   zoomed never turns or tips by accident (the complaint this fixes), while a
   deliberate twist still turns it. Pure: no DOM, no three.js. */

export const PINCH = { rotDeg: 15, scale: .08, driftPx: 24, rotMaxDeg: 8, settleMs: 450 }; // settle is long: zoom already applies while undecided, so waiting only costs a late deliberate twist

const DEG = 180 / Math.PI;

/** s0/s1: { d: finger distance px, ang: finger angle rad, midY: midpoint y px } at pinch start and now.
    Returns 'zoom' | 'rotate' | 'tilt' | null (still undecided). */
export function pinchIntent(s0, s1, { dt = 0 } = {}) {
  const scale = Math.abs(s1.d - s0.d) / (s0.d || 1);
  let da = s1.ang - s0.ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  const rot = Math.abs(da) * DEG, drift = Math.abs(s1.midY - s0.midY);
  if (scale >= PINCH.scale) return "zoom";
  if (rot >= PINCH.rotDeg) return "rotate";
  if (drift >= PINCH.driftPx && rot < PINCH.rotMaxDeg) return "tilt";
  if (dt >= PINCH.settleMs) return "zoom";
  return null;
}

/* Phone tier: a coarse pointer (finger). On the home screen the map is then a tap-to-open tile.
   `window.__g3harness.coarse` forces it in the dev harnesses (stripped from production builds). */
export const isCoarse = () => (import.meta.env?.DEV && typeof window !== "undefined" && window.__g3harness?.coarse === true) || (typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches);
