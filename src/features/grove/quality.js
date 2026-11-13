/* How sharp the 3D map is drawn on this device (pure, unit tested; no three.js).
   The map draws at one pixel ratio. While the camera is being moved the real frame times are sampled;
   when a gesture ends and it ran slow, the ratio steps down one notch — once, and it is remembered for
   the next visit. It never switches during a gesture and never per gesture (that cost a buffer
   re-allocation at the start and end of every drag).
   MARKER: MAP_QUALITY_V1 */

const KEY = "mt_g3_ratio";
export const MIN_RATIO = 1, STEP = .25;
/** Slower than this while moving the map (median frame, ms ≈ under 40 fps) means the device is struggling. */
export const SLOW_MS = 25;
// enough to judge: a few frames covering half a second of movement (a very slow device makes few frames)
const MIN_SAMPLES = 8, MIN_SPAN_MS = 500, MAX_SAMPLES = 240, GAP_MS = 1000;

/** The ratio to start with: what this device was stepped down to before, never above what it can show. */
export function startRatio(max, stored) {
  const m = Math.max(MIN_RATIO, Number(max) || 1), s = Number(stored);
  return Number.isFinite(s) && s >= MIN_RATIO ? Math.min(s, m) : m;
}

/** The ratio after a gesture, given its frame times (ms). */
export function nextRatio(ratio, samples) {
  if (!Array.isArray(samples) || samples.length < MIN_SAMPLES || ratio <= MIN_RATIO) return ratio;
  if (samples.reduce((a, b) => a + b, 0) < MIN_SPAN_MS) return ratio;
  const sorted = samples.slice().sort((a, b) => a - b), median = sorted[sorted.length >> 1];
  return median > SLOW_MS ? Math.max(MIN_RATIO, Math.round((ratio - STEP) * 100) / 100) : ratio;
}

/** Collects frame times while the map is being moved; `settle` gives the ratio to use from now on. */
export function createPace() {
  let last = 0, samples = [];
  return {
    frame(now, moving) {
      if (moving && last && now - last < GAP_MS) { samples.push(now - last); if (samples.length > MAX_SAMPLES) samples.shift(); }
      last = moving ? now : 0;
    },
    settle(ratio) { const next = nextRatio(ratio, samples); samples = []; last = 0; return next; },
  };
}

/** A step-down is kept for a week, then the device gets another try at full sharpness (one bad day is not forever). */
export const KEEP_MS = 7 * 864e5;
export function storedRatio(raw, now) {
  try {
    const v = JSON.parse(raw || "null");
    return v && Number.isFinite(v.r) && Number.isFinite(v.t) && now - v.t < KEEP_MS ? v.r : null;
  } catch { return null; }
}
export function readRatio() {
  try { return storedRatio(localStorage.getItem(KEY), Date.now()); } catch { return null; }
}
export function saveRatio(ratio) {
  try { localStorage.setItem(KEY, JSON.stringify({ r: ratio, t: Date.now() })); } catch { /* private mode: lighter for this visit only */ }
}
